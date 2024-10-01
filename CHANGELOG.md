## Unreleased changes

### 🐞 Fixes

- Convert numbers interpolated in enclosed `\u{…}` to hexadecimal. In other words, although `` regex`\u{${'160'}}` `` (string interpolated) returns `/\u{160}/`, `` regex`\u{${160}}` `` (number interpolated) now returns `/\u{A0}/`. (#24, @graphemecluster)

## Released changes

Changes for released versions are tracked on the GitHub [releases](https://github.com/slevithan/regex/releases) page.
