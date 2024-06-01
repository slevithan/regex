export const RegexContext = {
  DEFAULT: 'R_DEFAULT',
  CHAR_CLASS: 'R_CHAR_CLASS',
  GROUP_NAME: 'R_GROUP_NAME',
  ENCLOSED_TOKEN: 'R_ENCLOSED_TOKEN',
  INTERVAL_QUANTIFIER: 'R_INTERVAL_QUANTIFIER',
  INVALID_INCOMPLETE_TOKEN: 'R_INVALID_INCOMPLETE_TOKEN',
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

// Regex.make`[\0${0}]` and Regex.make`[${Regex.partial`\0`}0]` can't be guarded against via
// nested `[…]` sandboxing in character classes if the interpolated value doesn't contain union
// (since it might be placed on a range boundary). So escape \0 in character classes as \u{0}
export function sandboxUnsafeNulls(str, inRegexContext) {
  return replaceUnescaped(str, String.raw`\\0(?!\d)`, '\\u{0}', inRegexContext);
}

// Look for characters that would change the meaning of subsequent tokens outside an interpolated value
export function getBreakoutChar(pattern, regexContext, charClassContext) {
  const escapesRemoved = pattern.replace(/\\./gsu, '');
  // Trailing unescaped `\`. Checking `escapesRemoved.includes('\\')` would also work
  if (escapesRemoved.at(-1) === '\\') {
    return '\\';
  }
  if (regexContext === RegexContext.DEFAULT) {
    if (escapesRemoved.includes(')')) {
      return ')';
    }
  } else if (
    regexContext === RegexContext.CHAR_CLASS &&
    !(charClassContext === CharClassContext.ENCLOSED_TOKEN || charClassContext === CharClassContext.Q_TOKEN)
  ) {
    // Look for unescaped `]` that is not part of a self-contained nested class
    let numOpen = 0;
    for (const [m] of escapesRemoved.matchAll(/[\[\]]/g)) {
      numOpen += m === '[' ? 1 : -1;
      if (numOpen < 0) {
        return ']';
      }
    }
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
// - Group openings, so they can be stepped past.
// - Double-punctuators.
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
| \(\?[:=!<]
| (?<dp> [${doublePunctuatorChars}] ) \k<dp>
| --
| \\ .
| .
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
    lastPos: partialPattern.length - 1,
  };
}

/**
Replaces tokens only when they're unescaped and in the given context.
Doesn't skip over complete multicharacter tokens (only `\` and folowing char) so must be used with
knowledge of what's safe to do given regex syntax.
Assumes flag v and doesn't worry about syntax errors that are caught by it.
@param {string} input 
@param {string} needle Search as regex pattern
@param {string} replacement 
@param {RegexContext.DEFAULT | RegexContext.CHAR_CLASS} [inRegexContext]
@returns {string}
@example
replaceUnescaped(String.raw`.\.\\.\\\.[[\.].].`, '\\.', '~');
// -> String.raw`~\.\\~\\\.[[\.]~]~`
replaceUnescaped(String.raw`.\.\\.\\\.[[\.].].`, '\\.', '~', RegexContext.DEFAULT);
// -> String.raw`~\.\\~\\\.[[\.].]~`
*/
export function replaceUnescaped(input, needle, replacement, inRegexContext) {
  const regex = new RegExp(String.raw`(?!${needle})\\.|(?<found>${needle})|.`, 'gsu');
  let numCharClassesOpen = 0;
  let result = '';
  for (const {0: m, groups: {found}} of input.matchAll(regex)) {
    if (found && (!inRegexContext || (inRegexContext === RegexContext.DEFAULT) === !numCharClassesOpen)) {
      result += replacement;
      continue;
    }

    if (m === '[') {
      numCharClassesOpen++;
    } else if (m === ']') {
      numCharClassesOpen--;
    }
    result += m;
  }
  return result;
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
  const regex = new RegExp(String.raw`
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
  for (const {0: m, groups} of charClassPattern.matchAll(regex)) {
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
