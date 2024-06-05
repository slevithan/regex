import {CharClassContext, RegexContext, contextToken, getEndContextForIncompletePattern, replaceUnescaped, sandboxLoneDoublePunctuatorChar, sandboxUnsafeNulls} from './utils.js';

const ws = /^\s$/;
const escapedWsOrHash = /^\\[\s#]$/;
const charClassWs = /^[ \t]$/;
const escapedCharClassWs = /^\\[ \t]$/;

export function flagXProcessor(value, runningContext) {
  value = String(value);
  let ignoringWs = false;
  let ignoringCharClassWs = false;
  let ignoringComment = false;
  let pattern = '';
  let transformed = '';
  let lastSignificantCharClassContext = '';
  let divNeeded = false;
  const update = (str, {prefix = true, postfix = false} = {}) => {
    str = (divNeeded && prefix ? '(?:)' : '') + str + (postfix ? '(?:)' : '');
    divNeeded = false;
    return str;
  };
  for (const [m] of value.matchAll(contextToken)) {
    if (ignoringComment) {
      if (m === '\n') {
        ignoringComment = false;
        divNeeded = true;
      }
      continue;
    }
    if (ignoringWs) {
      if (ws.test(m)) {
        continue;
      }
      ignoringWs = false;
      divNeeded = true;
    } else if (ignoringCharClassWs) {
      if (charClassWs.test(m)) {
        continue;
      }
      ignoringCharClassWs = false;
    }

    pattern += m;
    runningContext = getEndContextForIncompletePattern(pattern, runningContext);
    const {regexContext, charClassContext} = runningContext;
    if (m === '-' && regexContext === RegexContext.CHAR_CLASS && lastSignificantCharClassContext === CharClassContext.RANGE) {
      // Need to handle this here since the main regex-parsing code would think the hyphen forms
      // part of a subtraction operator since we've removed preceding ws
      throw new Error('Invalid unescaped hyphen as the end value for a range');
    }
    if ((regexContext === RegexContext.DEFAULT && /^[?*+]\??$/.test(m)) || (regexContext === RegexContext.INTERVAL_QUANTIFIER && m === '{')) {
      // Skip the separator prefix and connect the quantifier to the previous token. Add a
      // separator postfix if `m` is `?` to sandbox it from follwing tokens since `?` can be a
      // group-type marker. Ex: `( ?:)` becomes `(?(?:):)` and throws. The loop we're in matches
      // valid group openings in one step, so we won't arrive here if matching e.g. `(?:`. Flag n
      // precludes the need for the postfix since bare `(` is converted to `(?:`, but flag n can be
      // turned off
      transformed += update(m, {prefix: false, postfix: m === '?'});
    } else if (regexContext === RegexContext.DEFAULT) {
      if (ws.test(m)) {
        ignoringWs = true;
      } else if (m.startsWith('#')) {
        ignoringComment = true;
      } else if (escapedWsOrHash.test(m)) {
        transformed += update(m[1], {prefix: false});
      } else {
        transformed += update(m);
      }
    } else if (regexContext === RegexContext.CHAR_CLASS && m !== '[' && m !== '[^') {
      if (
        charClassWs.test(m) &&
        ( charClassContext === CharClassContext.DEFAULT ||
          charClassContext === CharClassContext.RANGE ||
          charClassContext === CharClassContext.Q_TOKEN
        )
      ) {
        ignoringCharClassWs = true;
      } else if (charClassContext === CharClassContext.INVALID_INCOMPLETE_TOKEN) {
        // Need to handle this here since the main regex-parsing code wouldn't know where the token
        // ends if we removed ws after it that was followed by something that completes the token
        throw new Error(`Invalid incomplete token in character class: "${m}"`);
      } else if (
        escapedCharClassWs.test(m) &&
        (charClassContext === CharClassContext.DEFAULT || charClassContext === CharClassContext.Q_TOKEN)
      ) {
          transformed += update(m[1], {prefix: false});
      } else if (charClassContext === CharClassContext.DEFAULT) {
          transformed += update(sandboxLoneDoublePunctuatorChar(sandboxUnsafeNulls(m)));
      } else {
        transformed += update(m);
      }
    } else {
      transformed += update(m);
    }
    if (!(ignoringWs || ignoringCharClassWs || ignoringComment)) {
      lastSignificantCharClassContext = charClassContext;
    }
  }
  return {
    transformed,
    runningContext,
  };
}

// Remove `(?:)` separators (most likely added by flag x) in cases where it's safe to do so
export function rakeSeparators(pattern) {
  const sep = String.raw`\(\?:\)`;
  // No need for repeated separators
  pattern = replaceUnescaped(pattern, `${sep}(?:${sep})+`, '(?:)', RegexContext.DEFAULT);
  // No need for separators at:
  // - The beginning, if not followed by a quantifier.
  // - The end.
  // - Before one of `()|$\`.
  // - After one of `()|>^` or the opening of a non-capturing group or lookaround.
  pattern = replaceUnescaped(
    pattern,
    String.raw`^${sep}(?![?*+{])|${sep}$|${sep}(?=[()|$\\])|(?<=[()|>^]|\(\?(?:[:=!]|<[=!]))${sep}`,
    '',
    RegexContext.DEFAULT
  );
  return pattern;
}
