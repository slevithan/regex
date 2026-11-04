// Separating some utils for improved tree shaking of the `./internals` export

const noncapturingDelim = String.raw`\(\?(?:[:=!>A-Za-z\-]|<[=!]|\(DEFINE\))`;

/**
Escape `[` when it is a literal character within a flag-u character class.
Existing parsers can then continue to treat every unescaped `[` as the start
of a class, as required by flag v. Line comments are skipped when flag x is
enabled; comments in separate template fragments are intentionally separate.
@param {string} expression
@param {boolean} useFlagV
@param {boolean} [useFlagX]
@param {{inCharClass: boolean}} [context]
@returns {string}
*/
function normalizeCharClassOpeners(expression, useFlagV, useFlagX = false, context = {inCharClass: false}) {
  if (useFlagV) {
    return expression;
  }
  let {inCharClass} = context;
  let inComment = false;
  let result = '';
  for (const [m] of expression.matchAll(/\\?./gsu)) {
    if (inComment) {
      result += m;
      if (m === '\n') {
        inComment = false;
      }
    } else if (useFlagX && !inCharClass && m === '#') {
      inComment = true;
      result += m;
    } else if (m === '[') {
      result += inCharClass ? '\\[' : '[';
      inCharClass = true;
    } else {
      result += m;
      if (m === ']' && inCharClass) {
        inCharClass = false;
      }
    }
  }
  context.inCharClass = inCharClass;
  return result;
}

/**
Updates the array in place by incrementing each value greater than or equal to the threshold.
@param {Array<number>} arr
@param {number} threshold
*/
function incrementIfAtLeast(arr, threshold) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] >= threshold) {
      arr[i]++;
    }
  }
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

export {
  incrementIfAtLeast,
  noncapturingDelim,
  normalizeCharClassOpeners,
  spliceStr,
};
