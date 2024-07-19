globalThis.patternModsSupported = (() => {
  try {
    new RegExp('(?i:)');
  } catch (e) {
    return false;
  }
  return true;
})();

globalThis.duplicateCaptureNamesSupported = (() => {
  try {
    new RegExp('(?<n>)|(?<n>)');
  } catch (e) {
    return false;
  }
  return true;
})();

globalThis.flagVSupported = (() => {
  try {
    new RegExp('', 'v');
  } catch (e) {
    return false;
  }
  return true;
})();

globalThis.flagDSupported = (() => {
  try {
    new RegExp('', 'd');
  } catch (e) {
    return false;
  }
  return true;
})();
