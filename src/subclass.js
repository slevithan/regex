/**
Works the same as JavaScript's native `RegExp` constructor in all contexts, but automatically
adjusts subpattern matches and indices (with flag `d`) to account for injected emulation groups.
*/
class RegExpSubclass extends RegExp {
  // Avoid `#private` to enable subclassing
  /**
  @private
  @type {Map<number, {exclude: true;}>}
  */
  _captureMap;
  /**
  @overload
  @param {string} expression
  @param {string} [flags]
  @param {{
    hiddenCaptureNums?: Array<number>;
  }} [options]
  */
  /**
  @overload
  @param {RegExpSubclass} expression
  @param {string} [flags]
  */
  constructor(expression, flags, options) {
    // Argument `options` isn't provided when regexes are copied via `new RegExpSubclass(regexp)`,
    // including as part of the internal handling of string methods `matchAll` and `split`
    if (expression instanceof RegExp) {
      if (options) {
        throw new Error('Cannot provide options when copying a regexp');
      }
      super(expression, flags);
      if (expression instanceof RegExpSubclass) {
        this._captureMap = expression._captureMap;
      } else {
        this._captureMap = new Map();
      }
    } else {
      super(expression, flags);
      const hiddenCaptureNums = options?.hiddenCaptureNums ?? [];
      this._captureMap = createCaptureMap(hiddenCaptureNums);
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
    if (!match || !this._captureMap.size) {
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
Build the capturing group map, with emulation groups marked to indicate their submatches shouldn't
appear in results.
@param {Array<number>} hiddenCaptureNums
@returns {Map<number, {exclude: true;}>}
*/
function createCaptureMap(hiddenCaptureNums) {
  const captureMap = new Map();
  for (const num of hiddenCaptureNums) {
    captureMap.set(num, {
      exclude: true,
    });
  }
  return captureMap;
}

export {
  RegExpSubclass,
};
