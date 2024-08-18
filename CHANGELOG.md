## Unreleased changes

**Improvements**

- Combining atomic/possessive syntax with subroutines previously resulted in subroutines using capturing wrappers. This is now avoided when the regex doesn’t use backreferences, resulting in faster-running generated regex source.
- Possessive fixed repetition quantifiers (e.g. `{2}+`) are now converted to greedy quantifiers, which gives the same behavior with faster-running generated regex source.

## Released changes

Changes for released versions are tracked on the GitHub [releases](https://github.com/slevithan/regex/releases) page.
