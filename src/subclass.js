import {capturingDelim, emulationGroupMarker} from './utils.js';
import {Context, replaceUnescaped} from 'regex-utilities';

/**
@class
@param {string | RegExpSubclass} expression
@param {string} [flags]
@param {{useEmulationGroups: boolean;}} [options]
*/
class RegExpSubclass extends RegExp {
  #captureMap;
  constructor(expression, flags, options) {
    let captureMap;
    if (options?.useEmulationGroups) {
      ({expression, captureMap} = unmarkEmulationGroups(expression));
    }
    super(expression, flags);
    if (captureMap) {
      this.#captureMap = captureMap;
    // The third argument `options` isn't provided when regexes are copied as part of the internal
    // handling of string methods `matchAll` and `split`
    } else if (expression instanceof RegExpSubclass) {
      // Can read private properties of the existing object since it was created by this class
      this.#captureMap = expression.#captureMap;
    }
  }
  /**
  Called internally by all String/RegExp methods that use regexes.
  @override
  @param {string} str
  @returns {RegExpExecArray | null}
  */
  exec(str) {
    const match = RegExp.prototype.exec.call(this, str);
    if (!match || !this.#captureMap) {
      return match;
    }
    const matchCopy = [...match];
    // Empty all but the first value of the array while preserving its other properties
    match.length = 1;
    let indicesCopy;
    if (this.hasIndices) {
      indicesCopy = [...match.indices];
      match.indices.length = 1;
    }
    for (let i = 1; i < matchCopy.length; i++) {
      if (this.#captureMap[i]) {
        match.push(matchCopy[i]);
        if (this.hasIndices) {
          match.indices.push(indicesCopy[i]);
        }
      }
    }
    return match;
  }
}

/**
Build the capturing group map (with emulation groups marked as `false` to indicate their submatches
shouldn't appear in results), and remove the markers for anonymous captures which were added to
emulate extended syntax.
@param {string} expression
@returns {{expression: string; captureMap: Array<boolean>;}}
*/
function unmarkEmulationGroups(expression) {
  const marker = emulationGroupMarker.replace(/\$/g, '\\$');
  const captureMap = [true];
  expression = replaceUnescaped(
    expression,
    `(?:${capturingDelim})(?<mark>${marker})?`,
    ({0: m, groups: {mark}}) => {
      if (mark) {
        captureMap.push(false);
        return m.slice(0, -emulationGroupMarker.length);
      }
      captureMap.push(true);
      return m;
    },
    Context.DEFAULT
  );
  return {
    captureMap,
    expression,
  };
}

export {
  RegExpSubclass,
};
