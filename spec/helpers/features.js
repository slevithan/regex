globalThis.patternModsSupported = (() => {
  let supported = true;
  try {
    new RegExp('(?i-ms:)');
  } catch (e) {
    supported = false;
  }
  return supported;
})();
