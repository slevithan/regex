/**
Works the same as JavaScript's native `RegExp` constructor in all contexts, but automatically
adjusts subpattern matches and indices (with flag `d`) to account for injected emulation groups.
*/
class RegExpSubclass extends RegExp {
  // Avoid `#private` to enable subclassing
  /**
  @private
  @type {Map<number, {exclude: true;}> | undefined}
  */
  _captureMap;
  /**
  @param {string | RegExpSubclass} expression
  @param {string} [flags]
  @param {{emulationGroupNums: Array<number>;}} [options]
  */
  constructor(expression, flags, options) {
    if (expression instanceof RegExp && options) {
      throw new Error('Cannot provide options when copying a regexp');
    }
    super(expression, flags);
    // The third argument `options` isn't provided when regexes are copied as part of the internal
    // handling of string methods `matchAll` and `split`
    const emulationGroupNums = options?.emulationGroupNums;
    if (emulationGroupNums) {
      this._captureMap = createCaptureMap(emulationGroupNums);
    } else if (expression instanceof RegExpSubclass) {
      this._captureMap = expression._captureMap;
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
    if (!match || !this._captureMap) {
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
      if (!this._captureMap.get(i)?.exclude) {
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
Build the capturing group map (with emulation groups marked to indicate their submatches shouldn't
appear in results), and remove the markers for captures that were added to emulate extended syntax.
@param {Array<number>} emulationGroupNums
@returns {Map<number, {exclude: true;}>}
*/
function createCaptureMap(emulationGroupNums) {
  const captureMap = new Map();
  for (const num of emulationGroupNums) {
    captureMap.set(num, {
      exclude: true,
    });
  }
  return captureMap;
}

export {
  RegExpSubclass,
};
