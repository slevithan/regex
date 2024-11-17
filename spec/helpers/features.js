globalThis.envSupportsDuplicateNames = (() => {
  try {
    new RegExp('(?<n>)|(?<n>)');
  } catch {
    return false;
  }
  return true;
})();

globalThis.envSupportsFlagGroups = (() => {
  try {
    new RegExp('(?i:)');
  } catch {
    return false;
  }
  return true;
})();

globalThis.envSupportsFlagD = (() => {
  try {
    new RegExp('', 'd');
  } catch {
    return false;
  }
  return true;
})();

globalThis.envSupportsFlagV = (() => {
  try {
    new RegExp('', 'v');
  } catch {
    return false;
  }
  return true;
})();
