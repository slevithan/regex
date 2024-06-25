import {Context, hasUnescaped, replaceUnescaped} from 'regex-utilities';
import {noncapturingStart} from './utils.js';

/**
@param {string} pattern
@returns {string}
*/
export function atomicGroupsPostprocessor(pattern) {
  if (!hasUnescaped(pattern, '\\(\\?>', Context.DEFAULT)) {
    return pattern;
  }
  const token = new RegExp(String.raw`(?<noncapturingStart>${noncapturingStart})|(?<capturingStart>\((?:\?<[^>]+>)?)|(?<backrefNum>\\[1-9]\d*)|\\?.`, 'gsu');
  const aGDelim = '(?>';
  const emulatedAGDelim = '(?:(?=(';
  let capturingGroupCount = 0;
  let aGCount = 0;
  let aGPos = NaN;
  let hasProcessedAG;
  do {
    hasProcessedAG = false;
    let numCharClassesOpen = 0;
    let numGroupsOpenInAG = 0;
    let inAG = false;
    let match;
    token.lastIndex = Number.isNaN(aGPos) ? 0 : aGPos + emulatedAGDelim.length;
    while (match = token.exec(pattern)) {
      const {0: m, index: pos, groups: {backrefNum, capturingStart, noncapturingStart}} = match;
      if (m === '[') {
        numCharClassesOpen++;
      } else if (!numCharClassesOpen) {

        if (m === aGDelim && !inAG) {
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
            // Replace pattern and use `\k<$$N>` as a temporary shield for the backref since
            // numbered backrefs are prevented separately
            pattern = `${pattern.slice(0, aGPos)}${emulatedAGDelim}${
              pattern.slice(aGPos + aGDelim.length, pos)
            }))\\k<$$${aGCount + capturingGroupCount}>)${pattern.slice(pos + 1)}`;
            hasProcessedAG = true;
            break;
          }
          numGroupsOpenInAG--;
        } else if (backrefNum) {
          // Could allow this with extra effort (adjusting both the backrefs found and those used
          // to emulate atomic groups) but it's probably not worth it. To trigger this, the regex
          // must contain both an atomic group and an interpolated regex with a numbered backref
          // (since numbered backrefs outside regex interpolation are prevented by implicit flag n)
          throw new Error(`Invalid decimal escape "${m}" in interpolated regex; cannot be used with atomic group`);
        }

      } else if (m === ']') {
        numCharClassesOpen--;
      }
    }
  // Start over from the beginning of the last atomic group's contents, in case the processed group
  // contains additional atomic groups
  } while (hasProcessedAG);
  // Replace `\k<$$N>` added as a shield from the check for invalid numbered backrefs
  pattern = replaceUnescaped(
    pattern,
    String.raw`\\k<\$\$(?<backrefNum>\d+)>`,
    ({groups: {backrefNum}}) => `\\${backrefNum}`,
    Context.DEFAULT
  );
  return pattern;
}
