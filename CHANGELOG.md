## Unreleased changes

### 🚀 Features

- Added new function `processRegex`, which supports all of `regex`'s options but returns the processed results as a string.

### 🐞 Fixes

- When `unicodeSetsPlugin` is explicitly set to `null`, allow an unescaped and whitespace-separated hyphen on the end of a character class range when using flags <kbd>x</kbd> and <kbd>u</kbd> (i.e. <kbd>v</kbd> is disabled or unsupported).

## Released changes

Changes for released versions are tracked on the GitHub [releases](https://github.com/slevithan/regex/releases) page.
