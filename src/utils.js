export const RegexContext = {
  DEFAULT: 'R_DEFAULT',
  CHAR_CLASS: 'R_CHAR_CLASS',
  GROUP_NAME: 'R_GROUP_NAME',
  INTERVAL_QUANTIFIER: 'R_INTERVAL_QUANTIFIER',
  ENCLOSED_TOKEN: 'R_ENCLOSED_TOKEN',
  OPEN_ESCAPE: 'R_OPEN_ESCAPE',
};

export const CharClassContext = {
  DEFAULT: 'CC_DEFAULT',
  ENCLOSED_TOKEN: 'CC_ENCLOSED_TOKEN',
  OPEN_ESCAPE: 'CC_OPEN_ESCAPE',
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

export function sandboxLoneDoublePunctuatorChar(str) {
  // Sandbox without escaping by repeating the character and escaping only the first one. The
  // second one is so that, if followed by the same symbol, the double punctuator will still throw
  // as expected. Can't just wrap in nested `[…]` since it might be used in a range. Only need to
  // check the first position because, if it's part of an implicit union, interpolation handling
  // will wrap it in nested `[…]`. Can't add a second unescaped symbol if a lone symbol is the
  // entire string because then it won't be wrapped and it might be followed by the same unescaped
  // symbol outside the interpolation. This also takes care of sandboxing a leading `^` so it can't
  // change the meaning of the surrounding character class if we happen to be at the first position
  return str.replace(new RegExp(`^[${doublePunctuatorChars}]`), (m, pos) => {
    return `\\${m}${pos + 1 === str.length ? '' : m}`;
  });
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
  // Trailing unescaped `\`. `escapesRemoved.includes('\\')` would also work
  if (escapesRemoved.at(-1) === '\\') {
    return '\\';
  }
  if (regexContext === RegexContext.DEFAULT) {
    if (escapesRemoved.includes(')')) {
      return ')';
    }
  }
  if (regexContext === RegexContext.CHAR_CLASS && charClassContext === CharClassContext.DEFAULT) {
    // Look for unescaped `]` that is not part of a self-contained nested class
    let numOpen = 0;
    for (const [m] of escapesRemoved.matchAll(/[\[\]]/g)) {
      numOpen += m === '[' ? 1 : -1;
      if (numOpen < 0) {
        return ']';
      }
    }
  }
  if (
    regexContext === RegexContext.ENCLOSED_TOKEN ||
    regexContext === RegexContext.INTERVAL_QUANTIFIER ||
    charClassContext === CharClassContext.ENCLOSED_TOKEN
  ) {
    if (escapesRemoved.includes('}')) {
      return '}';
    }
  }
  if (regexContext === RegexContext.GROUP_NAME) {
    if (escapesRemoved.includes('>')) {
      return '>';
    }
  }
  return '';
}

// Accepts and returns its full state so it doesn't have to reprocess pattern parts that it's
// already seen. Assumes flag v and doesn't worry about syntax errors that are caught by it
export function getEndContextForIncompletePattern(partialPattern, {
  regexContext = RegexContext.DEFAULT,
  charClassContext = CharClassContext.DEFAULT,
  charClassDepth = 0,
  lastPos = 0,
}) {
  const possibleContextToken = /(?<groupN>\(\?<(?![=!])|\\k<)|(?<intervalQ>\{)|(?<enclosedT>\\[pPu]\{)|(?<ccOnlyEnclosedT>\\q\{)|\\.|(?<openE>\\)|./gsu;
  possibleContextToken.lastIndex = lastPos;
  let match;
  while (match = possibleContextToken.exec(partialPattern)) {
    const {0: m, groups: {groupN, intervalQ, enclosedT, ccOnlyEnclosedT, openE}} = match;
    if (m === '[') {
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
      // Reset for accuracy, but it will end up being an error if there is an unclosed context in
      // the character class
      charClassContext = CharClassContext.DEFAULT;
    } else if (regexContext !== RegexContext.CHAR_CLASS) {
      if (groupN) {
        regexContext = RegexContext.GROUP_NAME;
      } else if (intervalQ) {
        regexContext = RegexContext.INTERVAL_QUANTIFIER;
      } else if (enclosedT) {
        regexContext = RegexContext.ENCLOSED_TOKEN;
      } else if (openE) {
        regexContext = RegexContext.OPEN_ESCAPE;
      } else if (
        (m === '>' && regexContext === RegexContext.GROUP_NAME) ||
        (m === '}' && (regexContext === RegexContext.INTERVAL_QUANTIFIER || regexContext === RegexContext.ENCLOSED_TOKEN))
       ) {
        regexContext = RegexContext.DEFAULT;
      }
    } else if (regexContext === RegexContext.CHAR_CLASS) {
      if (enclosedT || ccOnlyEnclosedT) {
        charClassContext = CharClassContext.ENCLOSED_TOKEN;
      } else if (openE) {
        charClassContext = CharClassContext.OPEN_ESCAPE;
      } else if (m === '}' && charClassContext === CharClassContext.ENCLOSED_TOKEN) {
        charClassContext = CharClassContext.DEFAULT;
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
  for (const {0: match, groups: {found}} of input.matchAll(regex)) {
    if (found && (!inRegexContext || (inRegexContext === RegexContext.DEFAULT) === !numCharClassesOpen)) {
      result += replacement;
      continue;
    }

    if (match === '[') {
      numCharClassesOpen++;
    } else if (match === ']') {
      numCharClassesOpen--;
    }
    result += match;
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
  c [A-Za-z] |
  p \{ (?<pPropOfStr> ${propertiesOfStringsNames} ) \} |
  [pP] \{ [^\}]+ \} |
  (?<qPropOfStr> q ) |
  u (?: [A-Fa-f0-9]{4} | \{ [\dA-Fa-f]+ \} ) |
  x [A-Fa-f0-9]{2} |
  .
) |
-- |
&& |
.
  `.replace(/\s+/g, ''), 'gsu');
  let hasFirst = false;
  let lastMatch;
  for (const {0: match, groups} of charClassPattern.matchAll(regex)) {
    if (groups.pPropOfStr || groups.qPropOfStr) {
      return true;
    }
    if (match === '[' && hasFirst) {
      return true;
    }
    if (['-', '--', '&&'].includes(match)) {
      hasFirst = false;
    } else if (!['[', ']'].includes(match)) {
      if (hasFirst || lastMatch === ']') {
        return true;
      }
      hasFirst = true;
    }
    lastMatch = match;
  }
  return false;
}
