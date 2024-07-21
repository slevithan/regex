import {Context, execUnescaped, forEachUnescaped, getGroupContents, hasUnescaped} from 'regex-utilities';
import {capturingDelim, countCaptures, namedCapturingDelim} from './utils.js';

/**
@param {string} expression
@returns {string}
*/
export function subroutinesPostprocessor(expression) {
  const namedGroups = getNamedCapturingGroups(expression, true);
  return processDefinitionGroup(
    processSubroutines(expression, namedGroups),
    namedGroups
  );
}

// Explicitly exclude `&` from subroutine name chars because it's used by extension
// `regex-recursion` for recursive subroutines via `\g<name&R=N>`
const subroutinePattern = String.raw`\\g<(?<subroutineName>[^>&]+)>`;
const token = new RegExp(String.raw`
${subroutinePattern}
| (?<capturingStart>${capturingDelim})
| \\(?<backrefNum>[1-9]\d*)
| \\k<(?<backrefName>[^>]+)>
| \\?.
`.replace(/\s+/g, ''), 'gsu');

/**
@typedef {
  Map<string, {
    isUnique: boolean;
    contents?: string;
  }>} NamedCapturingGroupsMap
*/

/**
Transform `\g<name>`
@param {string} expression
@param {NamedCapturingGroupsMap} namedGroups
@returns {string}
*/
function processSubroutines(expression, namedGroups) {
  if (!hasUnescaped(expression, '\\\\g<', Context.DEFAULT)) {
    return expression;
  }
  const backrefIncrements = [0];
  const openSubroutinesMap = new Map();
  const openSubroutinesStack = [];
  let numCapturesPassedOutsideSubroutines = 0;
  let numCapturesPassedInsideSubroutines = 0;
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
        const num = +backrefNum;
        let increment = 0;
        if (openSubroutinesMap.size) {
          const numCapturesBeforeReferencedGroup = countCapturesBeforeGroupName(expression, openSubroutinesStack[0]);
          if (num > numCapturesBeforeReferencedGroup) {
            increment =
              numCapturesPassedOutsideSubroutines +
              numCapturesPassedInsideSubroutines -
              numCapturesBeforeReferencedGroup -
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
          let isGroupFromThisSubroutine = false;
          if (backrefName === openSubroutinesStack[0]) {
            isGroupFromThisSubroutine = true;
          } else {
            // Search for the group in the contents of the subroutine stack
            for (const s of openSubroutinesStack) {
              if (hasUnescaped(
                openSubroutinesMap.get(s).contents,
                String.raw`\(\?<${backrefName}>`,
                Context.DEFAULT
              )) {
                isGroupFromThisSubroutine = true;
                break;
              }
            }
          }
          if (isGroupFromThisSubroutine) {
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
Strip `(?(DEFINE)…)`
@param {string} expression
@param {NamedCapturingGroupsMap} namedGroups
@returns {string}
*/
function processDefinitionGroup(expression, namedGroups) {
  const defineStart = execUnescaped(expression, String.raw`\(\?\(DEFINE\)`, 0, Context.DEFAULT);
  if (!defineStart) {
    return expression;
  }
  const defineGroup = getGroup(expression, defineStart);
  if (defineGroup.afterPos < expression.length) {
    // Supporting DEFINE at positions other than the end would significantly complicate edge-case
    // backref handling. Note: Flag x's preprocessing permits trailing whitespace and comments
    throw new Error('DEFINE group allowed only at the end of a regex');
  } else if (defineGroup.afterPos > expression.length) {
    throw new Error('DEFINE group is unclosed');
  }
  // `(?:)` separators can be added by the flag x preprocessor
  const contentsToken = new RegExp(String.raw`${namedCapturingDelim}|\(\?:\)|(?<unsupported>\\?.)`, 'gsu');
  let match;
  while (match = contentsToken.exec(defineGroup.contents)) {
    const {captureName, unsupported} = match.groups;
    if (captureName) {
      let group = getGroup(defineGroup.contents, match);
      let duplicateName;
      if (!namedGroups.get(captureName).isUnique) {
        duplicateName = captureName;
      } else {
        const nestedNamedGroups = getNamedCapturingGroups(group.contents);
        for (const name of nestedNamedGroups.keys()) {
          if (!namedGroups.get(name).isUnique) {
            duplicateName = name;
            break;
          }
        }
      }
      if (duplicateName) {
        throw new Error(`Duplicate group name "${duplicateName}" within DEFINE"`);
      }
      contentsToken.lastIndex = group.afterPos;
      continue;
    }
    if (unsupported) {
      // Since a DEFINE group is stripped from its expression, we can't easily check if
      // unreferenced top-level syntax within it is valid. Such syntax serves no purpose, so it's
      // easiest to not allow it
      throw new Error(`DEFINE group includes unsupported syntax at top level`);
    }
  }
  return expression.slice(0, defineStart.index);
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
@param {string} groupName
@returns {number}
*/
function countCapturesBeforeGroupName(expression, groupName) {
  let num = 0;
  let pos = 0;
  let match;
  while (match = execUnescaped(expression, capturingDelim, pos, Context.DEFAULT)) {
    const {0: m, index, groups: {captureName}} = match;
    if (captureName === groupName) {
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
  while (match = execUnescaped(expression, capturingDelim, pos, Context.DEFAULT)) {
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
@param {boolean} [includeContents] Leave off if unneeded, for perf
@returns {NamedCapturingGroupsMap}
*/
function getNamedCapturingGroups(expression, includeContents) {
  const namedGroups = new Map();
  forEachUnescaped(
    expression,
    namedCapturingDelim,
    ({0: m, index, groups: {captureName}}) => {
      // If there are duplicate capture names, subroutines refer to the first instance of the given
      // group (matching the behavior of PCRE and Perl)
      if (namedGroups.has(captureName)) {
        namedGroups.get(captureName).isUnique = false;
      } else {
        namedGroups.set(captureName, {
          isUnique: true,
          ...(
            includeContents ? {
              contents: getGroupContents(expression, index + m.length),
            } : null
          ),
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
