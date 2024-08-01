import {Context, hasUnescaped, replaceUnescaped} from 'regex-utilities';
import {CharClassContext, RegexContext, adjustNumberedBackrefs, containsCharClassUnion, countCaptures, escapeV, flagVSupported, getBreakoutChar, getEndContextForIncompleteExpression, patternModsSupported, preprocess, sandboxLoneCharClassCaret, sandboxLoneDoublePunctuatorChar, sandboxUnsafeNulls} from './utils.js';
import {flagNPreprocessor} from './flag-n.js';
import {flagXPreprocessor, cleanPlugin} from './flag-x.js';
import {Pattern, pattern} from './pattern.js';
import {atomicPlugin} from './atomic-groups.js';
import {subroutinesPlugin} from './subroutines.js';
import {backcompatPlugin} from './backcompat.js';

/**
@typedef {object} RegexTagOptions
@prop {string} [flags]
@prop {Array<(expression: string, flags: string) => string>} [plugins]
@prop {(expression: string, flags: string) => string} [unicodeSetsPlugin]
@prop {{
  x?: boolean;
  n?: boolean;
  v?: boolean;
  atomic?: boolean;
  subroutines?: boolean;
  clean?: boolean;
}} [disable]
@prop {{
  v?: boolean;
}} [force]
*/

/**
@template T
@typedef RegexTag
@type {{
  ( template: TemplateStringsArray,
    ...substitutions: ReadonlyArray<string | RegExp | Pattern>
  ): T;

  (flags?: string): RegexTag<T>;

  (options: RegexTagOptions): RegexTag<T>;

  // The easiest way to ensure that only valid constructors can be bound is to explicitly declare
  // `.bind(…)` with more restrictive types
  bind<U>(this: any, thisArg: new (expression: string, flags: string) => U): RegexTag<U>;
}}
*/

/**
Template tag for constructing a regex with advanced features and context-aware interpolation of
regexes, strings, and patterns.

Can be called in multiple ways:
1. `` regex`…` `` - Regex pattern as a raw string.
2. `` regex('gi')`…` `` - To specify flags.
3. `` regex({flags: 'gi'})`…` `` - With options.
4. `` regex.bind(RegExpSubclass)`…` `` - With a `this` that specifies a different constructor.

@type {RegexTag<RegExp>}
*/
const regex = function(first, ...substitutions) {
  // Allow binding to other constructors
  const constructor = this instanceof Function ? this : RegExp;
  // Given a template
  if (Array.isArray(first?.raw)) {
    return fromTemplate(constructor, {flags: ''}, first, ...substitutions);
  // Given flags
  } else if ((typeof first === 'string' || first === undefined) && !substitutions.length) {
    return fromTemplate.bind(null, constructor, {flags: first});
  // Given an options object
  } else if ({}.toString.call(first) === '[object Object]' && !substitutions.length) {
    return fromTemplate.bind(null, constructor, first);
  }
  throw new Error(`Unexpected arguments: ${JSON.stringify([first, ...substitutions])}`);
}

/**
Returns a UnicodeSets-mode RegExp from a template and substitutions to fill the template holes.
@param {new (expression: string, flags: string) => RegExp} constructor
@param {RegexTagOptions} options
@param {TemplateStringsArray} template
@param {...(string | RegExp | Pattern)} substitutions
@returns {RegExp}
*/
function fromTemplate(constructor, options, template, ...substitutions) {
  const {
    flags = '',
    plugins = [],
    unicodeSetsPlugin = backcompatPlugin,
    disable = {},
    force = {},
  } = options;
  if (/[vu]/.test(flags)) {
    throw new Error('Flags v/u cannot be explicitly added');
  }

  // Implicit flag x is handled first because otherwise some regex syntax (if unescaped) within
  // comments could cause problems when parsing
  if (!disable.x) {
    ({template, substitutions} = preprocess(template, substitutions, flagXPreprocessor));
  }
  // Implicit flag n is a preprocessor because capturing groups affect backreference rewriting in
  // both interpolation and plugins
  if (!disable.n) {
    ({template, substitutions} = preprocess(template, substitutions, flagNPreprocessor));
  }

  let precedingCaptures = 0;
  let expression = '';
  let runningContext = {};
  // Intersperse raw template strings and substitutions
  template.raw.forEach((raw, i) => {
    const wrapEscapedStr = !!(template.raw[i] || template.raw[i + 1]);
    // Even with flag n enabled, we might have named captures
    precedingCaptures += countCaptures(raw);
    // Sandbox `\0` in character classes. Not needed outside character classes because in other
    // cases a following interpolated value would always be atomized
    expression += sandboxUnsafeNulls(raw, Context.CHAR_CLASS);
    runningContext = getEndContextForIncompleteExpression(expression, runningContext);
    const {regexContext, charClassContext} = runningContext;
    if (i < template.raw.length - 1) {
      const substitution = substitutions[i];
      expression += interpolate(substitution, flags, regexContext, charClassContext, wrapEscapedStr, precedingCaptures);
      if (substitution instanceof RegExp) {
        precedingCaptures += countCaptures(substitution.source);
      } else if (substitution instanceof Pattern) {
        precedingCaptures += countCaptures(String(substitution));
      }
    }
  });

  const useFlagV = force.v || (disable.v ? false : flagVSupported);
  const allPlugins = [
    // Run first, so provided plugins can output extended syntax
    ...plugins,
    ...(disable.atomic ? [] : [atomicPlugin]),
    ...(disable.subroutines ? [] : [subroutinesPlugin]),
    ...(disable.clean ? [] : [cleanPlugin]),
    // Run last, so it doesn't have to worry about parsing extended syntax
    ...(useFlagV ? [] : [unicodeSetsPlugin]),
  ];
  allPlugins.forEach(p => expression = p(expression, flags));
  return new constructor(expression, (useFlagV ? 'v' : 'u') + flags);
}

/**
@param {string | RegExp | Pattern} value
@param {string} flags
@param {string} regexContext
@param {string} charClassContext
@param {boolean} wrapEscapedStr
@param {number} precedingCaptures
@returns {string}
*/
function interpolate(value, flags, regexContext, charClassContext, wrapEscapedStr, precedingCaptures) {
  if (value instanceof RegExp && regexContext !== RegexContext.DEFAULT) {
    throw new Error('Cannot interpolate a RegExp at this position because the syntax context does not match');
  }
  if (regexContext === RegexContext.INVALID_INCOMPLETE_TOKEN || charClassContext === CharClassContext.INVALID_INCOMPLETE_TOKEN) {
    // Throw in all cases, but only *need* to handle a preceding unescaped backslash (which would
    // break sandboxing) since other errors would be handled by the invalid generated regex syntax
    throw new Error('Interpolation preceded by invalid incomplete token');
  }
  const isPattern = value instanceof Pattern;
  let escapedValue;
  if (!(value instanceof RegExp)) {
    value = String(value);
    if (!isPattern) {
      escapedValue = escapeV(
        value,
        regexContext === RegexContext.CHAR_CLASS ? Context.CHAR_CLASS : Context.DEFAULT
      );
    }
    // Check `escapedValue` (not just patterns) since possible breakout char `>` isn't escaped
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
    return isPattern ? value : escapedValue;
  } else if (regexContext === RegexContext.CHAR_CLASS) {
    if (isPattern) {
      if (hasUnescaped(value, '^-|^&&|-$|&&$')) {
        // Sandboxing so we don't change the chars outside the pattern into being part of an
        // operation they didn't initiate. Same problem as starting a pattern with a quantifier
        throw new Error('Cannot use range or set operator at boundary of interpolated pattern; move the operation into the pattern or the operator outside of it');
      }
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
    const transformed = transformForLocalFlags(value, flags);
    const backrefsAdjusted = adjustNumberedBackrefs(transformed.value, precedingCaptures);
    // Sandbox and atomize; if we used a pattern modifier it has the same effect
    return transformed.usedModifier ? backrefsAdjusted : `(?:${backrefsAdjusted})`;
  }
  if (isPattern) {
    // Sandbox and atomize
    return `(?:${value})`;
  }
  // Sandbox and atomize
  return wrapEscapedStr ? `(?:${escapedValue})` : escapedValue;
}

/**
@param {RegExp} re
@param {string} outerFlags
@returns {{value: string; usedModifier?: boolean}}
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
    if (patternModsSupported) {
      modFlagsObj.i = re.ignoreCase;
    } else {
      throw new Error('Pattern modifiers not supported, so the value of flag i on the interpolated RegExp must match the outer regex');
    }
  }
  if (re.dotAll !== outerFlags.includes('s')) {
    if (patternModsSupported) {
      modFlagsObj.s = re.dotAll;
    } else {
      value = replaceUnescaped(value, '\\.', (re.dotAll ? '[^]' : `[^${newlines}]`), Context.DEFAULT);
    }
  }
  if (re.multiline !== outerFlags.includes('m')) {
    if (patternModsSupported) {
      modFlagsObj.m = re.multiline;
    } else {
      value = replaceUnescaped(value, '\\^', (re.multiline ? `(?<=^|[${newlines}])` : '(?<![^])'), Context.DEFAULT);
      value = replaceUnescaped(value, '\\$', (re.multiline ? `(?=$|[${newlines}])` : '(?![^])'), Context.DEFAULT);
    }
  }

  if (patternModsSupported) {
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

export {regex, pattern};
