import {Context, hasUnescaped, replaceUnescaped} from 'regex-utilities';
import {emulationGroupMarker, noncapturingDelim} from './utils.js';

const token = new RegExp(String.raw`(?<noncapturingStart>${noncapturingDelim})|(?<capturingStart>\((?:\?<[^>]+>)?)|\\?.`, 'gsu');

/**
@typedef {import('./regex.js').PluginData} PluginData
*/
/**
@param {string} expression
@param {PluginData} data
@returns {string}
*/
export function atomicPlugin(expression, data) {
  if (!hasUnescaped(expression, '\\(\\?>', Context.DEFAULT)) {
    return expression;
  }
  const aGDelim = '(?>';
  const emulatedAGDelim = `(?:(?=(${data.useEmulationGroups ? emulationGroupMarker : ''}`;
  const captureNumMap = [0];
  let numCapturesBeforeAG = 0;
  let numAGs = 0;
  let aGPos = NaN;
  let hasProcessedAG;
  do {
    hasProcessedAG = false;
    let numCharClassesOpen = 0;
    let numGroupsOpenInAG = 0;
    let inAG = false;
    let match;
    token.lastIndex = Number.isNaN(aGPos) ? 0 : aGPos + emulatedAGDelim.length;
    while (match = token.exec(expression)) {
      const {0: m, index, groups: {capturingStart, noncapturingStart}} = match;
      if (m === '[') {
        numCharClassesOpen++;
      } else if (!numCharClassesOpen) {

        if (m === aGDelim && !inAG) {
          aGPos = index;
          inAG = true;
        } else if (inAG && noncapturingStart) {
          numGroupsOpenInAG++;
        } else if (capturingStart) {
          if (inAG) {
            numGroupsOpenInAG++;
          } else {
            numCapturesBeforeAG++;
            captureNumMap.push(numCapturesBeforeAG + numAGs);
          }
        } else if (m === ')' && inAG) {
          if (!numGroupsOpenInAG) {
            numAGs++;
            // Replace `expression` and use `<$$N>` as a temporary wrapper for the backref so it
            // can avoid backref renumbering afterward
            expression = `${expression.slice(0, aGPos)}${emulatedAGDelim}${
                expression.slice(aGPos + aGDelim.length, index)
              }))<$$${numAGs + numCapturesBeforeAG}>)${expression.slice(index + 1)}`;
            hasProcessedAG = true;
            break;
          }
          numGroupsOpenInAG--;
        }

      } else if (m === ']') {
        numCharClassesOpen--;
      }
    }
  // Start over from the beginning of the last atomic group's contents, in case the processed group
  // contains additional atomic groups
  } while (hasProcessedAG);

  // Second pass to adjust numbered backrefs
  expression = replaceUnescaped(
    expression,
    String.raw`\\(?<backrefNum>[1-9]\d*)|<\$\$(?<wrappedBackrefNum>\d+)>`,
    ({0: m, groups: {backrefNum, wrappedBackrefNum}}) => {
      if (backrefNum) {
        const bNum = +backrefNum;
        if (bNum > captureNumMap.length - 1) {
          throw new Error(`Backref "${m}" greater than number of captures`);
        }
        return `\\${captureNumMap[bNum]}`;
      }
      return `\\${wrappedBackrefNum}`;
    },
    Context.DEFAULT
  );
  return expression;
}
