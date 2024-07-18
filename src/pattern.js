export class Pattern {
  #value;
  /**
  @param {any} value
  */
  constructor(value) {
    this.#value = value;
  }
  /**
  @override
  @returns {string}
  */
  toString() {
    return String(this.#value);
  }
}

/**
Returns a value that can be interpolated into a `regex` template without having its special
characters escaped.

Can be called in two ways:
1. `pattern(value)` - For strings or values coerced to strings
2. `` pattern`…` `` - Shorthand for ``pattern(String.raw`…`)``

@param {any} first
@param {...any} substitutions Values to fill the template holes.
@returns {Pattern}
*/
export function pattern(first, ...substitutions) {
  if (Array.isArray(first?.raw)) {
    return new Pattern(
      // Intersperse template raw strings and values
      first.raw.flatMap((raw, i) => i < first.raw.length - 1 ? [raw, substitutions[i]] : raw).join('')
    );
  } else if (!substitutions.length) {
    return new Pattern(first ?? '');
  }
  throw new Error(`Unexpected arguments: ${JSON.stringify([first, ...substitutions])}`);
}
