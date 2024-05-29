//! Regex.make 0-alpha; Steven Levithan; MIT License

import { CharClassContext, containsCharClassUnion, escapeV, getBreakoutChar, getEndContextForIncompletePattern, patternModsOn, RegexContext, replaceUnescaped, sandboxLoneDoublePunctuatorChar, sandboxUnsafeNulls } from './utils.js';

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
    return makeFromTemplate(constructor, '', first, ...values);
  // Given flags
  } else if ((typeof first === 'string' || first === undefined) && !values.length) {
    return makeFromTemplate.bind(null, constructor, first ?? '');
  }
  throw new Error(`Unexpected arguments: ${JSON.stringify([first, ...values])}`);
}

/**
Makes a UnicodeSets-mode RegExp from a template and values to fill the template holes.
@param {RegExpConstructor} constructor
@param {string} flags
@param {TemplateStringsArray} template
@param {...any} values
@returns {RegExp}
*/
function makeFromTemplate(constructor, flags, template, ...values) {
  if (/[vu]/.test(flags)) {
    throw new Error('Flags v/u cannot be explicitly added since v is always enabled');
  }

  // To keep output cleaner for simple string escaping, don't start wrapping/sandboxing
  // interpolated values until something triggers the need for it
  let wrap = false;
  let runningContext = {};
  let pattern = '';
  // Intersperse template raw strings and values
  template.raw.forEach((raw, i) => {
    if (raw !== '') {
      wrap = true;
    }
    pattern += sandboxUnsafeNulls(raw, RegexContext.CHAR_CLASS);
    runningContext = getEndContextForIncompletePattern(pattern, runningContext);
    const {regexContext, charClassContext} = runningContext;
    if (i < template.raw.length - 1) {
      let value = values[i];
      if (value instanceof RegExp || value instanceof PartialPattern) {
        wrap = true;
      }
      const transformedValue = interpolate(value, flags, regexContext, charClassContext, wrap);
      pattern += transformedValue;
    }
  });
  return new constructor(pattern, `v${flags}`);
}

function interpolate(value, flags, regexContext, charClassContext, wrap) {
  if (value instanceof RegExp && regexContext !== RegexContext.DEFAULT) {
    throw new Error('Cannot interpolate a RegExp at this position because the syntax context does not match');
  }
  if (regexContext === RegexContext.OPEN_ESCAPE || charClassContext === CharClassContext.OPEN_ESCAPE) {
    throw new Error('Unescaped "\\" precedes interpolation and would have side effects inside it');
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
    regexContext === RegexContext.GROUP_NAME ||
    regexContext === RegexContext.INTERVAL_QUANTIFIER ||
    regexContext === RegexContext.ENCLOSED_TOKEN ||
    (regexContext === RegexContext.CHAR_CLASS &&
      charClassContext === CharClassContext.ENCLOSED_TOKEN)
  ) {
    return isPartial ? value : escapedValue;
  } else if (regexContext === RegexContext.CHAR_CLASS) {
    // `CharClassContext.DEFAULT`
    if (isPartial) {
      const sandboxedValue = sandboxLoneDoublePunctuatorChar(value);
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
  // Sandbox and atomize; this is the only place checking `wrap` since it's true in all other cases
  return wrap ? `(?:${escapedValue})` : escapedValue;
}

function transformForFlags(innerRegex, outerFlags) {
  const modFlagsObj = {
    i: null,
    m: null,
    s: null,
  };
  const newlines = '\\n\\r\\u2028\\u2029';
  let result = innerRegex.source;

  if (innerRegex.ignoreCase !== outerFlags.includes('i')) {
    if (patternModsOn) {
      modFlagsObj.i = innerRegex.ignoreCase;
    } else {
      throw new Error('Pattern modifiers not supported, so the value of flag i on the interpolated RegExp must match the outer regex');
    }
  }
  if (innerRegex.dotAll !== outerFlags.includes('s')) {
    if (patternModsOn) {
      modFlagsObj.s = innerRegex.dotAll;
    } else {
      result = replaceUnescaped(result, '\\.', (innerRegex.dotAll ? '[^]' : `[[^]--[${newlines}]]`), RegexContext.DEFAULT);
    }
  }
  if (innerRegex.multiline !== outerFlags.includes('m')) {
    if (patternModsOn) {
      modFlagsObj.m = innerRegex.multiline;
    } else {
      result = replaceUnescaped(result, '\\^', (innerRegex.multiline ? `(?<=^|[${newlines}])` : '(?<![^])'), RegexContext.DEFAULT);
      result = replaceUnescaped(result, '\\$', (innerRegex.multiline ? `(?=$|[${newlines}])` : '(?![^])'), RegexContext.DEFAULT);
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
        value: `(?${modifier}:${result})`,
        usedModifier: true,
      };
    }
  }
  return {value: result};
}

class PartialPattern {
  #value;
  constructor(pattern) {
    this.#value = pattern;
  }
  toString() {
    return String(this.#value);
  }
}

/**
Can be called in two ways:
1. `Regex.partial(value)` - For strings or values coerced to strings
2. `` Regex.partial`…` `` - Shorthand for ``Regex.partial(String.raw`…`)``
@param {any} first
@param {...any} [values] Values to fill the template holes.
@returns {PartialPattern}
*/
function partial(first, ...values) {
  if (Array.isArray(first?.raw)) {
    return new PartialPattern(
      // Intersperse template raw strings and values
      first.raw.flatMap((raw, i) => i < first.raw.length - 1 ? [raw, values[i]] : raw).join('')
    );
  } else if (!values.length) {
    return new PartialPattern(first ?? '');
  }
  throw new Error(`Unexpected arguments: ${JSON.stringify([first, ...values])}`);
}

const Regex = {
  make,
  partial,
};

export { make, partial };
export default Regex;
