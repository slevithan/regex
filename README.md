<a href="https://github.com/slevithan/regex#readme"><img src="https://github.com/slevithan/regex/raw/main/regex-logo.svg" height="130" alt="regex logo"></a>

`regex` creates **readable, high performance, *native* JavaScript regular expressions** with advanced features and best practices built-in. It's lightweight (6.5 KB minified and brotlied) and supports all ES2024+ regex functionality.

Highlights include support for free spacing and comments, atomic groups via `(?>…)` which can help you avoid [ReDoS](https://en.wikipedia.org/wiki/ReDoS), subroutines via `\g<name>` which enable powerful composition, and context-aware interpolation of `RegExp` instances, escaped strings, and partial patterns.

With the `regex` package, JavaScript steps up as one of the very best regex flavors.

<details>
  <summary><b>Table of contents</b></summary>

- [Features](#-features)
- [Examples](#-examples)
- [Install and use](#️-install-and-use)
- [Context](#-context)
- [New regex syntax](#-new-regex-syntax)
  - [Atomic groups](#atomic-groups)
  - [Subroutines](#subroutines)
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
- [Performance](#-performance)
- [Compatibility](#-compatibility)
</details>

## 💎 Features

- **A modern regex baseline** so you don't need to continually opt-in to best practices.
  - Always-on flag <kbd>v</kbd> gives you the best level of Unicode support and strict errors. In environments without <kbd>v</kbd>, it uses flag <kbd>u</kbd> with <kbd>v</kbd>'s rules applied.
  - Always-on implicit flag <kbd>x</kbd> allows you to freely add whitespace and comments to your regexes.
  - Always-on implicit flag <kbd>n</kbd> (*named capture only* mode) improves regex readability and efficiency.
  - No unreadable escaped backslashes `\\\\` since it's a raw string template tag.
- **New regex syntax**.
  - Atomic groups via `(?>…)` can dramatically improve performance and prevent ReDoS.
  - Subroutines via `\g<name>` enable powerful composition, improving readability and maintainability.
  - Recursive matching is enabled by an extension.
- **Context-aware and safe interpolation** of regexes, strings, and partial patterns.
  - Interpolated strings have their special characters escaped.
  - Interpolated regexes locally preserve the meaning of their own flags (or their absense), and any numbered backreferences are adjusted to work within the overall pattern.

## 🪧 Examples

```js
import {regex, partial} from 'regex';

// Subroutines
const record = regex('gm')`^
  Born: (?<date> \d{4}-\d{2}-\d{2} ) \n
  Admitted: \g<date> \n
  Released: \g<date>
$`;

// Atomic groups; avoid ReDoS from the nested, overlapping quantifier
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
  ${partial('^ a.b $')}
`;

// Adjusts backreferences in interpolated regexes
regex`^ ${/(dog)\1/} ${/(cat)\1/} $`;
// → /^(dog)\1(cat)\2$/v
```

## 🕹️ Install and use

```sh
npm install regex
```

```js
import {regex, partial} from 'regex';
```

In browsers:

```html
<script src="https://cdn.jsdelivr.net/npm/regex/dist/regex.min.js"></script>
<script>
  const {regex, partial} = Regex;
</script>
```

## ❓ Context

Due to years of legacy and backward compatibility, regular expression syntax in JavaScript is a bit of a mess. There are four different sets of incompatible syntax and behavior rules that might apply to your regexes depending on the flags and features you use. The differences are just plain hard to fully grok and can easily create subtle bugs.

<details>
  <summary>See the four parsing modes</summary>

1. Unicode-unaware (legacy) mode is the default and can easily and silently create Unicode-related bugs.
2. Named capture mode changes the meaning of `\k` when a named capture appears anywhere in a regex.
3. Unicode mode with flag <kbd>u</kbd> adds strict errors (for unreserved letter escapes, octal escapes, escaped literal digits, and unescaped special characters in some contexts), switches to code-point-based matching (changing the potential handling of the dot, negated sets like `\W`, character class ranges, and quantifiers), changes the behavior of case-insensitive matching, and adds new features/syntax.
4. UnicodeSets mode with flag <kbd>v</kbd>, an upgrade to <kbd>u</kbd>, changes escaping rules within character classes, fixes case-insensitive matching for doubly-negated `[^\P{…}]`, and adds new features/syntax.
</details>

Additionally, JavaScript regex syntax is hard to write and even harder to read and refactor. But it doesn't have to be that way! With a few key features — raw multiline template strings, insignificant whitespace, comments, subroutines, interpolation, and *named capture only* mode — even long and complex regexes can be **beautiful, grammatical, and easy to understand**.

`regex` adds all of these features and returns native `RegExp` instances. It always uses flag <kbd>v</kbd> (already a best practice for new regexes) so you never forget to turn it on and don't have to worry about the differences in other parsing modes (and in environments without native flag <kbd>v</kbd>, it enforces <kbd>v</kbd>'s rules so your regexes are forward compatible). It supports atomic groups via `(?>…)` to help you improve the performance of your regexes and avoid catastrophic backtracking. And it gives you best-in-class, context-aware interpolation of `RegExp` instances, escaped strings, and partial patterns.

## 🦾 New regex syntax

Historically, JavaScript regexes were not as powerful as other major regex flavors like PCRE, Perl, .NET, Java, Ruby, and Python. With recent advancements and the `regex` package, those days are over. Modern JavaScript regexes have [significantly improved](https://github.com/slevithan/awesome-regex#javascript-regex-evolution) (adding lookbehind, named capture, Unicode properties, character class subtraction and intersection, etc.). The `regex` package, with its extended syntax and flags, adds the remaining pieces needed to compete with or surpass other major flavors.

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
/* Matches: - 'sense and sensibility'
            - 'response and responsibility' */

// A subroutine with \g<name>
regex`(?<prefix>sens|respons)e\ and\ \g<prefix>ibility`
/* Matches: - 'sense and sensibility'
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
regex`(?<double> (?<char>.) \k<char> ) \g<double> \k<double>`
// The backreference \k<double> matches whatever was matched by capturing group
// `double`, regardless of what was matched by the subroutine. For example, the
// regex matches 'xx!!xx' but not 'xx!!!!'
```

You can also define subpatterns for use by reference only:

```js
// Matches an IPv4 address such as '192.168.12.123'
regex`\b \g<byte> (\.\g<byte>){3} \b

  # The {0} quantifier allows defining a subpattern without matching it
  (?<byte> 2[0-4]\d | 25[0-5] | 1\d\d | [1-9]?\d ){0}
`

// Matches a record with several date fields
regex`
  ^ Name:\   (?<name>.*) \n
  Born:\     \g<date>    \n
  Admitted:\ \g<date>    \n
  Released:\ \g<date>    $

  # Define subpatterns
  ( (?<date>  \g<year>-\g<month>-\g<day>)
    (?<year>  \d{4})
    (?<month> \d{2})
    (?<day>   \d{2})
  ){0}
`
```

> [!NOTE]
> Subroutines are based on the feature in PCRE and Perl. PCRE allows several syntax options including `\g<name>`, whereas Perl uses `(?&name)`. Ruby also supports subroutines (and uses the `\g<name>` syntax), but it has behavior differences that make its subroutines not always act as independent subpatterns.

<details>
  <summary>👉 <b>Show more details</b></summary>

- Subroutines can appear before the groups they reference, as shown in examples above.
- If there are [duplicate capture names](https://github.com/tc39/proposal-duplicate-named-capturing-groups), subroutines refer to the first instance of the given group (matching the behavior of PCRE and Perl).
- Although subroutines can be chained to any depth, a descriptive error is thrown if they're used recursively. Support for recursion can be added via an extension (see the next section).
- As with all new syntax in `regex`, subroutines are applied after interpolation, giving them maximal flexibility.
</details>

### Recursion

You can use the `regex` extension package [`regex-recursion`](https://github.com/slevithan/regex-recursion) to match recursive patterns via `(?R)` and `\g<name>`, up to a specified max depth.

## 🚩 Flags

Flags are added like this:

```js
regex('gm')`^.+`
```

`RegExp` instances interpolated into the pattern preserve their own flags locally (see [*Interpolating regexes*](#interpolating-regexes)).

### Implicit flags

Flag <kbd>v</kbd> and emulated flags <kbd>x</kbd> and <kbd>n</kbd> are always on when using `regex`, giving your regexes a modern baseline syntax and avoiding the need to continually opt-in to their superior modes.

<details>
  <summary>🐜 Debugging</summary>

For debugging purposes, you can disable implicit flags via experimental options:<br> `` regex({__flagX: false, __flagN: false, __flagV: false})`…` ``.
</details>

### Flag `v`

JavaScript's native flag <kbd>v</kbd> gives you the best level of Unicode support, strict errors, and all the latest regex features like character class set operations and properties of strings (see [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/unicodeSets)). It's always on when using `regex`, which helps avoid numerous Unicode-related bugs, and means there's only one way to parse a regex instead of [four](#-context) (so you only need to remember one set of regex syntax and behavior).

Flag <kbd>v</kbd> is applied to the full pattern after interpolation happens.

> In environments without native support for flag <kbd>v</kbd>, flag <kbd>u</kbd> is automatically used as a fallback and flag <kbd>v</kbd>'s rules are enforced so your regexes are forward compatible.

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

  # Partials are directly embedded, so they use free spacing
  ${partial`\d + | [a - z]`}

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
> Flag <kbd>n</kbd> is based on .NET, C++, PCRE, Perl, and XRegExp, which share the <kbd>n</kbd> flag letter but call it *explicit capture*, *no auto capture*, or *nosubs*. In `regex`, the implicit flag <kbd>n</kbd> also prevents using numbered backreferences to refer to named groups in the outer regex, which follows the behavior of C++ (Ruby also prevents this even without flag <kbd>n</kbd>). Referring to named groups by number is a footgun, and the way that named groups are numbered is inconsistent across regex flavors.

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
- To change the flags used by an interpolated regex, use the built-in capability of `RegExp` to copy a regex while providing new flags. Ex: `new RegExp(/./, 's')`.
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

These and other issues (including the effects of current and [future](https://github.com/tc39/proposal-regexp-x-mode) flags like `x`) make escaping without context unsafe to use at arbitrary positions in a regex, or at least complicated to get right. The existing popular regex escaping libraries don't even attempt to handle these kinds of issues.

`regex` solves all of this via context awareness. So instead of remembering anything above, you should just switch to always safely escaping regex syntax via `regex`.

### Interpolating partial patterns

As an alternative to interpolating `RegExp` instances, you might sometimes want to interpolate partial regex patterns as strings. Some example use cases:

- Composing a dynamic number of strings.
- Adding a pattern inside a character class (not allowed for `RegExp` instances since their top-level syntax context doesn't match).
- Dynamically adding backreferences without their corresponding captures (which wouldn't be valid as a standalone `RegExp`).
- When you don't want the pattern to specify its own, local flags.

For all of these cases, you can interpolate `partial(str)` to avoid escaping special characters in the string or creating an intermediary `RegExp` instance. You can also use `` partial`…` `` as a tag, as shorthand for ``partial(String.raw`…`)``.

Apart from edge cases, `partial` just embeds the provided string or other value directly. But because it handles the edge cases, partial patterns can safely be interpolated anywhere in a regex without worrying about their meaning being changed by (or making unintended changes in meaning to) the surrounding pattern.

> As with all interpolation in `regex`, partials are sandboxed and treated as complete units. This is relevant e.g. if a partial is followed by a quantifier, if it contains top-level alternation, or if it's bordered by a character class range or set operator.

If you want to understand the handling of partial patterns more deeply, let's look at some edge cases…

<details>
  <summary>👉 <b>Show me some edge cases</b></summary>

First, let's consider:

```js
regex`[${partial`^`}]`
regex`[a${partial`^`}]`
```

Although `[^…]` is a negated character class, `^` ***within*** a class doesn't need to be escaped, even with the strict escaping rules of flags <kbd>u</kbd> and <kbd>v</kbd>.

Both of these examples therefore match a literal `^`. They don't change the meaning of the surrounding character class. However, note that the `^` is not simply escaped. `` partial`^^` `` embedded in character class context would still correctly lead to an "invalid set operation" error due to the use of a reserved double-punctuator.

> If you wanted to dynamically choose whether to negate a character class, you could put the whole character class inside the partial.

Moving on, the following lines all throw because otherwise the partial patterns would break out of their interpolation sandboxes and change the meaning of their surrounding patterns:

```js
regex`(${partial(')')})`
regex`[${partial(']')}]`
regex`[${partial('a\\')}]]`
```

But these are fine since they don't break out:

```js
regex`(${partial('()')})`
regex`[\w--${partial('[_]')}]`
regex`[${partial('\\\\')}]`
```

Partials can be embedded within any token scope:

```js
// Not using `partial` for values that are not escaped anyway, but the behavior
// would be the same if providing a partial
regex`.{1,${6}}`
regex`\p{${'Letter'}}`
regex`\u{${'000A'}}`
regex`(?<${'name'}>…)\k<${'name'}>`
regex`[a-${'z'}]`
regex`[\w--${'_'}]`
```

But again, changing the meaning or error status of characters outside the interpolation is an error:

```js
// Not using `partial` for values that are not escaped anyway
/* 1.*/ regex`\u${'000A'}`
/* 2.*/ regex`\u{${partial`A}`}`
/* 3.*/ regex`(${partial`?:`}…)`
```

These last examples are all errors due to the corresponding reasons below:

1. This is an uncompleted `\u` token (which is an error) followed by the tokens `0`, `0`, `0`, `A`. That's because the interpolation doesn't happen within an enclosed `\u{…}` context.
2. The unescaped `}` within the partial is not allowed to break out of its interpolation sandbox.
3. The group opening `(` can't be quantified with `?`.

> Characters outside the interpolation such as a preceding, unescaped `\` or an escaped number also can't change the meaning of tokens inside the partial.

And since interpolated values are handled as complete units, consider the following:

```js
// This works fine
regex`[\0-${partial`\cZ`}]`

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
new RegExp(`^(?:${arr.map(RegExp.escape).join('|')})$`)

// You can say
regex`^${partial(
  arr.map(a => regex`${a}`.source).join('|')
)}$`

// And you could add your own sugar that returns a partial
regex`^${anyOfEscaped(arr)}$`

// You could do the same thing without `partial` by calling `regex` as a
// function instead of using it with backticks, then assembling the arguments
// list dynamically and holding your nose
regex({raw: ['^(', ...Array(arr.length - 1).fill('|'), ')$']}, ...arr)
```
</details>

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
    <th>Partial pattern</th>
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

- *Atomized* means that that something is treated as a complete unit; it isn't related to the *atomic groups* feature. Example: In default context, `${x}*` matches any number of the value specified by `x`, and not just its last token. In character class context, set operators (union, subtraction, intersection) apply to the entire atom.
- *Sandboxed* means that the value can't change the meaning or error status of characters outside of the interpolation, and vice versa.
- Character classes have a sub-context on the borders of ranges, explained in [*Interpolating partial patterns*](#interpolating-partial-patterns). Only one character node (ex: `a` or `\u0061`) can be interpolated at these positions.

> The implementation details vary for how `regex` accomplishes sandboxing and atomization, based on the details of the specific pattern. But the concepts should always hold up.

## ⚡ Performance

`regex` transpiles its input to native `RegExp` instances. Therefore regexes built with `regex` perform just as fast as native regular expressions.

For regexes that rely on or have the potential to trigger heavy backtracking, you can dramatically improve beyond native performance via the [atomic groups](#atomic-groups) feature built into `regex`.

## 🪶 Compatibility

If you want `regex` to use a `RegExp` subclass or other constructor, you can do so by modifying `this`: `` regex.bind(RegExpSubclass)`…` ``.

Following are edge cases that rely on modern JavaScript features:

- `regex` uses flag <kbd>v</kbd> (`unicodeSets`), which has had universal browser support since ~mid-2023 ([compat table](https://caniuse.com/mdn-javascript_builtins_regexp_unicodesets)) and is available in Node.js 20+. In environments without native flag <kbd>v</kbd>, flag <kbd>u</kbd> is automatically used as a fallback while enforcing <kbd>v</kbd>'s rules, which extends support backward to Node.js 12+ and old browsers.
  - Note that `regex` generates nested character classes (which require native flag <kbd>v</kbd>) when interpolating more than one token at a time *inside character classes*. A descriptive error is throw when this isn't supported, which you can avoid by not interpolating multi-token partials/strings into character classes.
- Using an interpolated `RegExp` instance with a different value for flag <kbd>i</kbd> than its outer regex relies on [regex modifiers](https://github.com/tc39/proposal-regexp-modifiers), a bleeding-edge feature available in Chrome, Edge, and Opera 125+. A descriptive error is thrown in environments without support, which you can avoid by aligning the use of flag <kbd>i</kbd> on inner and outer regexes. Local-only application of other flags doesn't rely on this feature.

## 🏷️ About

`regex` was partly inspired by [`XRegExp`](https://github.com/slevithan/xregexp)`.tag` and [regexp-make-js](https://github.com/mikesamuel/regexp-make-js). `regex`'s only dependency is the ultra-lightweight [`regex-utilities`](https://github.com/slevithan/regex-utilities), which was separated so it can be reused by `regex` extensions.

Crafted by Steven Levithan with ❤︎ for regular expressions and their enthusiasts.<br>
MIT License.
