if (globalThis.Regex) {
  const {regex, pattern, rewrite} = Regex;
  Object.assign(globalThis, {
    pattern,
    regex,
    rewrite,
  });
}
