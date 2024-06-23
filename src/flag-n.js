import {RegexContext, getEndContextForIncompletePattern, noncapturingStart} from './utils.js';

const token = new RegExp(String.raw`
${noncapturingStart}
| \(\?<
| (?<backrefNum>\\[1-9]\d*)
| \\?.
`.replace(/\s+/g, ''), 'gsu');

// Applied to the outer regex and interpolated partials, but not interpolated regexes or strings
export function flagNPreprocessor(value, runningContext) {
  value = String(value);
  let pattern = '';
  let transformed = '';
  for (const {0: m, groups: {backrefNum}} of value.matchAll(token)) {
    pattern += m;
    runningContext = getEndContextForIncompletePattern(pattern, runningContext);
    const {regexContext} = runningContext;
    if (regexContext === RegexContext.DEFAULT) {
      if (m === '(') {
        transformed += '(?:';
      } else if (backrefNum) {
        throw new Error(`Invalid decimal escape "${m}" with implicit flag n; replace with named backreference`);
      } else {
        transformed += m;
      }
    } else {
      transformed += m;
    }
  }
  return {
    transformed,
    runningContext,
  };
}
