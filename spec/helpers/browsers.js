if (globalThis.Regex) {
  const {regex, pattern} = Regex;
  Object.assign(globalThis, {regex, pattern});
}
