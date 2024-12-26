import {regex, pattern, rewrite} from '../../dist/esm/regex.js';
import {emulationGroupMarker} from '../../src/internals.js';

// So specs can be shared with the browser test runner
Object.assign(globalThis, {
  emulationGroupMarker,
  pattern,
  regex,
  rewrite,
});
