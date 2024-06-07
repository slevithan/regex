import {PartialPattern, partial} from './partial.js';

export const RegexContext = {
  DEFAULT: 'DEFAULT',
  CHAR_CLASS: 'CHAR_CLASS',
  GROUP_NAME: 'GROUP_NAME',
  ENCLOSED_TOKEN: 'ENCLOSED_TOKEN',
  INTERVAL_QUANTIFIER: 'INTERVAL_QUANTIFIER',
  INVALID_INCOMPLETE_TOKEN: 'INVALID_INCOMPLETE_TOKEN',
};

export const CharClassContext = {
  DEFAULT: 'CC_DEFAULT',
  RANGE: 'CC_RANGE',
  ENCLOSED_TOKEN: 'CC_ENCLOSED_TOKEN',
  Q_TOKEN: 'CC_Q_TOKEN',
  INVALID_INCOMPLETE_TOKEN: 'CC_INVALID_INCOMPLETE_TOKEN',
};

export const patternModsOn = (() => {
  let supported = true;
  try {
    new RegExp('(?i-ms:)');
  } catch (e) {
    supported = false;
  }
  return supported;
})();

const doublePunctuatorChars = '&!#$%*+,.:;<=>?@^`~';

/**
@param {string} str
@param {'DEFAULT' | 'CHAR_CLASS'} regexContext
@returns {string}
*/
export function escapeV(str, regexContext) {
  if (regexContext === RegexContext.CHAR_CLASS) {
    // Escape all double punctuators (including ^, which is special on its own in the first
    // position) in case they're bordered by the same character in or outside of the escaped string
    return str.replace(new RegExp(String.raw`[()\[\]{}|\\/\-${doublePunctuatorChars}]`, 'g'), '\\$&');
  }
  return str.replace(/[()\[\]{}|\\^$*+?.]/g, '\\$&');
}

// Sandbox without escaping by repeating the character and escaping only the first one. The second
// one is so that, if followed by the same symbol, the resulting double punctuator will still throw
// as expected. Details:
// - Only need to check the first position because, if it's part of an implicit union,
//   interpolation handling will wrap it in nested `[…]`.
// - Can't just wrap in nested `[…]` here, since the value might be used in a range.
// - Can't add a second unescaped symbol if a lone symbol is the entire string because it might be
//   followed by the same unescaped symbol outside an interpolation, and since it won't be wrapped,
//   the second symbol wouldn't be sandboxed from the one following it.
export function sandboxLoneDoublePunctuatorChar(str) {
  return str.replace(new RegExp(String.raw`^([${doublePunctuatorChars}])(?!\1)`), (m, _, pos) => {
    return `\\${m}${pos + 1 === str.length ? '' : m}`;
  });
}

// Sandbox `^` if relevant, done so it can't change the meaning of the surrounding character class
// if we happen to be at the first position. See `sandboxLoneDoublePunctuatorChar` for more details
export function sandboxLoneCharClassCaret(str) {
  return str.replace(/^\^/, '\\^^');
}

// regex`[\0${0}]` and regex`[${partial`\0`}0]` can't be guarded against via nested `[…]`
// sandboxing in character classes if the interpolated value doesn't contain union (since it might
// be placed on a range boundary). So escape \0 in character classes as \u{0}
export function sandboxUnsafeNulls(str, inRegexContext) {
  return replaceUnescaped(str, String.raw`\\0(?!\d)`, '\\u{0}', inRegexContext);
}

// No special handling for escaped versions of the characters
function getUnbalancedChar(pattern, leftChar, rightChar) {
  let numOpen = 0;
  for (const [m] of pattern.matchAll(new RegExp(`[${escapeV(leftChar + rightChar)}]`, 'g'))) {
    numOpen += m === leftChar ? 1 : -1;
    if (numOpen < 0) {
      return rightChar;
    }
  }
  if (numOpen > 0) {
    return leftChar;
  }
  return '';
}

// Look for characters that would change the meaning of subsequent tokens outside an interpolated value
export function getBreakoutChar(pattern, regexContext, charClassContext) {
  const escapesRemoved = pattern.replace(/\\./gsu, '');
  // Trailing unescaped `\`. Checking `escapesRemoved.includes('\\')` would also work
  if (escapesRemoved.at(-1) === '\\') {
    return '\\';
  }
  if (regexContext === RegexContext.DEFAULT) {
    // Unbalanced `[` or `]` are also errors but don't breakout; they're caught by the wrapper
    return getUnbalancedChar(escapesRemoved, '(', ')');
  } else if (
    regexContext === RegexContext.CHAR_CLASS &&
    !(charClassContext === CharClassContext.ENCLOSED_TOKEN || charClassContext === CharClassContext.Q_TOKEN)
  ) {
    return getUnbalancedChar(escapesRemoved, '[', ']');
  } else if (
    regexContext === RegexContext.ENCLOSED_TOKEN ||
    regexContext === RegexContext.INTERVAL_QUANTIFIER ||
    charClassContext === CharClassContext.ENCLOSED_TOKEN ||
    charClassContext === CharClassContext.Q_TOKEN
  ) {
    if (escapesRemoved.includes('}')) {
      return '}';
    }
  } else if (regexContext === RegexContext.GROUP_NAME) {
    if (escapesRemoved.includes('>')) {
      return '>';
    }
  }
  return '';
}

// To support flag x handling (where this regex is reused as a tokenizer, which isn't really its
// purpose in `getEndContextForIncompletePattern`), the following tokens are added which would
// otherwise not need special handling here:
// - Partial token versions of `\\[cux]`. Without serving dual purpose for flag x, `incompleteT`
//   would only *need* to know about trailing unescaped `\\`.
// - Complete token versions of `\\[cux0]`.
// - Negated character class opener `[^`.
// - Group openings, so they can be stepped past (also relied on by flag n).
// - Double-punctuators.
// To support flag n, complete backreference numbers were also added so they can be shown in error
// messages. To support atomic groups, `(?>` was added
export const contextToken = new RegExp(String.raw`
  (?<groupN> \(\?< (?! [=!] ) | \\k< )
| (?<enclosedT> \\[pPu]\{ )
| (?<qT> \\q\{ )
| (?<intervalQ> \{ )
| (?<incompleteT> \\ (?:
    $
  | c (?! [A-Za-z] )
  | u (?! [A-Fa-f\d]{4} ) [A-Fa-f\d]{0,3}
  | x (?! [A-Fa-f\d]{2} ) [A-Fa-f\d]?
  )
)
| \\ (?:
    c [A-Za-z]
  | u [A-Fa-f\d]{4}
  | x [A-Fa-f\d]{2}
  | 0 \d+
)
| \[\^
| \(\?[:=!<>ims\-]
| (?<dp> [${doublePunctuatorChars}] ) \k<dp>
| \\[1-9]\d*
| --
| \\? .
`.replace(/\s+/g, ''), 'gsu');

// Accepts and returns its full state so it doesn't have to reprocess pattern parts that it's
// already seen. Assumes flag v and doesn't worry about syntax errors that are caught by it
export function getEndContextForIncompletePattern(partialPattern, {
  regexContext = RegexContext.DEFAULT,
  charClassContext = CharClassContext.DEFAULT,
  charClassDepth = 0,
  lastPos = 0,
}) {
  contextToken.lastIndex = lastPos;
  let match;
  while (match = contextToken.exec(partialPattern)) {
    const {0: m, groups: {groupN, enclosedT, qT, intervalQ, incompleteT}} = match;
    if (m === '[' || m === '[^') {
      charClassDepth++;
      regexContext = RegexContext.CHAR_CLASS;
      charClassContext = CharClassContext.DEFAULT;
    } else if (m === ']' && regexContext === RegexContext.CHAR_CLASS) {
      if (charClassDepth) {
        charClassDepth--;
      }
      if (!charClassDepth) {
        regexContext = RegexContext.DEFAULT;
      }
      // Reset for accuracy, but it will end up being an error if there is an unclosed context
      // (ex: `\q{…` without closing `}`) in the character class
      charClassContext = CharClassContext.DEFAULT;
    } else if (regexContext === RegexContext.CHAR_CLASS) {
      if (incompleteT) {
        charClassContext = CharClassContext.INVALID_INCOMPLETE_TOKEN;
      } else if (m === '-') {
        charClassContext = CharClassContext.RANGE;
      } else if (enclosedT) {
        charClassContext = CharClassContext.ENCLOSED_TOKEN;
      } else if (qT) {
        charClassContext = CharClassContext.Q_TOKEN;
      } else if (
        (m === '}' && (charClassContext === CharClassContext.ENCLOSED_TOKEN || charClassContext === CharClassContext.Q_TOKEN)) ||
        // Don't want to continue in these contexts if we've advanced another token
        charClassContext === CharClassContext.INVALID_INCOMPLETE_TOKEN ||
        charClassContext === CharClassContext.RANGE
      ) {
        charClassContext = CharClassContext.DEFAULT;
      }
    } else {
      if (incompleteT) {
        regexContext = RegexContext.INVALID_INCOMPLETE_TOKEN;
      } else if (groupN) {
        regexContext = RegexContext.GROUP_NAME;
      } else if (enclosedT) {
        regexContext = RegexContext.ENCLOSED_TOKEN;
      } else if (intervalQ) {
        regexContext = RegexContext.INTERVAL_QUANTIFIER;
      } else if (
        (m === '>' && regexContext === RegexContext.GROUP_NAME) ||
        (m === '}' && (regexContext === RegexContext.ENCLOSED_TOKEN || regexContext === RegexContext.INTERVAL_QUANTIFIER)) ||
        // Don't want to continue in this context if we've advanced another token
        regexContext === RegexContext.INVALID_INCOMPLETE_TOKEN
       ) {
        regexContext = RegexContext.DEFAULT;
      }
    }
  }
  return {
    regexContext,
    charClassContext,
    charClassDepth,
    lastPos: partialPattern.length,
  };
}

/**
Replaces patterns only when they're unescaped and in the given context.
Doesn't skip over complete multicharacter tokens (only `\` and folowing char) so must be used with
knowledge of what's safe to do given regex syntax.
Assumes flag v and doesn't worry about syntax errors that are caught by it.
@param {string} pattern
@param {string} needle Search as a regex pattern, with flags `su`
@param {string | (match: RegExpExecArray) => string} replacement
@param {'DEFAULT' | 'CHAR_CLASS'} [inRegexContext]
@returns {string}
@example
replaceUnescaped(String.raw`.\.\\.\\\.[[\.].].`, '\\.', '~');
// -> String.raw`~\.\\~\\\.[[\.]~]~`
replaceUnescaped(String.raw`.\.\\.\\\.[[\.].].`, '\\.', '~', RegexContext.DEFAULT);
// -> String.raw`~\.\\~\\\.[[\.].]~`
*/
export function replaceUnescaped(pattern, needle, replacement, inRegexContext) {
  const re = new RegExp(String.raw`(?<found>${needle})|\\?.`, 'gsu');
  let numCharClassesOpen = 0;
  let result = '';
  for (const match of pattern.matchAll(re)) {
    const {0: m, groups: {found}} = match;
    if (found && (!inRegexContext || (inRegexContext === RegexContext.DEFAULT) === !numCharClassesOpen)) {
      if (replacement instanceof Function) {
        result += replacement(match);
      } else {
        result += replacement;
      }
      continue;
    }
    if (m === '[') {
      numCharClassesOpen++;
    } else if (m === ']' && numCharClassesOpen) {
      numCharClassesOpen--;
    }
    result += m;
  }
  return result;
}

/**
Check if an unescaped version of a pattern appears outside of a character class.
Doesn't skip over complete multicharacter tokens (only `\` and folowing char) so must be used with
knowledge of what's safe to do given regex syntax.
Assumes flag v and doesn't worry about syntax errors that are caught by it.
@param {string} pattern
@param {string} needle Search as a regex pattern, with flags `su`
@param {(match: RegExpExecArray) => void} [callback]
@returns {boolean}
*/
export function hasUnescapedInDefaultRegexContext(pattern, needle, callback) {
  // Quick partial test; avoid the loop if not needed
  if (!(new RegExp(needle, 'su')).test(pattern)) {
    return false;
  }
  const re = new RegExp(String.raw`(?<found>${needle})|\\?.`, 'gsu');
  let numCharClassesOpen = 0;
  for (const match of pattern.matchAll(re)) {
    const {0: m, groups: {found}} = match;
    if (m === '[') {
      numCharClassesOpen++;
    } else if (!numCharClassesOpen) {
      if (found) {
        if (callback) {
          callback(match);
        }
        return true;
      }
    } else if (m === ']') {
      numCharClassesOpen--;
    }
  }
  return false;
}

// Assumes flag v and doesn't worry about syntax errors that are caught by it
export function countCaptures(pattern) {
  const re = /(?<capture>\((?:(?!\?)|\?<[^>]+>))|\\?./gsu;
  // Don't worry about tracking if we're in a character class or other invalid context for an
  // unescaped `(`, because (given flag v) the unescaped `(` is invalid anyway. However, that means
  // backrefs in subsequent interpolated regexes might be adjusted using an incorrect count, which
  // is displayed in the error message about the overall regex being invalid
  return Array.from(pattern.matchAll(re)).filter(m => m.groups.capture).length;
}

// Assumes flag v and doesn't worry about syntax errors that are caught by it
export function adjustNumberedBackrefs(pattern, precedingCaptures) {
  // Note: Because this doesn't track whether matches are in a character class, it renumbers
  // regardless. That's not a significant issue because the regex would be invalid even without
  // renumbering (given flag v), but the error is more confusing when e.g. an invalid `[\1]` is
  // shown as `[\2]`
  return pattern.replace(
    /\\([1-9]\d*)|\\?./gsu,
    (m, b1) => b1 ? '\\' + (Number(b1) + precedingCaptures) : m
  );
}

const propertiesOfStringsNames = [
  'Basic_Emoji',
  'Emoji_Keycap_Sequence',
  'RGI_Emoji_Modifier_Sequence',
  'RGI_Emoji_Flag_Sequence',
  'RGI_Emoji_Tag_Sequence',
  'RGI_Emoji_ZWJ_Sequence',
  'RGI_Emoji',
].join('|');

// Assumes flag v and doesn't worry about syntax errors that are caught by it
export function containsCharClassUnion(charClassPattern) {
  // Return `true` if contains:
  // - Lowercase `\p` and name is a property of strings (case sensitive).
  // - `\q`.
  // - Two single-char-matching tokens in sequence.
  // - One single-char-matching token followed immediately by unescaped `[`.
  // - One single-char-matching token preceded immediately by unescaped `]`.
  // Else, `false`.
  // Ranges with `-` create a single token.
  // Subtraction and intersection with `--` and `&&` create a single token.
  // Supports any number of nested classes
  const re = new RegExp(String.raw`
\\ (?:
    c [A-Za-z]
  | p \{ (?<pPropOfStr> ${propertiesOfStringsNames} ) \}
  | [pP] \{ [^\}]+ \}
  | (?<qPropOfStr> q )
  | u (?: [A-Fa-f\d]{4} | \{ [A-Fa-f\d]+ \} )
  | x [A-Fa-f\d]{2}
  | .
)
| --
| &&
| .
  `.replace(/\s+/g, ''), 'gsu');
  let hasFirst = false;
  let lastM;
  for (const {0: m, groups} of charClassPattern.matchAll(re)) {
    if (groups.pPropOfStr || groups.qPropOfStr) {
      return true;
    }
    if (m === '[' && hasFirst) {
      return true;
    }
    if (['-', '--', '&&'].includes(m)) {
      hasFirst = false;
    } else if (!['[', ']'].includes(m)) {
      if (hasFirst || lastM === ']') {
        return true;
      }
      hasFirst = true;
    }
    lastM = m;
  }
  return false;
}

/**
The template's `raw` array is processed, along with (only) values that are instanceof `PartialPattern`.
@param {TemplateStringsArray} template
@param {any[]} values
@param {(value, runningContext) => {transformed: string; runningContext: Object}} processor
@returns {{template: TemplateStringsArray; values: any[]}}
*/
export function transformTemplateAndValues(template, values, processor) {
  let newTemplate = {raw: []};
  let newValues = [];
  let runningContext = {};
  template.raw.forEach((raw, i) => {
    const result = processor(raw, {...runningContext, lastPos: 0});
    newTemplate.raw.push(result.transformed);
    runningContext = result.runningContext;
    if (i < template.raw.length - 1) {
      const value = values[i];
      if (value instanceof PartialPattern) {
        const result = processor(value, {...runningContext, lastPos: 0});
        newValues.push(partial(result.transformed));
        runningContext = result.runningContext;
      } else {
        newValues.push(value);
      }
    }
  });
  return {
    template: newTemplate,
    values: newValues,
  };
}
