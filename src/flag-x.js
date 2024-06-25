import {Context, replaceUnescaped} from 'regex-utilities';
import {CharClassContext, RegexContext, doublePunctuatorChars, getEndContextForIncompletePattern, noncapturingStart, sandboxLoneDoublePunctuatorChar, sandboxUnsafeNulls} from './utils.js';

const ws = /^\s$/;
const escapedWsOrHash = /^\\[\s#]$/;
const charClassWs = /^[ \t]$/;
const escapedCharClassWs = /^\\[ \t]$/;
const token = new RegExp(String.raw`
\\(?: [gk]<
  | [pPu]\{
  | c[A-Za-z]
  | u[A-Fa-f\d]{4}
  | x[A-Fa-f\d]{2}
  | 0\d+
)
| \[\^
| ${noncapturingStart}
| \(\?<
| (?<dp>[${doublePunctuatorChars}])\k<dp>
| --
| \\?.
`.replace(/\s+/g, ''), 'gsu');

// Applied to the outer regex and interpolated partials, but not interpolated regexes or strings
export function flagXPreprocessor(value, runningContext) {
  value = String(value);
  let ignoringWs = false;
  let ignoringCharClassWs = false;
  let ignoringComment = false;
  let pattern = '';
  let transformed = '';
  let lastSignificantToken = '';
  let lastSignificantCharClassContext = '';
  let separatorNeeded = false;
  const update = (str, {prefix = true, postfix = false} = {}) => {
    str = (separatorNeeded && prefix ? '(?:)' : '') + str + (postfix ? '(?:)' : '');
    separatorNeeded = false;
    return str;
  };
  for (const [m] of value.matchAll(token)) {
    if (ignoringComment) {
      if (m === '\n') {
        ignoringComment = false;
        separatorNeeded = true;
      }
      continue;
    }
    if (ignoringWs) {
      if (ws.test(m)) {
        continue;
      }
      ignoringWs = false;
      separatorNeeded = true;
    } else if (ignoringCharClassWs) {
      if (charClassWs.test(m)) {
        continue;
      }
      ignoringCharClassWs = false;
    }

    pattern += m;
    runningContext = getEndContextForIncompletePattern(pattern, runningContext);
    const {regexContext, charClassContext} = runningContext;
    if (
      m === '-' &&
      regexContext === RegexContext.CHAR_CLASS &&
      lastSignificantCharClassContext === CharClassContext.RANGE
    ) {
      // Need to handle this here since the main regex-parsing code would think the hyphen forms
      // part of a subtraction operator since we've removed preceding whitespace
      throw new Error('Invalid unescaped hyphen as the end value for a range');
    }
    if (
      // `??` is matched in one step by the double punctuator token
      (regexContext === RegexContext.DEFAULT && /^(?:[?*+]|\?\?)$/.test(m)) ||
      (regexContext === RegexContext.INTERVAL_QUANTIFIER && m === '{')
    ) {
      // Skip the separator prefix and connect the quantifier to the previous token. This also
      // allows whitespace between a quantifier and the `?` that makes it lazy. Add a postfix
      // separator if `m` is `?` and we're following token `(`, to sandbox the `?` from following
      // tokens (since `?` can be a group-type marker). Ex: `( ?:)` becomes `(?(?:):)` and throws.
      // The loop we're in matches valid group openings in one step, so we won't arrive here if
      // matching e.g. `(?:`. Flag n could prevent the need for the postfix since bare `(` is
      // converted to `(?:`, but flag x handling always comes first and flag n can be turned off
      transformed += update(m, {prefix: false, postfix: lastSignificantToken === '(' && m === '?'});
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
        // ends if we removed whitespace after an incomplete token that is followed by something
        // that completes the token
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
      lastSignificantToken = m;
      lastSignificantCharClassContext = charClassContext;
    }
  }
  return {
    transformed,
    runningContext,
  };
}

// Remove `(?:)` separators (most likely added by flag x) in cases where it's safe to do so
export function rakePostprocessor(pattern) {
  const sep = String.raw`\(\?:\)`;
  // No need for repeated separators
  pattern = replaceUnescaped(pattern, `(?:${sep}){2,}`, '(?:)', Context.DEFAULT);
  // No need for separators at:
  // - The beginning, if not followed by a quantifier.
  // - The end.
  // - Before one of `()|$\`.
  // - After one of `()|>^`, `(?:`, or a lookaround opening.
  pattern = replaceUnescaped(
    pattern,
    String.raw`^${sep}(?![?*+{])|${sep}$|${sep}(?=[()|$\\])|(?<=[()|>^]|\(\?(?:[:=!]|<[=!]))${sep}`,
    '',
    Context.DEFAULT
  );
  return pattern;
}
