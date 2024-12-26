if (globalThis.Regex) {
  const {regex, pattern, rewrite} = Regex;
  Object.assign(globalThis, {
    emulationGroupMarker: '$E$',
    pattern,
    regex,
    rewrite,
  });
}
