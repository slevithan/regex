<div align="center">

<a href="https://github.com/slevithan/regex#readme">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./regex-logo-dark.svg">
    <img alt="regex logo" height="180" src="https://github.com/slevithan/regex/raw/main/regex-logo.svg">
  </picture>
</a>

[![build status](https://github.com/slevithan/regex/workflows/CI/badge.svg)](https://github.com/slevithan/regex/actions)
[![npm](https://img.shields.io/npm/v/regex)](https://www.npmjs.com/package/regex)
[![bundle size](https://deno.bundlejs.com/badge?q=regex&treeshake=[*])](https://bundlejs.com/?q=regex&treeshake=[*])
</div>

`regex` is a template tag that extends JavaScript regular expressions with features that make them more powerful and dramatically more readable. It returns native `RegExp` instances that equal or exceed native performance. It's also lightweight, supports all ES2025 regex features, and can be used as a [Babel plugin](https://github.com/slevithan/babel-plugin-transform-regex) to avoid any runtime dependencies or added runtime cost.

Highlights include support for free spacing and comments, atomic groups via `(?>…)` that can help you avoid [ReDoS](https://en.wikipedia.org/wiki/ReDoS), subroutines via `\g<name>` and subroutine definition groups via `(?(DEFINE)…)` that enable powerful subpattern composition, and context-aware interpolation of regexes, escaped strings, and partial patterns.

With the `regex` library, JavaScript steps up as one of the best regex flavors alongside PCRE and Perl, possibly surpassing C++, Java, .NET, Python, and Ruby.

<details>
  <summary><b>Table of contents</b></summary>

- [Features](#-features)
- [Examples](#-examples)
- [Install and use](#️-install-and-use)
- [Context](#-context)
- [Extended regex syntax](#-extended-regex-syntax)
  - [Atomic groups](#atomic-groups)
  - [Subroutines](#subroutines)
  - [Subroutine definition groups](#subroutine-definition-groups)
  - [Recursion](#recursion)
- [Flags](#-flags)
  - [Implicit flags](#implicit-flags)
  - [Flag <kbd>v</kbd>](#flag-v)
  - [Flag <kbd>x</kbd>](#flag-x)
  - [Flag <kbd>n</kbd>](#flag-n)
- [Interpolation](#-interpolation)
  - [`RegExp` instances](#interpolating-regexes)
  - [Escaped strings](#interpolating-escaped-strings)
  - [Partial patterns](#interpolating-partial-patterns)
  - [Interpolation principles](#interpolation-principles)
  - [Interpolation contexts](#interpolation-contexts)
- [Options](#-options)
- [Performance](#-performance)
- [Compatibility](#-compatibility)
- [FAQ](#-faq)
</details>

## 💎 Features

- **A modern regex baseline** so you don't need to continually opt-in to best practices.
  - Always-on flag <kbd>v</kbd> gives you the best level of Unicode support and strict errors.
  - New flags:
    - Always-on flag <kbd>x</kbd> allows you to freely add whitespace and comments to your regexes.
    - Always-on flag <kbd>n</kbd> (*named capture only* mode) improves regex readability and efficiency.
  - No unreadable escaped backslashes `\\\\` since it's a raw string template tag.
- **Extended regex syntax**.
  - Atomic groups via `(?>…)` can dramatically improve performance and prevent ReDoS.
  - Subroutines via `\g<name>` enable powerful composition, improving readability and maintainability.
  - Subroutine definition groups via `(?(DEFINE)…)` allow groups within them to be used by reference only.
  - Recursive matching is enabled by an extension.
- **Context-aware and safe interpolation** of regexes, strings, and partial patterns.
  - Interpolated strings have their special characters escaped.
  - Interpolated regexes locally preserve the meaning of their own flags (or their absense), and any numbered backreferences are adjusted to work within the overall pattern.

## 🪧 Examples

```js
import {regex, pattern} from 'regex';

// Subroutines and subroutine definition group
const record = regex`
  ^ Admitted:\ (?<admitted> \g<date>) \n
    Released:\ (?<released> \g<date>) $

  (?(DEFINE)
    (?<date>  \g<year>-\g<month>-\g<day>)
    (?<year>  \d{4})
    (?<month> \d{2})
    (?<day>   \d{2})
  )
`;

// Atomic group: avoids ReDoS from the nested, overlapping quantifier
const words = regex`^(?>\w+\s?)+$`;

// Context-aware and safe interpolation
const re = regex('m')`
  # Only the inner regex is case insensitive (flag i)
  # Also, the outer regex's flag m is not applied to it
  ${/^a.b$/i}
  |
  # Strings are contextually escaped and repeated as complete units
  ^ ${'a.b'}+ $
  |
  # This string is contextually sandboxed but not escaped
  ${pattern('^ a.b $')}
`;

// Numbered backreferences in interpolated regexes are adjusted
const double = /(.)\1/;
regex`^ (?<first>.) ${double} ${double} $`;
// → /^(?<first>.)(.)\2(.)\3$/v
```

## 🕹️ Install and use

```sh
npm install regex
```

```js
import {regex, pattern} from 'regex';
```

In browsers:

```html
<script type="module">
  import {regex, pattern} from 'https://cdn.jsdelivr.net/npm/regex@4.0.0/+esm';
  // …
</script>
```

<details>
  <summary>Using a global name (no import)</summary>

```html
<script src="https://cdn.jsdelivr.net/npm/regex@4.0.0/dist/regex.min.js"></script>
<script>
  const {regex, pattern} = Regex;
  // …
</script>
```
</details>

## ❓ Context

Due to years of legacy and backward compatibility, regular expression syntax in JavaScript is a bit of a mess. There are four different sets of incompatible syntax and behavior rules that might apply to your regexes depending on the flags and features you use. The differences are just plain hard to fully grok and can easily create subtle bugs.

<details>
  <summary>See the four parsing modes</summary>

1. Unicode-unaware (legacy) mode is the default and can easily and silently create Unicode-related bugs.
2. Named capture mode changes the meaning of `\k` when a named capture appears anywhere in a regex.
3. Unicode mode with flag <kbd>u</kbd> adds strict errors (for unreserved letter escapes, octal escapes, escaped literal digits, and unescaped special characters in some contexts), switches to code-point-based matching (changing the potential handling of the dot, negated sets like `\W`, character class ranges, and quantifiers), changes flag <kbd>i</kbd> to apply Unicode case-folding, and adds support for new syntax.
4. UnicodeSets mode with flag <kbd>v</kbd> (an upgrade to <kbd>u</kbd>) incompatibly changes escaping rules within character classes, fixes case-insensitive matching for `\p` and `\P` within negated `[^…]`, and adds support for new features/syntax.
</details>

Additionally, JavaScript regex syntax is hard to write and even harder to read and refactor. But it doesn't have to be that way! With a few key features — raw multiline strings, insignificant whitespace, comments, subroutines, definition groups, interpolation, and *named capture only* mode — even long and complex regexes can be beautiful, grammatical, and easy to understand.

`regex` adds all of these features and returns native `RegExp` instances. It always uses flag <kbd>v</kbd> (already a best practice for new regexes) so you never forget to turn it on and don't have to worry about the differences in other parsing modes (in environments without native <kbd>v</kbd>, flag <kbd>u</kbd> is automatically used instead while applying <kbd>v</kbd>'s escaping rules so your regexes are forward and backward compatible). It also supports atomic groups via `(?>…)` to help you improve the performance of your regexes and avoid catastrophic backtracking. And it gives you best-in-class, context-aware interpolation of `RegExp` instances, escaped strings, and partial patterns.

## 🦾 Extended regex syntax

Historically, JavaScript regexes were not as powerful or readable as other major regex flavors like Java, .NET, PCRE, Perl, Python, and Ruby. With recent advancements and the `regex` library, those days are over. Modern JavaScript regexes have [significantly improved](https://github.com/slevithan/awesome-regex#javascript-regex-evolution) (adding lookbehind, named capture, Unicode properties, character class subtraction and intersection, etc.). The `regex` library, with its extended syntax and implicit flags, adds the key remaining pieces needed to stand alongside or surpass other major flavors.

### Atomic groups

[Atomic groups](https://www.regular-expressions.info/atomic.html), written as `(?>…)`, automatically throw away all backtracking positions remembered by any tokens inside the group. They're most commonly used to improve performance, and are a much needed feature that `regex` brings to native JavaScript regular expressions.

Example:

```js
regex`^(?>\w+\s?)+$`
```

This matches strings that contain word characters separated by spaces, with the final space being optional. Thanks to the atomic group, it instantly fails to find a match if given a long list of words that end with something not allowed, like `'A target string that takes a long time or can even hang your browser!'`.

Try running this without the atomic group (as `/^(?:\w+\s?)+$/`) and, due to the exponential backtracking triggered by the many ways to divide the work of the inner and outer `+` quantifiers, it will either take a *very* long time, hang your browser/server, or throw an internal error after a delay. This is called *[catastrophic backtracking](https://www.regular-expressions.info/catastrophic.html)* or *[ReDoS](https://en.wikipedia.org/wiki/ReDoS)*, and it has taken down major services like [Cloudflare](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019) and [Stack Overflow](https://stackstatus.tumblr.com/post/147710624694/outage-postmortem-july-20-2016). `regex` and atomic groups to the rescue!

> [!NOTE]
> Atomic groups are based on the JavaScript [proposal](https://github.com/tc39/proposal-regexp-atomic-operators) for them as well as support in many other regex flavors.

### Subroutines

Subroutines are written as `\g<name>` (where *name* refers to a named group), and they treat the referenced group as an independent subpattern that they try to match at the current position. This enables subpattern composition and reuse, which improves readability and maintainability.

The following example illustrates how subroutines and backreferences differ:

```js
// A backreference with \k<name>
regex`(?<prefix>sens|respons)e\ and\ \k<prefix>ibility`
/* Matches:
- 'sense and sensibility'
- 'response and responsibility' */

// A subroutine with \g<name>
regex`(?<prefix>sens|respons)e\ and\ \g<prefix>ibility`
/* Matches:
- 'sense and sensibility'
- 'sense and responsibility'
- 'response and sensibility'
- 'response and responsibility' */
```

Subroutines go beyond the composition benefits of [interpolation](#-interpolation). Apart from the obvious difference that they don't require variables to be defined outside of the regex, they also don't simply insert the referenced subpattern.

1. They can reference groups that themselves contain subroutines, chained to any depth.
2. Any capturing groups that are set during the subroutine call revert to their previous values afterwards.
3. They don't create named captures that are visible outside of the subroutine, so using subroutines doesn't lead to "duplicate capture group name" errors.

To illustrate points 2 and 3, consider:

```js
regex`
  (?<double> (?<char>.)\k<char>)
  \g<double>
  \k<double>
`
```

The backreference `\k<double>` matches whatever was matched by capturing group `(?<double>…)`, regardless of what was matched in between by the subroutine `\g<double>`. For example, this regex matches `'xx!!xx'`, but not `'xx!!!!'`.

<details>
  <summary>👉 <b>Show more details</b></summary>

- Subroutines can appear before the groups they reference.
- If there are [duplicate capture names](https://github.com/tc39/proposal-duplicate-named-capturing-groups), subroutines refer to the first instance of the given group (matching the behavior of PCRE and Perl).
- Although subroutines can be chained to any depth, a descriptive error is thrown if they're used recursively. Support for recursion can be added via an extension (see [*Recursion*](#recursion)).
- Like backreferences, subroutines can't be used *within* character classes.
- As with all extended syntax in `regex`, subroutines are applied after interpolation, giving them maximal flexibility.
</details>

<details>
  <summary>👉 <b>Show how to define subpatterns for use by reference only</b></summary>

The following regex matches an IPv4 address such as "192.168.12.123":

```js
const ipv4 = regex`
  \b \g<byte> (\.\g<byte>){3} \b

  # Define the 'byte' subpattern
  (?<byte> 2[0-4]\d | 25[0-5] | 1\d\d | [1-9]?\d ){0}
`;
```

Above, the `{0}` quantifier at the end of the `(?<byte>…)` group allows *defining* the group without *matching* it at that position. The subpattern within it can then be used by reference elsewhere within the pattern.

This next regex matches a record with multiple date fields, and captures each value:

```js
const record = regex`
  ^ Admitted:\ (?<admitted> \g<date>) \n
    Released:\ (?<released> \g<date>) $

  # Define subpatterns
  ( (?<date>  \g<year>-\g<month>-\g<day>)
    (?<year>  \d{4})
    (?<month> \d{2})
    (?<day>   \d{2})
  ){0}
`;
```

Here, the `{0}` quantifier at the end once again prevents matching its group at that position, while enabling all of the named groups within it to be used by reference.

When using a regex to find matches (e.g. via the string `matchAll` method), named groups defined this way appear on each match's `groups` object, with the value `undefined` (which is the value for any capturing group that didn't participate in a match). See the next section [*Subroutine definition groups*](#subroutine-definition-groups) for a way to prevent such groups from appearing on the `groups` object.
</details>

> [!NOTE]
> Subroutines are based on the feature in PCRE and Perl. PCRE allows several syntax options including `\g<name>`, whereas Perl uses `(?&name)`. Ruby also supports subroutines (and uses the `\g<name>` syntax), but it has behavior differences that make its subroutines not always act as independent subpatterns.

### Subroutine definition groups

The syntax `(?(DEFINE)…)` can be used at the end of a regex to define subpatterns for use by reference only. When combined with [subroutines](#subroutines), this enables writing regexes in a grammatical way that can significantly improve readability and maintainability.

> Named groups defined within subroutine definition groups don't appear on the `groups` object of matches.

Example:

```js
const re = regex`
  ^ Admitted:\ (?<admitted> \g<date>) \n
    Released:\ (?<released> \g<date>) $

  (?(DEFINE)
    (?<date>  \g<year>-\g<month>-\g<day>)
    (?<year>  \d{4})
    (?<month> \d{2})
    (?<day>   \d{2})
  )
`;

const record = 'Admitted: 2024-01-01\nReleased: 2024-01-03';
const match = re.exec(record); // Same as `record.match(re)`
console.log(match.groups);
/* → {
  admitted: '2024-01-01',
  released: '2024-01-03'
} */
```

> [!NOTE]
> Subroutine definition groups are based on the feature in PCRE and Perl. However, `regex` supports a stricter version since it limits their placement, quantity, and the top-level syntax that can be used within them.

<details>
  <summary>👉 <b>Show more details</b></summary>

- **Quantity:** Only one definition group is allowed per regex, but it can contain any number of named groups (and those groups can appear in any order).
- **Placement:** Apart from trailing whitespace and comments (allowed by implicit flag <kbd>x</kbd>), definition groups must appear at the end of their pattern.
- **Contents:** At the top level of definition groups, only named groups, whitespace, and comments are allowed.
- **Duplicate names:** All named groups within definition groups must use unique names.
- **Casing:** The word `DEFINE` must appear in uppercase.
</details>

### Recursion

You can use the `regex` extension package [regex-recursion](https://github.com/slevithan/regex-recursion) to match recursive patterns via `(?R)` and `\g<name>`, up to a specified max depth.

## 🚩 Flags

Flags are added like this:

```js
regex('gm')`^.+`
```

`RegExp` instances interpolated into the pattern preserve their own flags locally (see [*Interpolating regexes*](#interpolating-regexes)).

### Implicit flags

Flag <kbd>v</kbd> and emulated flags <kbd>x</kbd> and <kbd>n</kbd> are always on when using `regex`, giving your regexes a modern baseline syntax and avoiding the need to continually opt-in to their superior modes.

> For special situations such as when using `regex` within other tools, implicit flags can be disabled. See: [*Options*](#-options).

### Flag `v`

JavaScript's native flag <kbd>v</kbd> gives you the best level of Unicode support, strict errors, and all the latest regex features like character class set operations and properties of strings (see [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets)). It's always on when using `regex`, which helps avoid numerous Unicode-related bugs, and means there's only one way to parse a regex instead of [four](#-context) (so you only need to remember one set of regex syntax and behavior).

Flag <kbd>v</kbd> is applied to the full pattern after interpolation happens.

> In environments without native support for flag <kbd>v</kbd>, flag <kbd>u</kbd> is automatically used instead while applying <kbd>v</kbd>'s escaping rules so your regexes are forward and backward compatible.

### Flag `x`

Emulated flag <kbd>x</kbd> makes whitespace insignificant and adds support for line comments (starting with `#`), allowing you to freely format your regexes for readability. It's always implicitly on, though it doesn't extend into interpolated `RegExp` instances (to avoid changing their meaning).

Example:

```js
const re = regex`
  # Match a date in YYYY-MM-DD format
  (?<year>  \d{4} ) - # Year part
  (?<month> \d{2} ) - # Month part
  (?<day>   \d{2} )   # Day part

  # Escape whitespace and hashes to match them literally
  \    # space char
  \x20 # space char
  \#   # hash char
  \s   # any whitespace char

  # Since embedded strings are always matched literally, you can also match
  # whitespace by embedding it as a string
  ${' '}+

  # Patterns are directly embedded, so they use free spacing
  ${pattern`\d + | [a - z]`}

  # Interpolated regexes use their own flags, so they preserve their whitespace
  ${/^Hakuna matata$/m}
`;
```

> [!NOTE]
> Flag <kbd>x</kbd> is based on the JavaScript [proposal](https://github.com/tc39/proposal-regexp-x-mode) for it as well as support in many other regex flavors. Note that the rules for whitespace *within character classes* are inconsistent across regex flavors, so `regex` follows the JavaScript proposal and the flag <kbd>xx</kbd> option from Perl and PCRE.

<details>
  <summary>👉 <b>Show more details</b></summary>

- Within a character class, `#` is not a special character. It matches a literal `#` and doesn't start a comment. Additionally, the only insignificant whitespace characters within character classes are <kbd>space</kbd> and <kbd>tab</kbd>.
- Outside of character classes, insignificant whitespace includes all Unicode characters matched natively by `\s`.
- Whitespace and comments still separate tokens, so they aren't *ignored*. This is important with e.g. `\0 1`, which matches a null character followed by a literal `1`, rather than throwing as the invalid token `\01` would. Conversely, things like `\x 0A` and `(? :` are errors because the whitespace splits a valid node into incomplete parts.
- Quantifiers that follow whitespace or comments apply to the preceeding token, so `x +` is equivalent to `x+`.
- Whitespace is not insignificant within most enclosed tokens like `\p{…}` and `\u{…}`. The exception is `[\q{…}]`.
- Line comments with `#` do not extend into or beyond interpolation, so interpolation effectively acts as a terminating newline for the comment.
</details>

### Flag `n`

Emulated flag <kbd>n</kbd> gives you *named capture only* mode, which prevents the grouping metacharacters `(…)` from capturing. It's always implicitly on, though it doesn't extend into interpolated `RegExp` instances (to avoid changing their meaning).

Requiring the syntactically clumsy `(?:…)` where you could just use `(…)` hurts readability and encourages adding unneeded captures (which hurt efficiency and refactoring). Flag <kbd>n</kbd> fixes this, making your regexes more readable.

Example:

```js
// Doesn't capture
regex`\b(ab|cd)\b`
// Use standard (?<name>…) to capture as `name`
```

> [!NOTE]
> Flag <kbd>n</kbd> is based on .NET, C++, PCRE, Perl, and XRegExp, which share the <kbd>n</kbd> flag letter but call it *explicit capture*, *no auto capture*, or *nosubs*. In `regex`, the implicit flag <kbd>n</kbd> also prevents using numbered backreferences to refer to named groups in the outer regex, which follows the behavior of C++ (Ruby also always prevents this, despite not having flag <kbd>n</kbd>). Referring to named groups by number is a footgun, and the way that named groups are numbered is inconsistent across regex flavors.

> Aside: Flag <kbd>n</kbd>'s behavior also enables `regex` to emulate atomic groups, subroutines, and recursion.

## 🧩 Interpolation

### Interpolating regexes

The meaning of flags (or their absense) on interpolated regexes is preserved. For example, with flag <kbd>i</kbd> (`ignoreCase`):

```js
regex`hello-${/world/i}`
// Matches 'hello-WORLD' but not 'HELLO-WORLD'

regex('i')`hello-${/world/}`
// Matches 'HELLO-world' but not 'HELLO-WORLD'
```

This is also true for other flags that can change how an inner regex is matched: `m` (`multiline`) and `s` (`dotAll`).

> As with all interpolation in `regex`, embedded regexes are sandboxed and treated as complete units. For example, a following quantifier repeats the entire embedded regex rather than just its last token, and top-level alternation in the embedded regex will not break out to affect the meaning of the outer regex. Numbered backreferences are adjusted to work within the overall pattern.

<details>
  <summary>👉 <b>Show more details</b></summary>

- Regexes can't be interpolated inside character classes (so `` regex`[${/./}]` `` is an error) because the syntax context doesn't match. See [*Interpolating partial patterns*](#interpolating-partial-patterns) for a way to safely embed regex syntax (rather than `RegExp` instances) in character classes and other edge-case locations with different context.
- To change the flags used by an interpolated regex, use the built-in capability of `RegExp` to copy a regex while providing new flags. E.g. `new RegExp(/./, 's')`.
</details>

### Interpolating escaped strings

`regex` escapes special characters in interpolated strings (and values coerced to strings). This escaping is done in a context-aware and safe way that prevents changing the meaning or error status of characters outside the interpolated string.

> As with all interpolation in `regex`, escaped strings are sandboxed and treated as complete units. For example, a following quantifier repeats the entire escaped string rather than just its last character. And if interpolating into a character class, the escaped string is treated as a flag-<kbd>v</kbd>-mode nested union if it contains more than one character node.

As a result, `regex` is a safe and context-aware alternative to JavaScript proposal [`RegExp.escape`](https://github.com/tc39/proposal-regex-escaping).

```js
// Instead of
RegExp.escape(str)
// You can say
regex`${str}`.source

// Instead of
new RegExp(`^(?:${RegExp.escape(str)})+$`)
// You can say
regex`^${str}+$`

// Instead of
new RegExp(`[a-${RegExp.escape(str)}]`, 'u') // Flag u/v required to avoid bugs
// You can say
regex`[a-${str}]`
// Given the context at the end of a range, throws if more than one char in str

// Instead of
new RegExp(`[\\w--[${RegExp.escape(str)}]]`, 'v')
// You can say
regex`[\w--${str}]`
```

Some examples of where context awareness comes into play:

- A `~` is not escaped at the top level, but it must be escaped within character classes in case it's immediately followed by another `~` (in or outside of the interpolation) which would turn it into a reserved UnicodeSets double punctuator.
- Leading digits must be escaped if they're preceded by a numbered backreference or `\0`, else `RegExp` throws (or in Unicode-unaware mode they might turn into octal escapes).
- Letters `A`-`Z` and `a`-`z` must be escaped if preceded by uncompleted token `\c`, else they'll convert what should be an error into a valid token that probably doesn't match what you expect.
- You can't escape your way out of protecting against a preceding unescaped `\`. Doing nothing could turn e.g. `w` into `\w` and introduce a bug, but then escaping the first character wouldn't prevent the `\` from mangling it, and if you escaped the preceding `\` elsewhere in your code you'd change its meaning.

These and other issues (including the effects of current and potential future flags like <kbd>x</kbd>) make escaping without context unsafe to use at arbitrary positions in a regex, or at least complicated to get right. The existing popular regex escaping libraries don't even attempt to handle these kinds of issues.

`regex` solves all of this via context awareness. So instead of remembering anything above, you should just switch to always safely escaping regex syntax via `regex`.

### Interpolating partial patterns

As an alternative to interpolating `RegExp` instances, you might sometimes want to interpolate partial regex patterns as strings. Some example use cases:

- Composing a dynamic number of strings.
- Adding a pattern inside a character class (not allowed for `RegExp` instances since their top-level syntax context doesn't match).
- Dynamically adding backreferences without their corresponding captures (which wouldn't be valid as a standalone `RegExp`).
- When you don't want the pattern to specify its own, local flags.

For all of these cases, you can interpolate `pattern(str)` to avoid escaping special characters in the string or creating an intermediary `RegExp` instance. You can also use `` pattern`…` `` as a tag, as shorthand for ``pattern(String.raw`…`)``.

Apart from edge cases, `pattern` just embeds the provided string or other value directly. But because it handles the edge cases, patterns can safely be interpolated anywhere in a regex without worrying about their meaning being changed by (or making unintended changes in meaning to) the surrounding pattern.

> As with all interpolation in `regex`, patterns are sandboxed and treated as complete units. This is relevant e.g. if a pattern is followed by a quantifier, if it contains top-level alternation, or if it's bordered by a character class range, subtraction, or intersection operator.

If you want to understand the handling of interpolated patterns more deeply, let's look at some edge cases…

<details>
  <summary>👉 <b>Show me some edge cases</b></summary>

First, let's consider:

```js
regex`[${pattern`^`}]`
regex`[a${pattern`^`}]`
```

Although `[^…]` is a negated character class, `^` ***within*** a class doesn't need to be escaped, even with the strict escaping rules of flags <kbd>u</kbd> and <kbd>v</kbd>.

Both of these examples therefore match a literal `^`. They don't change the meaning of the surrounding character class. However, note that the `^` is not simply escaped. `` pattern`^^` `` embedded in character class context would still correctly lead to an "invalid set operation" error due to the use of a reserved double-punctuator.

> If you wanted to dynamically choose whether to negate a character class, you could put the whole character class inside the pattern.

Moving on, the following lines all throw because otherwise the embedded patterns would break out of their interpolation sandboxes and change the meaning of surrounding syntax:

```js
regex`(${pattern(')')})`
regex`[${pattern(']')}]`
regex`[${pattern('a\\')}]]`
```

But these are fine since they don't break out:

```js
regex`(${pattern('()')})`
regex`[\w--${pattern('[_]')}]`
regex`[${pattern('\\\\')}]`
```

Patterns can be embedded within any token scope:

```js
// Not using `pattern` for values that are not escaped anyway, but the behavior
// would be the same if you did
regex`.{1,${6}}`
regex`\p{${'Letter'}}`
regex`\u{${'000A'}}`
regex`(?<${'name'}>…)\k<${'name'}>`
regex`[a-${'z'}]`
regex`[\w--${'_'}]`
```

But again, changing the meaning or error status of characters outside the interpolation is an error:

```js
// Not using `pattern` for values that are not escaped anyway
/* 1.*/ regex`\u${'000A'}`
/* 2.*/ regex`\u{${pattern`A}`}`
/* 3.*/ regex`(${pattern`?:`}…)`
```

These last examples are all errors due to the corresponding reasons below:

1. This is an uncompleted `\u` token (which is an error) followed by the tokens `0`, `0`, `0`, `A`. That's because the interpolation doesn't happen within an enclosed `\u{…}` context.
2. The unescaped `}` within the interpolated pattern is not allowed to break out of its sandbox.
3. The group opening `(` can't be quantified with `?`.

> Characters outside the interpolation such as a preceding, unescaped `\` or an escaped number also can't change the meaning of tokens inside the embedded pattern.

And since interpolated values are handled as complete units, consider the following:

```js
// This works fine
regex`[\0-${pattern`\cZ`}]`

// But this is an error since you can't create a range from 'a' to the set 'de'
regex`[a-${'de'}]`
// It's the same as if you tried to use /[a-[de]]/v

// Instead, use either of
regex`[a-${'d'}${'e'}]`
regex`[a-${'d'}e]`
// These are equivalent to /[a-de]/ or /[[a-d][e]]/v
```
</details>

<details>
  <summary>👉 <b>Show an example of composing a dynamic number of strings</b></summary>

```js
// Instead of
new RegExp(`^(?:${
  arr.map(RegExp.escape).join('|')
})$`)

// You can say
regex`^${pattern(
  arr.map(a => regex`${a}`.source).join('|')
)}$`

// And you could add your own sugar that returns a `pattern` value
regex`^${anyOfEscaped(arr)}$`

// You could do the same thing without `pattern` by calling `regex` as a
// function instead of using it with backticks, then assembling the arguments
// list dynamically and holding your nose
regex({raw: ['^(', ...Array(arr.length - 1).fill('|'), ')$']}, ...arr)
```
</details>

> Implementation note: `pattern` returns an object with a custom `toString` that simply returns `String(value)`.

### Interpolation principles

The above descriptions of interpolation might feel complex. But there are three simple rules that guide the behavior in all cases:

1. Interpolation never changes the meaning or error status of characters outside of the interpolation, and vice versa.
2. Interpolated values are always aware of the context of where they're embedded.
3. When relevant, interpolated values are always treated as complete units.

> Examples where rule #3 is relevant: With following quantifiers, if they contain top-level alternation or unnamed backreferences, or if they're placed in a character class range or set operation.

### Interpolation contexts

<table>
  <tr>
    <th>Context</th>
    <th>Example</th>
    <th>String / coerced</th>
    <th>Pattern</th>
    <th>RegExp</th>
  </tr>
  <tr>
    <td>Default<br><br><br></td>
    <td><code>regex`${'^.+'}`</code><br><br><br></td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br> •&nbsp;Escaped <br><br></td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br><br><br></td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br> •&nbsp;Backrefs adjusted <br> •&nbsp;Flags localized</td>
  </tr>
  <tr>
    <td>Character class: <code>[…]</code>, <code>[^…]</code>, <code>[[…]]</code>, etc.</td>
    <td><code>regex`[${'a-z'}]`</code><br><br></td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br> •&nbsp;Escaped</td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br><br></td>
    <td><i>Error</i> <br><br><br></td>
  </tr>
  <tr>
    <td>Interval quantifier: <code>{…}</code></td>
    <td><code>regex`.{1,${5}}`</code></td>
    <td rowspan="3">•&nbsp;Sandboxed <br> •&nbsp;Escaped <br><br><br></td>
    <td rowspan="3">•&nbsp;Sandboxed <br><br><br><br></td>
    <td rowspan="3"><i>Error</i> <br><br><br><br></td>
  </tr>
  <tr>
    <td>Enclosed token: <code>\p{…}</code>, <code>\P{…}</code>, <code>\u{…}</code>, <code>[\q{…}]</code></td>
    <td><code>regex`\u{${'A0'}}`</code></td>
  </tr>
  <tr>
    <td>Group name: <code>(?<…>)</code>, <code>\k<…></code>, <code>\g<…></code></td>
    <td><code>regex`…\k<${'a'}>`</code></td>
  </tr>
</table>

- *Atomized* means that the value is treated as a complete unit; it isn't related to the *atomic groups* feature. Example: In default context, `${x}*` matches any number of the value specified by `x`, and not just its last token. In character class context, subtraction and intersection operators apply to the entire atom.
- *Sandboxed* means that the value can't change the meaning or error status of characters outside of the interpolation, and vice versa.
- Character classes have a sub-context on the borders of ranges. Only one character node (e.g. `a` or `\u0061`) can be interpolated at these positions.

> The implementation details vary for how `regex` accomplishes sandboxing and atomization, based on the details of the specific pattern. But the concepts should always hold up.

## 🔩 Options

Typically, `regex` is used as follows:

```js
regex`…` // Without flags
regex('gi')`…` // With flags
```

However, several options are available that can be provided via an options object in place of the flags argument. These options aren't usually needed, and are primarily intended for use within other tools.

Following are the available options and their default values:

```js
regex({
  flags: '',
  subclass: false,
  plugins: [],
  unicodeSetsPlugin: <function>
  disable: {
    x: false,
    n: false,
    v: false,
    atomic: false,
    subroutines: false,
  },
  force: {
    v: false,
  },
})`…`;
```

<details>
  <summary>👉 <b>See details for each option</b></summary>

**`flags`** - For providing flags when using an options object.

**`subclass`** - When `true`, the resulting regex is constructed using a `RegExp` subclass that avoids edge case issues with numbered backreferences. Without subclassing, submatches referenced *by number* from outside of the regex (e.g. in replacement strings) might reference the wrong values, because `regex`'s emulation of extended syntax (atomic groups and subroutines) can add anonymous captures to generated regex source that might affect group numbering.

Context: `regex`'s implicit flag <kbd>n</kbd> (*named capture only* mode) means that all captures have names, so normally there's no need to reference submatches by number. In fact, flag <kbd>n</kbd> *prevents* you from doing so within the regex. And even in edge cases (such as when interpolating `RegExp` instances with numbered backreferences, or when flag <kbd>n</kbd> is explicitly disabled), any numbered backreferences within the regex are automatically adjusted to work correctly. However, issues can arise if you reference submatches by number (instead of their group names) from outside of the regex. Setting `subclass: true` resolves this, since the subclass knows about added "emulation groups" and automatically adjusts match results in all contexts.

> This option isn't enabled by default because it would prevent `regex`'s Babel plugin from emitting regex literals. It also has a small performance cost, and is rarely needed. The primary use case is tools that use `regex` internally with flag <kbd>n</kbd> disabled.

**`plugins`** - An array of functions. Plugins are called in order, after applying emulated flags and interpolation, but before the built-in plugins for extended syntax. This means that plugins can output extended syntax like atomic groups and subroutines. Plugins are expected to return an updated pattern string, and are called with two arguments:

1. The pattern, as processed so far by preceding plugins, etc.
2. An object with a `flags` property that includes the native (non-emulated) flags that will be used by the regex.

The final result after running all plugins is provided to the `RegExp` constructor.

> The tiny [regex-utilities](https://github.com/slevithan/regex-utilities) library is intended for use in plugins, and can make it easier to work with regex syntax.

**`unicodeSetsPlugin`** - A plugin function that's used when flag <kbd>v</kbd> isn't supported natively, or when implicit flag <kbd>v</kbd> is disabled. The default value is a built-in function that provides basic backward compatibility by applying flag <kbd>v</kbd>'s escaping rules and throwing on use of <kbd>v</kbd>-only syntax (nested character classes, set subtraction/intersection, etc.).

> `regex` is not primarily a backward compatibility library, so in order to remain lightweight, it doesn't transpile flag <kbd>v</kbd>'s new features out of the box. By replacing the default function, you can add backward compatible support for these features. See also: [*Compatibility*](#-compatibility).

> This plugin runs last, which means it's possible to wrap an existing library (e.g. [regexpu-core](https://github.com/mathiasbynens/regexpu-core), used by Babel to [transpile <kbd>v</kbd>](https://babel.dev/docs/babel-plugin-transform-unicode-sets-regex)), without the library needing to understand `regex`'s extended syntax.

**`disable`** - A set of options that can be individually disabled by setting their values to `true`.

- **`x`** - Disables implicit, emulated [flag <kbd>x</kbd>](#flag-x).
- **`n`** - Disables implicit, emulated [flag <kbd>n</kbd>](#flag-n). Note that, although it's safe to use anonymous captures and numbered backreferences within a regex when flag <kbd>n</kbd> is disabled, referencing submatches by number from *outside* a regex (e.g. in replacement strings) can result in incorrect values because extended syntax (atomic groups and subroutines) might add "emulation groups" to generated regex source. It's therefore recommended to enable option `subclass` when disabling `n`.
- **`v`** - Disables implicit [flag <kbd>v</kbd>](#flag-v) even when it's supported natively, resulting in flag <kbd>u</kbd> being added instead (in combination with the `unicodeSetsPlugin`).
- **`atomic`** - Prevents transpiling [atomic groups](#atomic-groups), resulting in a syntax error if they're used.
- **`subroutines`** - Prevents transpiling [subroutines](#subroutines) and [subroutine definition groups](#subroutine-definition-groups), resulting in a syntax error if they're used.

**`force`** - Options that, if set to `true`, override default settings (as well as options set on the `disable` object).

- **`v`** - Force the use of flag <kbd>v</kbd> even when it's not supported natively (resulting in an error).
</details>

## ⚡ Performance

`regex` transpiles its input to native `RegExp` instances. Therefore regexes created by `regex` perform equally as fast as native regular expressions. The use of `regex` can also be transpiled via a [Babel plugin](https://github.com/slevithan/babel-plugin-transform-regex), avoiding the tiny overhead of transpiling at runtime.

For regexes that rely on or have the potential to trigger heavy backtracking, you can dramatically improve beyond native performance via the [atomic groups](#atomic-groups) feature built into `regex`.

## 🪶 Compatibility

`regex` uses flag <kbd>v</kbd> (`unicodeSets`) when it's supported natively. Flag <kbd>v</kbd> is supported by 2023-era browsers ([compat table](https://caniuse.com/mdn-javascript_builtins_regexp_unicodesets)) and Node.js 20. When <kbd>v</kbd> isn't available, flag <kbd>u</kbd> is automatically used instead (while still enforcing <kbd>v</kbd>'s escaping rules), which extends support to Node.js 14 and 2020-era browsers (2017-era with a build step that transpiles private class fields, string `matchAll`, array `flatMap`, and the `??` and `?.` operators).

The following edge cases rely on modern JavaScript features:

- To ensure atomization, `regex` uses nested character classes (which require flag <kbd>v</kbd>) when interpolating more than one token at a time *inside character classes*. A descriptive error is thrown when this isn't supported, which you can avoid by not interpolating multi-token patterns or strings into character classes.
- Using an interpolated `RegExp` instance with a different value for flag <kbd>i</kbd> than its outer regex relies on [regex modifiers](https://github.com/tc39/proposal-regexp-modifiers), a bleeding-edge feature available in Chrome/Edge 125 and Opera 111. A descriptive error is thrown in environments without support, which you can avoid by aligning the use of flag <kbd>i</kbd> on inner and outer regexes. Local-only application of other flags doesn't rely on this feature.

## 🙋 FAQ

<details name="faq">
  <summary><b>How are you comparing regex flavors?</b></summary>

The claim that JavaScript with the `regex` library is among the best regex flavors is based on a holistic view. Following are some of the aspects considered:

1. **Performance:** An important aspect, but not the main one since mature regex implementations are generally pretty fast. JavaScript is strong on regex performance (at least considering V8's Irregexp engine and JavaScriptCore), but it uses a backtracking engine that is missing any syntax for backtracking control—a major limitation that makes ReDoS vulnerability more common. The `regex` library adds atomic groups to native JavaScript regexes, which is a solution to this problem and therefore can dramatically improve performance.
2. **Support for advanced features** that enable easily creating patterns for common or important use cases: Here, JavaScript stepped up its game with ES2018 and ES2024. JavaScript is now best in class for some features like lookbehind (with it's infinite-length support) and Unicode properties (with multicharacter "properties of strings", character class subtraction and intersection, and Script_Extensions). These features are either not supported or not as robust in many other flavors.
3. **Ability to write readable and maintainable patterns:** Here, native JavaScript has long been the worst of the major flavors, since it lacks the `x` (extended) flag that allows insignificant whitespace and comments. The `regex` library not only adds `x` and turns it on by default, but it additionally adds regex subroutines (matched only by PCRE and Perl, although some other flavors have inferior versions) which enable powerful subpattern composition and reuse. And it includes context-aware interpolation of `RegExp` instances, escaped strings, and partial patterns, all of which can also help with composition and readability.
</details>

<details name="faq">
  <summary><b>Can <code>regex</code> be called as a function instead of using it with backticks?</b></summary>

Yes, although you might not need to. If you want to use `regex` with dynamic input, you can interpolate a `pattern` call as the full expression. For example:

```js
import {regex, pattern} from 'regex';
const str = '…';
const re = regex('gi')`${pattern(str)}`;
```

If you prefer to call `regex` as a function (rather than using it as a template tag), that requires explicitly providing the raw template strings array, as follows:

```js
import {regex} from 'regex';
const str = '…';
const re = regex('gi')({raw: [str]});
```
</details>

<details name="faq">
  <summary><b>Why are flags added via <code>regex('g')`…`</code> rather than <code>regex`/…/g`</code>?</b></summary>

The alternative syntax isn't used because it has several disadvantages:

- It doesn't match the `RegExp` constructor's syntax.
- It doesn't match regex literal syntax either, since there are no multiline regex literals (and they're not planned for the future), plus regex literals don't allow unescaped `/` outside of character classes.
- Flags-up-front can be more readable, especially with long or multiline regexes that make flags easy to miss when they're at the end. And since some flags change the meaning of regex syntax, it can help to read them first.
- It would most likely be incompatible if a standardized regex template tag was added to the JavaScript language in the future. To date, TC39 discussions about a standardized tag for regexes have not favored the `` `/…/g` `` format.
</details>

## 🏷️ About

`regex` was partly inspired by [XRegExp](https://github.com/slevithan/xregexp)'s `.tag` and [regexp-make-js](https://github.com/mikesamuel/regexp-make-js). `regex`'s only dependency is the ultra-lightweight [regex-utilities](https://github.com/slevithan/regex-utilities), which was separated so it can be reused by `regex` plugins.

Crafted by Steven Levithan with ❤︎ for regular expressions and their enthusiasts.<br>
MIT License.
