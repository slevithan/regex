globalThis.patternModsSupported = (() => {
  let supported = true;
  try {
    new RegExp('(?i-ms:)');
  } catch (e) {
    supported = false;
  }
  return supported;
})();

globalThis.duplicateCaptureNamesSupported = (() => {
  let supported = true;
  try {
    new RegExp('(?<n>)|(?<n>)');
  } catch (e) {
    supported = false;
  }
  return supported;
})();
