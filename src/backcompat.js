import {doublePunctuatorChars} from './utils.js';

const incompatibleEscapeChars = '&!#%,:;<=>@`~';
const token = new RegExp(String.raw`
\[\^
| (?<dp>[${doublePunctuatorChars}])\k<dp>
| --
| \\(?<vOnlyEscape>[${incompatibleEscapeChars}])
| \\?.
`.replace(/\s+/g, ''), 'gsu');

/**
Apply flag v escaping rules when using flag u. Assumes flag u and doesn't worry about syntax errors
that are caught by it.
@param {string} pattern
@returns {string}
*/
export function backcompatPostprocessor(pattern) {
  let inCharClass = false;
  let result = '';
  for (const {0: m, groups: {dp, vOnlyEscape}} of pattern.matchAll(token)) {
    if (m === '[' || m === '[^') {
      if (inCharClass) {
        throw new Error('Invalid nested character class when flag v not supported; possibly from interpolation');
      }
      inCharClass = true;
    } else if (m === ']') {
      inCharClass = false;
    } else if (inCharClass) {
      if (dp || m === '--') {
        throw new Error(`Invalid double punctuator "${m}" when flag v not supported`);
      } else if (m === '(' || m === ')') {
        throw new Error(`Invalid unescaped "${m}" in character class`);
      } else if (vOnlyEscape) {
        // Remove the escaping backslash to emulate flag v rules, since this is a character that's
        // allowed to be escaped within character classes with flag v but not with flag u
        result += vOnlyEscape;
        continue;
      }
    }
    result += m;
  }
  return result;
}
