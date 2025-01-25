import {regex, pattern, rewrite} from '../../dist/esm/regex.js';

// So specs can be shared with the browser test runner
Object.assign(globalThis, {
  pattern,
  regex,
  rewrite,
});
