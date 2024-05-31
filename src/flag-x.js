import { PartialPattern, partial } from "./partial.js";
import { CharClassContext, RegexContext, contextToken, getEndContextForIncompletePattern } from "./utils.js";

// TODO: Remove some unneeded (?:)

export function transformForFlagX(template, values) {
  let newTemplate = {raw: []};
  let newValues = [];
  let runningContext = {};
  template.raw.forEach((raw, i) => {
    const result = process(raw, {...runningContext, lastPos: 0});
    newTemplate.raw.push(result.transformedPattern);
    runningContext = result.runningContext;
    if (i < template.raw.length - 1) {
      const value = values[i];
      if (value instanceof PartialPattern) {
        const result = process(value, {...runningContext, lastPos: 0});
        newValues.push(partial(result.transformedPattern));
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
  let transformedPattern = '';
  for (const [m] of value.matchAll(contextToken)) {
    pattern += m;
    runningContext = getEndContextForIncompletePattern(pattern, runningContext);
    const {regexContext, charClassContext} = runningContext;

    if (ignoringComment) {
      if (m === '\n') {
        ignoringComment = false;
        // TODO: Allow following quantifer
        transformedPattern += '(?:)';
      }
      continue;
    }
    if (ignoringWs) {
      if (ws.test(m)) {
        continue;
      }
      ignoringWs = false;
      // TODO: Allow following quantifer
      transformedPattern += '(?:)';
    }
    if (ignoringCharClassWs) {
      if (charClassWs.test(m)) {
        continue;
      }
      ignoringCharClassWs = false;
    }

    if (regexContext === RegexContext.DEFAULT) {
      if (ws.test(m)) {
        ignoringWs = true;
      } else if (m === '#') {
        ignoringComment = true;
      } else {
        transformedPattern += m;
      }
    } else if (regexContext === RegexContext.CHAR_CLASS) {
      if (charClassWs.test(m) && (charClassContext === CharClassContext.DEFAULT || charClassContext === CharClassContext.Q_TOKEN)) {
        ignoringCharClassWs = true;
      } else if (charClassContext === CharClassContext.INVALID_INCOMPLETE_TOKEN) {
        // Need to handle this here since the main regex parsing code wouldn't know where the token
        // ends if we removed whitespace after it
        throw new Error(`Invalid incomplete token in character class: ${m}`);
      } else {
        if (charClassContext === CharClassContext.DEFAULT) {
          // TODO: Contentually sandbox or escape `\0`, `-`, and lone double-punctuator symbols
        }
        transformedPattern += m;
      }
    } else {
      transformedPattern += m;
    }
  }
  return {
    transformedPattern,
    runningContext,
  };
}
