//! Regex.make 0.1.0 alpha; Steven Levithan; MIT License
// Context-aware regex template strings with batteries included

import { transformForFlagX } from './flag-x.js';
import { PartialPattern, partial } from './partial.js';
import { CharClassContext, RegexContext, containsCharClassUnion, escapeV, getBreakoutChar, getEndContextForIncompletePattern, patternModsOn, rakePattern, replaceUnescaped, sandboxLoneCharClassCaret, sandboxLoneDoublePunctuatorChar, sandboxUnsafeNulls } from './utils.js';

/**
Template tag for constructing a UnicodeSets-mode RegExp with advanced features and safe,
context-aware interpolation of regexes, escaped strings, and partial patterns.

Can be called in multiple ways:
1. `` Regex.make`…` `` - Regex pattern as a raw string.
2. `` Regex.make('gis')`…` `` - To specify flags.
3. `` Regex.make.bind(RegExpSubclass)`…` `` - With a `this` that specifies a different constructor.
@param {string | TemplateStringsArray} first Flags or a template.
@param {...any} [values] Values to fill the template holes.
@returns {RegExp | (TemplateStringsArray, ...any) => RegExp}
*/
function make(first, ...values) {
  // Allow binding to other constructors
  const constructor = this instanceof Function ? this : RegExp;
  // Given a template
  if (Array.isArray(first?.raw)) {
    return makeFromTemplate(constructor, {flags: ''}, first, ...values);
  // Given flags
  } else if ((typeof first === 'string' || first === undefined) && !values.length) {
    return makeFromTemplate.bind(null, constructor, {flags: first});
  // Given an options object (undocumented)
  } else if (Object.prototype.toString.call(first) === '[object Object]' && !values.length) {
    return makeFromTemplate.bind(null, constructor, first);
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
function makeFromTemplate(constructor, options, template, ...values) {
  const {
    flags = '',
    __flag_x = true,
  } = options;
  if (/[vu]/.test(flags)) {
    throw new Error('Flags v/u cannot be explicitly added since v is always enabled');
  }

  // Add implicit flag x; handled first because otherwise some regex syntax would have to be
  // escaped for the sake of tokenizing even though it's within a comment
  if (__flag_x) {
    ({template, values} = transformForFlagX(template, values));
  }

  let runningContext = {};
  let pattern = '';
  // Intersperse template raw strings and values
  template.raw.forEach((raw, i) => {
    const wrapEscapedStrs = template.raw[i] || template.raw[i + 1];
    // Sandbox `\0` in character classes. Not needed outside classes because in other cases a
    // following interpolated value would always be atomized
    pattern += sandboxUnsafeNulls(raw, RegexContext.CHAR_CLASS);
    runningContext = getEndContextForIncompletePattern(pattern, runningContext);
    const {regexContext, charClassContext} = runningContext;
    if (i < template.raw.length - 1) {
      let value = values[i];
      const transformedValue = interpolate(value, flags, regexContext, charClassContext, wrapEscapedStrs);
      pattern += transformedValue;
    }
  });
  return new constructor(rakePattern(pattern), `v${flags}`);
}

function interpolate(value, flags, regexContext, charClassContext, wrapEscapedStrs) {
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
    return isPartial ? value : escapedValue;
  } else if (regexContext === RegexContext.CHAR_CLASS) {
    if (isPartial) {
      const sandboxedValue = sandboxLoneCharClassCaret(sandboxLoneDoublePunctuatorChar(value));
      // Atomize via nested character class `[…]` if it contains implicit or explicit union (check
      // the unadjusted value)
      return containsCharClassUnion(value) ? `[${sandboxedValue}]` : sandboxUnsafeNulls(sandboxedValue);
    }
    // Atomize via nested character class `[…]` if more than one node
    return containsCharClassUnion(escapedValue) ? `[${escapedValue}]` : escapedValue;
  }
  // `RegexContext.DEFAULT`
  if (value instanceof RegExp) {
    const transformed = transformForFlags(value, flags);
    // Sandbox and atomize; if we used a pattern modifier it has the same effect
    return transformed.usedModifier ? transformed.value : `(?:${transformed.value})`;
  }
  if (isPartial) {
    // Sandbox and atomize
    return `(?:${value})`;
  }
  // Sandbox and atomize
  return wrapEscapedStrs ? `(?:${escapedValue})` : escapedValue;
}

function transformForFlags(regex, outerFlags) {
  const modFlagsObj = {
    i: null,
    m: null,
    s: null,
  };
  const newlines = '\\n\\r\\u2028\\u2029';
  let value = regex.source;

  if (regex.ignoreCase !== outerFlags.includes('i')) {
    if (patternModsOn) {
      modFlagsObj.i = regex.ignoreCase;
    } else {
      throw new Error('Pattern modifiers not supported, so the value of flag i on the interpolated RegExp must match the outer regex');
    }
  }
  if (regex.dotAll !== outerFlags.includes('s')) {
    if (patternModsOn) {
      modFlagsObj.s = regex.dotAll;
    } else {
      value = replaceUnescaped(value, '\\.', (regex.dotAll ? '[^]' : `[^${newlines}]`), RegexContext.DEFAULT);
    }
  }
  if (regex.multiline !== outerFlags.includes('m')) {
    if (patternModsOn) {
      modFlagsObj.m = regex.multiline;
    } else {
      value = replaceUnescaped(value, '\\^', (regex.multiline ? `(?<=^|[${newlines}])` : '(?<![^])'), RegexContext.DEFAULT);
      value = replaceUnescaped(value, '\\$', (regex.multiline ? `(?=$|[${newlines}])` : '(?![^])'), RegexContext.DEFAULT);
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

const Regex = {
  make,
  partial,
};

export { make, partial };
export default Regex;
