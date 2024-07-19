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
Returns a value that can be interpolated into a `regex` template string without having its special
characters escaped.

Can be called as a function or template tag:
- `pattern(value)` - String or value coerced to string.
- `` pattern`…` `` - Same as ``pattern(String.raw`…`)``.

@overload
@param {any} value
@returns {Pattern}

@overload
@param {TemplateStringsArray} template
@param {...any} substitutions
@returns {Pattern}
*/
export function pattern(first, ...substitutions) {
  if (Array.isArray(first?.raw)) {
    return new Pattern(
      // Intersperse template raw strings and substitutions
      first.raw.flatMap((raw, i) => i < first.raw.length - 1 ? [raw, substitutions[i]] : raw).join('')
    );
  } else if (!substitutions.length) {
    return new Pattern(first ?? '');
  }
  throw new Error(`Unexpected arguments: ${JSON.stringify([first, ...substitutions])}`);
}
