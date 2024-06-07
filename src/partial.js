export class PartialPattern {
  #value;
  constructor(pattern) {
    this.#value = pattern;
  }
  toString() {
    return String(this.#value);
  }
}

/**
Can be called in two ways:
1. `partial(value)` - For strings or values coerced to strings
2. `` partial`…` `` - Shorthand for ``partial(String.raw`…`)``
@param {any} first
@param {...any} [values] Values to fill the template holes.
@returns {PartialPattern}
*/
export function partial(first, ...values) {
  if (Array.isArray(first?.raw)) {
    return new PartialPattern(
      // Intersperse template raw strings and values
      first.raw.flatMap((raw, i) => i < first.raw.length - 1 ? [raw, values[i]] : raw).join('')
    );
  } else if (!values.length) {
    return new PartialPattern(first ?? '');
  }
  throw new Error(`Unexpected arguments: ${JSON.stringify([first, ...values])}`);
}
