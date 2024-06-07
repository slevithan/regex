//! regex 1.1.0; Steven Levithan; MIT License

import {transformAtomicGroups} from './atomic-groups.js';
import {flagNProcessor} from './flag-n.js';
import {flagXProcessor, rakeSeparators} from './flag-x.js';
import {PartialPattern, partial} from './partial.js';
import {CharClassContext, RegexContext, adjustNumberedBackrefs, containsCharClassUnion, countCaptures, escapeV, getBreakoutChar, getEndContextForIncompletePattern, patternModsOn, replaceUnescaped, sandboxLoneCharClassCaret, sandboxLoneDoublePunctuatorChar, sandboxUnsafeNulls, transformTemplateAndValues} from './utils.js';

/**
Template tag for constructing a UnicodeSets-mode RegExp with advanced features and context-aware
interpolation of regexes, escaped strings, and partial patterns.

Can be called in multiple ways:
1. `` regex`…` `` - Regex pattern as a raw string.
2. `` regex('gis')`…` `` - To specify flags.
3. `` regex({flags: 'gis'})`…` `` - With options.
4. `` regex.bind(RegExpSubclass)`…` `` - With a `this` that specifies a different constructor.
@param {string | TemplateStringsArray} first Flags or a template.
@param {...any} [values] Values to fill the template holes.
@returns {RegExp | (TemplateStringsArray, ...any) => RegExp}
*/
function regex(first, ...values) {
  // Allow binding to other constructors
  const constructor = this instanceof Function ? this : RegExp;
  // Given a template
  if (Array.isArray(first?.raw)) {
    return fromTemplate(constructor, {flags: ''}, first, ...values);
  // Given flags
  } else if ((typeof first === 'string' || first === undefined) && !values.length) {
    return fromTemplate.bind(null, constructor, {flags: first});
  // Given an options object
  } else if ({}.toString.call(first) === '[object Object]' && !values.length) {
    return fromTemplate.bind(null, constructor, first);
  }
  throw new Error(`Unexpected arguments: ${JSON.stringify([first, ...values])}`);
}

/**
Makes a UnicodeSets-mode RegExp from a template and values to fill the template holes.
@param {RegExpConstructor} constructor
@param {Object} options
@param {TemplateStringsArray} template
@param {...any} values
@returns {RegExp}
*/
function fromTemplate(constructor, options, template, ...values) {
  const {
    flags = '',
    __flagN = true,
    __flagX = true,
    __rake = options.__flagX ?? true,
  } = options;
  if (/[vu]/.test(flags)) {
    throw new Error('Flags v/u cannot be explicitly added since v is always enabled');
  }

  // Implicit flag x is handled first because otherwise some regex syntax (if unescaped) within
  // comments could cause problems when parsing
  if (__flagX) {
    ({template, values} = transformTemplateAndValues(template, values, flagXProcessor));
  }
  if (__flagN) {
    ({template, values} = transformTemplateAndValues(template, values, flagNProcessor));
  }

  let precedingCaptures = 0;
  let pattern = '';
  let runningContext = {};
  // Intersperse template raw strings and values
  template.raw.forEach((raw, i) => {
    const wrapEscapedStr = template.raw[i] || template.raw[i + 1];
    // Even with flag n enabled, we might have named captures
    precedingCaptures += countCaptures(raw);
    // Sandbox `\0` in character classes. Not needed outside character classes because in other
    // cases a following interpolated value would always be atomized
    pattern += sandboxUnsafeNulls(raw, RegexContext.CHAR_CLASS);
    runningContext = getEndContextForIncompletePattern(pattern, runningContext);
    const {regexContext, charClassContext} = runningContext;
    if (i < template.raw.length - 1) {
      const interpolated = interpolate(values[i], flags, regexContext, charClassContext, wrapEscapedStr, precedingCaptures);
      precedingCaptures += interpolated.capturesAdded || 0;
      pattern += interpolated.value;
    }
  });

  pattern = transformAtomicGroups(pattern);
  return new constructor(__rake ? rakeSeparators(pattern) : pattern, `v${flags}`);
}

function interpolate(value, flags, regexContext, charClassContext, wrapEscapedStr, precedingCaptures) {
  if (value instanceof RegExp && regexContext !== RegexContext.DEFAULT) {
    throw new Error('Cannot interpolate a RegExp at this position because the syntax context does not match');
  }
  if (regexContext === RegexContext.INVALID_INCOMPLETE_TOKEN || charClassContext === CharClassContext.INVALID_INCOMPLETE_TOKEN) {
    // Throw in all cases, but only *need* to handle a preceding unescaped backslash (which would
    // break sandboxing) since other errors would be handled by the invalid generated regex syntax
    throw new Error('Interpolation preceded by invalid incomplete token');
  }
  const isPartial = value instanceof PartialPattern;
  let escapedValue;
  if (!(value instanceof RegExp)) {
    value = String(value);
    if (!isPartial) {
      escapedValue = escapeV(value, regexContext);
    }
    // Check within escaped values (not just partials) since possible breakout char > isn't escaped
    const breakoutChar = getBreakoutChar(escapedValue || value, regexContext, charClassContext);
    if (breakoutChar) {
      throw new Error(`Unescaped stray "${breakoutChar}" in the interpolated value would have side effects outside it`);
    }
  }

  if (
    regexContext === RegexContext.ENCLOSED_TOKEN ||
    regexContext === RegexContext.INTERVAL_QUANTIFIER ||
    regexContext === RegexContext.GROUP_NAME ||
    charClassContext === CharClassContext.ENCLOSED_TOKEN ||
    charClassContext === CharClassContext.Q_TOKEN
  ) {
    return {value: isPartial ? value : escapedValue};
  } else if (regexContext === RegexContext.CHAR_CLASS) {
    if (isPartial) {
      const boundaryOperatorsRemoved = replaceUnescaped(value, '^-|^&&|-$|&&$', '');
      if (boundaryOperatorsRemoved !== value) {
        // Sandboxing so we don't change the chars outside the partial into being part of an
        // operation they didn't initiate. Same as starting a partial with a quantifier
        throw new Error('In character classes, a partial cannot use a range/set operator at its boundary; move the operation into the partial or the operator outside of it');
      }
      const sandboxedValue = sandboxLoneCharClassCaret(sandboxLoneDoublePunctuatorChar(value));
      // Atomize via nested character class `[…]` if it contains implicit or explicit union (check
      // the unadjusted value)
      return {value: containsCharClassUnion(value) ? `[${sandboxedValue}]` : sandboxUnsafeNulls(sandboxedValue)};
    }
    // Atomize via nested character class `[…]` if more than one node
    return {value: containsCharClassUnion(escapedValue) ? `[${escapedValue}]` : escapedValue};
  }
  // `RegexContext.DEFAULT`
  if (value instanceof RegExp) {
    const transformed = transformForLocalFlags(value, flags);
    const backrefsAdjusted = adjustNumberedBackrefs(transformed.value, precedingCaptures);
    // Sandbox and atomize; if we used a pattern modifier it has the same effect
    return {
      value: transformed.usedModifier ? backrefsAdjusted : `(?:${backrefsAdjusted})`,
      capturesAdded: countCaptures(value.source),
    };
  }
  if (isPartial) {
    // Sandbox and atomize
    return {value: `(?:${value})`};
  }
  // Sandbox and atomize
  return {value: wrapEscapedStr ? `(?:${escapedValue})` : escapedValue};
}

/**
@param {RegExp} re
@param {string} outerFlags
@returns {Object}
*/
function transformForLocalFlags(re, outerFlags) {
  const modFlagsObj = {
    i: null,
    m: null,
    s: null,
  };
  const newlines = '\\n\\r\\u2028\\u2029';
  let value = re.source;

  if (re.ignoreCase !== outerFlags.includes('i')) {
    if (patternModsOn) {
      modFlagsObj.i = re.ignoreCase;
    } else {
      throw new Error('Pattern modifiers not supported, so the value of flag i on the interpolated RegExp must match the outer regex');
    }
  }
  if (re.dotAll !== outerFlags.includes('s')) {
    if (patternModsOn) {
      modFlagsObj.s = re.dotAll;
    } else {
      value = replaceUnescaped(value, '\\.', (re.dotAll ? '[^]' : `[^${newlines}]`), RegexContext.DEFAULT);
    }
  }
  if (re.multiline !== outerFlags.includes('m')) {
    if (patternModsOn) {
      modFlagsObj.m = re.multiline;
    } else {
      value = replaceUnescaped(value, '\\^', (re.multiline ? `(?<=^|[${newlines}])` : '(?<![^])'), RegexContext.DEFAULT);
      value = replaceUnescaped(value, '\\$', (re.multiline ? `(?=$|[${newlines}])` : '(?![^])'), RegexContext.DEFAULT);
    }
  }

  if (patternModsOn) {
    const keys = Object.keys(modFlagsObj);
    let modifier = keys.filter(k => modFlagsObj[k] === true).join('');
    const modOff = keys.filter(k => modFlagsObj[k] === false).join('');
    if (modOff) {
      modifier += `-${modOff}`;
    }
    if (modifier) {
      return {
        value: `(?${modifier}:${value})`,
        usedModifier: true,
      };
    }
  }
  return {value};
}

// Alias for backcompat with v1.0.0; might be removed in v2
const make = regex;

export {make, partial, regex};

// The default export is deprecated and might be removed in v2
export default {make, partial, regex};
