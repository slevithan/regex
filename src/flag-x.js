import { PartialPattern, partial } from './partial.js';
import { CharClassContext, RegexContext, contextToken, getEndContextForIncompletePattern, sandboxLoneDoublePunctuatorChar, sandboxUnsafeNulls } from './utils.js';

export function transformForFlagX(template, values) {
  let newTemplate = {raw: []};
  let newValues = [];
  let runningContext = {};
  template.raw.forEach((raw, i) => {
    const result = process(raw, {...runningContext, lastPos: 0});
    newTemplate.raw.push(result.transformed);
    runningContext = result.runningContext;
    if (i < template.raw.length - 1) {
      const value = values[i];
      if (value instanceof PartialPattern) {
        const result = process(value, {...runningContext, lastPos: 0});
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

function process(value, runningContext) {
  value = String(value);
  const ws = /^\s$/;
  const charClassWs = /^[ \t]$/;
  let ignoringWs = false;
  let ignoringCharClassWs = false;
  let ignoringComment = false;
  let pattern = '';
  let transformed = '';
  let lastSignificantCharClassContext = '';
  let divPrecedesNext = false;
  const div = str => (divPrecedesNext ? '(?:)' : '') + str;
  for (const [m] of value.matchAll(contextToken)) {
    if (ignoringComment) {
      if (m === '\n') {
        ignoringComment = false;
        // Flag instead of adding separator, so we can avoid a separator if followed by quantifier
        divPrecedesNext = true;
      }
      continue;
    }
    if (ignoringWs) {
      if (ws.test(m)) {
        continue;
      }
      ignoringWs = false;
      // Flag instead of adding separator, so we can avoid a separator if followed by quantifier
      divPrecedesNext = true;
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
      // Need to handle this here since the main regex parsing code would think the hyphen forms
      // part of a subtraction operator since we've removed preceding ws
      throw new Error('Invalid unescaped hyphen as the end value for a range');
    }
    if ((regexContext === RegexContext.DEFAULT && /^[?*+]\??$/.test(m)) || (regexContext === RegexContext.INTERVAL_QUANTIFIER && m === '{')) {
      // Skip the divider prefix added by `div`, to connect the quantifier to the previous token.
      // Add a divider postfix if token is `?`, so that e.g. `( ?:)` becomes `(?(?:):)` and throws
      // since you can't quantify `(`. `contextToken` matches valid group openings in one step, so
      // you won't stop here at the `?` if watching within `(?:)`
      transformed += m + (m === '?' ? '(?:)' : '');
      divPrecedesNext = false;
    } else if (regexContext === RegexContext.DEFAULT) {
      if (ws.test(m)) {
        ignoringWs = true;
      } else if (m.startsWith('#')) {
        ignoringComment = true;
      } else if (/^\\[\s#]$/.test(m)) {
        transformed += m[1];
        divPrecedesNext = false;
      } else {
        transformed += div(m);
        divPrecedesNext = false;
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
        // Need to handle this here since the main regex parsing code wouldn't know where the token
        // ends if we removed ws after it that was followed by something that completes the token
        throw new Error(`Invalid incomplete token in character class: ${m}`);
      } else if (
        /^\\[ \t]$/.test(m) &&
        (charClassContext === CharClassContext.DEFAULT || charClassContext === CharClassContext.Q_TOKEN)
      ) {
          transformed += m[1];
          divPrecedesNext = false;
      } else if (charClassContext === CharClassContext.DEFAULT) {
          transformed += div(sandboxLoneDoublePunctuatorChar(sandboxUnsafeNulls(m)));
          divPrecedesNext = false;
      } else {
        transformed += div(m);
        divPrecedesNext = false;
      }
    } else {
      transformed += div(m);
      divPrecedesNext = false;
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
