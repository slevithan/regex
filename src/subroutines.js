import {Context, execUnescaped, forEachUnescaped, getGroupContents, hasUnescaped} from 'regex-utilities';
import {countCaptures} from './utils.js';

/**
@param {string} expression
@returns {string}
*/
export function subroutinesPostprocessor(expression) {
  const namedGroups = getNamedCapturingGroups(expression);
  return processDefineGroup(
    processSubroutines(expression, namedGroups),
    namedGroups
  );
}

// Explicitly exclude `&` from subroutine name chars because it's used by extension
// `regex-recursion` for recursive subroutines via `\g<name&R=N>`
const subroutinePattern = String.raw`\\g<(?<subroutineName>[^>&]+)>`;
const namedCapturingStartPattern = String.raw`\(\?<(?![=!])(?<captureName>[^>]+)>`;
const capturingStartPattern = String.raw`\((?!\?)|${namedCapturingStartPattern}`;
const token = new RegExp(String.raw`
${subroutinePattern}
| (?<capturingStart>${capturingStartPattern})
| \\(?<backrefNum>[1-9]\d*)
| \\k<(?<backrefName>[^>]+)>
| \\?.
`.replace(/\s+/g, ''), 'gsu');

/**
@typedef {Map<string, {contents: string; isUnique: boolean}>} NamedCapturingGroupsMap
*/

/**
Transform syntax `\g<name>`
@param {string} expression
@param {NamedCapturingGroupsMap} namedGroups
@returns {string}
*/
function processSubroutines(expression, namedGroups) {
  if (!hasUnescaped(expression, '\\\\g<', Context.DEFAULT)) {
    return expression;
  }
  const backrefIncrements = [0];
  const numCapturesBeforeFirstReferencedBySubroutine = countCapturesBeforeFirstReferencedBySubroutine(expression);
  let numCapturesPassedOutsideSubroutines = 0;
  let numCapturesPassedInsideSubroutines = 0;
  let openSubroutinesMap = new Map();
  let openSubroutinesStack = [];
  let numCharClassesOpen = 0;
  let result = expression;
  let match;
  token.lastIndex = 0;
  while (match = token.exec(result)) {
    const {0: m, index, groups: {subroutineName, capturingStart, backrefNum, backrefName}} = match;
    if (m === '[') {
      numCharClassesOpen++;
    } else if (!numCharClassesOpen) {

      const subroutine = openSubroutinesMap.size ? openSubroutinesMap.get(lastOf(openSubroutinesStack)) : null;
      if (subroutineName) {
        if (!namedGroups.has(subroutineName)) {
          throw new Error(`Invalid named capture referenced by subroutine ${m}`);
        }
        if (openSubroutinesMap.has(subroutineName)) {
          throw new Error(`Subroutine ${m} followed a recursive reference`);
        }
        const contents = namedGroups.get(subroutineName).contents;
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
        result = spliceStr(result, index, m, subroutineValue);
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
            result = spliceStr(result, index, m, '(');
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
          result = spliceStr(result, index, m, adjusted);
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
            const adjusted = `\\${getCaptureNum(expression, backrefName)}`;
            result = spliceStr(result, index, m, adjusted);
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
Strip a valid, trailing `(?(DEFINE)…)` group
@param {string} expression
@param {NamedCapturingGroupsMap} namedGroups
@returns {string}
*/
function processDefineGroup(expression, namedGroups) {
  const defineMatch = execUnescaped(expression, String.raw`\(\?\(DEFINE\)`, 0, Context.DEFAULT);
  if (!defineMatch) {
    return expression;
  }
  const defineGroup = getGroup(expression, defineMatch);
  // This also covers when the DEFINE group is unclosed
  if (defineGroup.afterPos !== expression.length) {
    // DEFINE is only supported at the end of the regex because otherwise it would significantly
    // complicate edge-case backref handling
    throw new Error('DEFINE group can only be used at the end of a regex');
  }
  // `(?:)` separators can be added by the flag x preprocessor
  const contentsToken = new RegExp(String.raw`${namedCapturingStartPattern}|\(\?:\)|(?<unsupported>\\?.)`, 'gsu');
  let match;
  while (match = contentsToken.exec(defineGroup.contents)) {
    const {captureName, unsupported} = match.groups;
    if (captureName) {
      if (!namedGroups.get(captureName).isUnique) {
        throw new Error('Names within DEFINE group must be unique');
      }
      contentsToken.lastIndex = getGroup(defineGroup.contents, match).afterPos;
      continue;
    }
    if (unsupported) {
      // Since the DEFINE group is stripped from the expression, we can't easily check if
      // unreferenced syntax is valid. Since it adds no value, it's easiest to just not allow it
      throw new Error(`DEFINE group can only contain named groups; found ${unsupported}`);
    }
  }
  return expression.slice(0, defineMatch.index);
}

/**
@param {string} expression
@param {RegExpExecArray} delimMatch
@returns {{contents: string; afterPos: number}}
*/
function getGroup(expression, delimMatch) {
  const contentsStart = delimMatch.index + delimMatch[0].length;
  const contents = getGroupContents(expression, contentsStart);
  const afterPos = contentsStart + contents.length + 1;
  return {
    contents,
    afterPos,
  };
}

/**
@param {string} expression
@returns {number}
*/
function countCapturesBeforeFirstReferencedBySubroutine(expression) {
  const subroutines = new Set();
  forEachUnescaped(expression, subroutinePattern, ({groups: {subroutineName}}) => {
    subroutines.add(subroutineName);
  }, Context.DEFAULT);
  let num = 0;
  let pos = 0;
  let match;
  while (match = execUnescaped(expression, capturingStartPattern, pos, Context.DEFAULT)) {
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
@param {string} expression
@param {string} groupName
@returns {number}
*/
function getCaptureNum(expression, groupName) {
  let num = 0;
  let pos = 0;
  let match;
  while (match = execUnescaped(expression, capturingStartPattern, pos, Context.DEFAULT)) {
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
@param {string} expression
@returns {NamedCapturingGroupsMap}
*/
function getNamedCapturingGroups(expression) {
  const namedGroups = new Map();
  forEachUnescaped(
    expression,
    namedCapturingStartPattern,
    ({0: m, index, groups: {captureName}}) => {
      // If there are duplicate capture names, subroutines refer to the first instance of the given
      // group (matching the behavior of PCRE and Perl)
      if (namedGroups.has(captureName)) {
        namedGroups.get(captureName).isUnique = false;
      } else {
        namedGroups.set(captureName, {
          contents: getGroupContents(expression, index + m.length),
          isUnique: true,
        });
      }
    },
    Context.DEFAULT
  );
  return namedGroups;
}

/**
@param {string} expression
@returns {number}
*/
function countSubgroups(expression) {
  let num = 0;
  forEachUnescaped(expression, String.raw`\(`, () => num++, Context.DEFAULT);
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
