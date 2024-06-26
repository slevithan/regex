import {Context, execUnescaped, forEachUnescaped, getGroupContents, hasUnescaped} from 'regex-utilities';
import {countCaptures} from './utils.js';

// Explicitly exclude `&` from subroutine name chars because it's used by extension
// `regex-recursion` for recursive subroutines via `\g<name&R=N>`
const subroutinePattern = String.raw`\\g<(?<subroutineName>[^>&]+)>`;
const capturingStartPattern = String.raw`\((?:(?!\?)|\?<(?![=!])(?<captureName>[^>]+)>)`;
const token = new RegExp(String.raw`
${subroutinePattern}
| (?<capturingStart>${capturingStartPattern})
| \\(?<backrefNum>[1-9]\d*)
| \\k<(?<backrefName>[^>]+)>
| \\?.
`.replace(/\s+/g, ''), 'gsu');

/**
@param {string} pattern
@returns {string}
*/
export function subroutinesPostprocessor(pattern) {
  if (!hasUnescaped(pattern, '\\\\g<', Context.DEFAULT)) {
    return pattern;
  }
  const capturingGroups = getNamedCapturingGroups(pattern);
  const backrefIncrements = [0];
  const numCapturesBeforeFirstReferencedBySubroutine = countCapturesBeforeFirstReferencedBySubroutine(pattern);
  let numCapturesPassedOutsideSubroutines = 0;
  let numCapturesPassedInsideSubroutines = 0;
  let openSubroutinesMap = new Map();
  let openSubroutinesStack = [];
  let numCharClassesOpen = 0;
  let result = pattern;
  let match;
  token.lastIndex = 0;
  while (match = token.exec(result)) {
    const {0: m, index: pos, groups: {subroutineName, capturingStart, backrefNum, backrefName}} = match;
    if (m === '[') {
      numCharClassesOpen++;
    } else if (!numCharClassesOpen) {

      const subroutine = openSubroutinesMap.size ? openSubroutinesMap.get(lastOf(openSubroutinesStack)) : null;
      if (subroutineName) {
        if (!capturingGroups.has(subroutineName)) {
          throw new Error(`Invalid named capture referenced by subroutine ${m}`);
        }
        if (openSubroutinesMap.has(subroutineName)) {
          throw new Error(`Subroutine ${m} followed a recursive reference`);
        }
        const contents = capturingGroups.get(subroutineName);
        const numCaptures = countCaptures(contents) + 1; // Plus '(' wrapper
        numCapturesPassedInsideSubroutines += numCaptures;
        // Wrap value in case it has top-level alternation or is followed by a quantifier. The
        // wrapper also marks the end of the expanded contents, which we'll track using
        // `unclosedGroupCount`. Wrap with '()' instead of '(?:)' so that backrefs line up, in case
        // there are backrefs inside the subroutine that refer to their parent capturing group
        const subroutineValue = `(${contents})`;
        openSubroutinesMap.set(subroutineName, {
          contents,
          unclosedGroupCount: countSubgroups(subroutineValue),
          numCaptures,
        });
        openSubroutinesStack.push(subroutineName);
        // Expand the subroutine's contents into the pattern we're looping over
        result = spliceStr(result, pos, m, subroutineValue);
        token.lastIndex -= m.length;
      } else if (capturingStart) {
        // Somewhere within an expanded subroutine
        if (openSubroutinesMap.size) {
          // Named capturing group
          if (m !== '(') {
            // Replace named with unnamed capture. Subroutines shouldn't create new captures, but
            // it can't be helped since we need any backrefs to this named capture to work. Given
            // that implicit flag n prevents unnamed capture and requires you to rely on named
            // backrefs and `groups`, this essentially accomplishes not creating a capture
            result = spliceStr(result, pos, m, '(');
            token.lastIndex -= m.length;
          }
          backrefIncrements.push(lastOf(backrefIncrements) + subroutine.numCaptures);
        } else {
          numCapturesPassedOutsideSubroutines++;
          if (backrefIncrements.length === numCapturesPassedOutsideSubroutines) {
            backrefIncrements.push(lastOf(backrefIncrements));
          }
        }
      } else if (backrefNum) {
        // Beware: backref renumbering with subroutines is complicated
        const num = +backrefNum;
        let increment;
        if (openSubroutinesMap.size) {
          if (num > numCapturesBeforeFirstReferencedBySubroutine) {
            increment = numCapturesPassedOutsideSubroutines +
              numCapturesPassedInsideSubroutines -
              numCapturesBeforeFirstReferencedBySubroutine -
              subroutine.numCaptures;
          }
        } else {
          increment = backrefIncrements[num];
        }
        if (increment) {
          const adjusted = `\\${num + increment}`;
          result = spliceStr(result, pos, m, adjusted);
          token.lastIndex += adjusted.length - m.length;
        }
      } else if (backrefName) {
        if (openSubroutinesMap.size) {
          // Search for the corresponding group in the contents of the subroutine stack
          let found = false;
          for (const s of openSubroutinesStack) {
            if (hasUnescaped(
              openSubroutinesMap.get(s).contents,
              String.raw`\(\?<${backrefName}>`,
              Context.DEFAULT
            )) {
              found = true;
              break;
            }
          }
          if (found) {
            // Point to the group, then let normal renumbering work in the next loop iteration
            const adjusted = `\\${getCaptureNum(pattern, backrefName)}`;
            result = spliceStr(result, pos, m, adjusted);
            token.lastIndex -= m.length;
          }
          // Else, leave as is
        }
      } else if (m === ')') {
        if (openSubroutinesMap.size) {
          subroutine.unclosedGroupCount--;
          if (!subroutine.unclosedGroupCount) {
            openSubroutinesMap.delete(openSubroutinesStack.pop());
          }
        }
      }

    } else if (m === ']') {
      numCharClassesOpen--;
    }
  }
  return result;
}

/**
@param {string} pattern
@returns {number}
*/
function countCapturesBeforeFirstReferencedBySubroutine(pattern) {
  const subroutines = new Set();
  forEachUnescaped(pattern, subroutinePattern, ({groups: {subroutineName}}) => {
    subroutines.add(subroutineName);
  }, Context.DEFAULT);
  let num = 0;
  let pos = 0;
  let match;
  while (match = execUnescaped(pattern, capturingStartPattern, pos, Context.DEFAULT)) {
    const {0: m, index, groups: {captureName}} = match;
    if (subroutines.has(captureName)) {
      break;
    }
    num++;
    pos = index + m.length;
  }
  return num;
}

/**
@param {string} pattern
@param {string} groupName
@returns {number}
*/
function getCaptureNum(pattern, groupName) {
  let num = 0;
  let pos = 0;
  let match;
  while (match = execUnescaped(pattern, capturingStartPattern, pos, Context.DEFAULT)) {
    const {0: m, index, groups: {captureName}} = match;
    num++;
    if (captureName === groupName) {
      break;
    }
    pos = index + m.length;
  }
  return num;
}

/**
@param {string} str
@param {number} pos
@param {string} oldValue
@param {string} newValue
@returns {string}
*/
function spliceStr(str, pos, oldValue, newValue) {
  return str.slice(0, pos) + newValue + str.slice(pos + oldValue.length);
}

/**
@param {string} pattern
@returns {Map<string, Array<{contents: string, endPos: number}>>}
*/
function getNamedCapturingGroups(pattern) {
  const capturingGroups = new Map();
  forEachUnescaped(pattern, String.raw`\(\?<(?<captureName>[^>]+)>`, ({0: m, index, groups: {captureName}}) => {
    // If there are duplicate capture names, subroutines refer to the first instance of the given
    // group (matching the behavior of PCRE and Perl)
    if (!capturingGroups.has(captureName)) {
      capturingGroups.set(captureName, getGroupContents(pattern, index + m.length));
    }
  }, Context.DEFAULT);
  return capturingGroups;
}

/**
@param {string} pattern
@returns {number}
*/
function countSubgroups(pattern) {
  let num = 0;
  forEachUnescaped(pattern, String.raw`\(`, () => num++, Context.DEFAULT);
  return num;
}

/**
Remove when support for ES2022 string/array method `at` (Node.js 16.6+) is no longer an issue
@param {string | any[]} strOrArr
@returns {any}
*/
function lastOf(strOrArr) {
  return strOrArr[strOrArr.length - 1];
}
