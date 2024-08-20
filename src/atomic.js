import {Context, hasUnescaped, replaceUnescaped} from 'regex-utilities';
import {emulationGroupMarker, noncapturingDelim} from './utils.js';

const token = new RegExp(String.raw`(?<noncapturingStart>${noncapturingDelim})|(?<capturingStart>\((?:\?<[^>]+>)?)|\\?.`, 'gsu');

/**
@typedef {import('./regex.js').PluginData} PluginData
*/
/**
Apply transformations for atomic groups: `(?>…)`.
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

const baseQuantifier = String.raw`(?:[?*+]|\{\d+(?:,\d*)?\})`;
// Complete tokenizer for base syntax; doesn't (need to) know about character-class-only syntax
const baseToken = new RegExp(String.raw`
\\(?: \d+
  | c[A-Za-z]
  | [gk]<[^>]+>
  | [pPu]\{[^\}]+\}
  | u[A-Fa-f\d]{4}
  | x[A-Fa-f\d]{2}
  )
| \((?: \? (?: [:=!>]
  | <(?:[=!]|[^>]+>)
  | [A-Za-z\-]+:
  | \(DEFINE\)
  ))?
| (?<q>${baseQuantifier})(?<qMod>[?+]?)(?<invalidQ>[?*+\{]?)
| \\?.
`.replace(/\s+/g, ''), 'gsu');

/**
Transform posessive quantifiers into atomic groups. The posessessive quantifiers are:
`?+`, `*+`, `++`, `{N}+`, `{N,}+`, `{N,N}+`.
@param {string} expression
@returns {string}
*/
export function possessivePlugin(expression) {
  if (!hasUnescaped(expression, `${baseQuantifier}\+`, Context.DEFAULT)) {
    return expression;
  }
  const openGroupIndices = [];
  let lastGroupIndex = null;
  let lastCharClassIndex = null;
  let lastToken = '';
  let numCharClassesOpen = 0;
  let transformed = '';
  for (const {0: m, index, groups: {q, qMod, invalidQ}} of expression.matchAll(baseToken)) {
    if (m === '[') {
      if (!numCharClassesOpen) {
        lastCharClassIndex = index;
      }
      numCharClassesOpen++;
    } else if (m === ']') {
      if (numCharClassesOpen) {
        numCharClassesOpen--;
      // Unmatched `]`
      } else {
        lastCharClassIndex = null;
      }
    } else {

      if (qMod === '+' && lastToken && !lastToken.startsWith('(')) {
        // Invalid following quantifier would become valid via the wrapping group
        if (invalidQ) {
          throw new Error(`Invalid quantifier "${m}"`);
        }
        // Possessivizing fixed repetition quantifiers like `{2}` does't change their behavior, so
        // avoid doing so (convert them to greedy)
        if (/^\{\d+\}$/.test(q)) {
          transformed += q;
        } else if (lastToken === ')' || lastToken === ']') {
          const nodeIndex = lastToken === ')' ? lastGroupIndex : lastCharClassIndex;
          // Unmatched `)` would break out of the wrapping group and mess with handling
          if (nodeIndex === null) {
            throw new Error(`Invalid unmatched "${lastToken}"`);
          }
          const node = expression.slice(nodeIndex, index);
          transformed = `${expression.slice(0, nodeIndex)}(?>${node}${q})`;
        } else {
          transformed = `${expression.slice(0, transformed.length - lastToken.length)}(?>${lastToken}${q})`;
        }
        // Avoid adding the match to `transformed`
        // Haven't updated `lastToken`, but it isn't needed
        continue;
      } else if (m[0] === '(') {
        openGroupIndices.push(index);
      } else if (m === ')') {
        lastGroupIndex = openGroupIndices.length ? openGroupIndices.pop() : null;
      }

    }
    lastToken = m;
    transformed += m;
  }
  return transformed;
}
