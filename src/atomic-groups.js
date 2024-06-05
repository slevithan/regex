import {RegexContext, hasUnescapedInDefaultRegexContext, replaceUnescaped} from './utils.js';

export function transformAtomicGroups(pattern) {
  if (!hasUnescapedInDefaultRegexContext(pattern, String.raw`\(\?>`)) {
    return pattern;
  }
  const token = new RegExp(String.raw`(?<noncapturingStart>\(\?(?:[:=!>]|<[=!]|[ims\-]+:))|(?<capturingStart>\((?:\?<[^>]+>)?)|(?<backrefNum>\\[1-9]\d*)|\\?.`, 'gsu');
  const aGDelimLen = '(?>'.length;
  let hasProcessedAG;
  let capturingGroupCount = 0;
  let aGCount = 0;
  let aGPos = NaN;
  do {
    hasProcessedAG = false;
    let numCharClassesOpen = 0;
    let numGroupsOpenInAG = 0;
    let inAG = false;
    let match;
    token.lastIndex = Number.isNaN(aGPos) ? 0 : aGPos + aGDelimLen;
    while (match = token.exec(pattern)) {
      const {0: m, index: pos, groups: {backrefNum, capturingStart, noncapturingStart}} = match;
      if (m === '[') {
        numCharClassesOpen++;
      } else if (!numCharClassesOpen) {
        if (m === '(?>' && !inAG) {
          aGPos = pos;
          inAG = true;
        } else if (inAG && noncapturingStart) {
          numGroupsOpenInAG++;
        } else if (capturingStart) {
          if (inAG) {
            numGroupsOpenInAG++;
          }
          capturingGroupCount++;
        } else if (m === ')' && inAG) {
          if (!numGroupsOpenInAG) {
            aGCount++;
            // Replace `pattern` and start over from the opening position of the atomic group, in
            // case the processed group contains additional atomic groups
            pattern = `${pattern.slice(0, aGPos)}(?:(?=(${pattern.slice(aGPos + aGDelimLen, pos)}))\\k<${aGCount + capturingGroupCount}>)${pattern.slice(pos + 1)}`;
            hasProcessedAG = true;
            // Subtract the capturing group we just added as part of emulating an atomic group
            capturingGroupCount--;
            break;
          }
          numGroupsOpenInAG--;
        } else if (backrefNum) {
          // Could allow this with extra effort (adjusting both the backreferences found and those
          // used to emulate atomic groups) but it's probably not worth it. To trigger this, the
          // regex must contain both an atomic group and an interpolated RegExp instance with a
          // numbered backreference
          throw new Error(`Invalid decimal escape "${m}" in interpolated regex; cannot be used with atomic group`);
        }
      } else if (m === ']') {
        numCharClassesOpen--;
      }
    }
  } while (hasProcessedAG);
  // Replace the `\k<…>` added as a shield from the check for invalid numbered backreferences
  pattern = replaceUnescaped(
    pattern,
    String.raw`\\k<(?<backrefNum>\d+)>`,
    ({groups: {backrefNum}}) => `\\${backrefNum}`,
    RegexContext.DEFAULT
  );
  return pattern;
}
