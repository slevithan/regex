if (globalThis.Regex) {
  const {regex, pattern, processRegex} = Regex;
  Object.assign(globalThis, {regex, pattern, processRegex});
}
