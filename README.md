# `Regex.make` 0.1 <sup>(alpha)</sup>

[<img align="left" src="https://github.com/slevithan/awesome-regex/raw/main/media/awesome-regex.svg" height="45">](https://github.com/slevithan/awesome-regex) <sub>Included in</sub><br>
<sup>[Awesome Regex](https://github.com/slevithan/awesome-regex)</sup>

`Regex.make` is a template tag for dynamically creating **modern, readable, native JavaScript regular expressions** for next-level parsing and pattern matching. It's lightweight, it supports all ES2024+ regex features, and it's unmatched in its robust support for context-aware interpolation of `RegExp` instances, escaped strings, and partial pattern strings.

## 📜 Contents

- [Features](#-features)
- [Context](#-context)
- [Examples](#-examples)
- [New regex syntax](#-new-regex-syntax)
- [Flags](#-flags)
  - [Implicit flags](#implicit-flags)
  - [Flag <kbd>v</kbd>](#flag-v)
  - [Flag <kbd>x</kbd>](#flag-x)
  - [Flag <kbd>n</kbd>](#flag-n)
- Interpolating
  - [`RegExp` instances](#interpolating-regexes)
  - [Escaped strings](#interpolating-escaped-strings)
  - [Partial patterns](#interpolating-partial-patterns)
  - [Interpolation principles](#interpolation-principles)
  - [Interpolation contexts](#interpolation-contexts)
- [Use](#️-use)
- [Compatibility](#-compatibility)
- [About](#️-about)

## 💎 Features

- Always-on flag <kbd>x</kbd> allows you to freely add space and comments to your regexes.
- Always-on flag <kbd>v</kbd> gives you the best level of Unicode support and extra features.
- No unreadable escaped backslashes `\\\\`, since it's a raw string template tag.
- Context-aware and safe interpolation of regexes, escaped strings, and partial patterns.
- Interpolated regexes locally preserve the meaning of their own flags (or their absense).

**Coming in v1:**

> The documentation below assumes these features are available.

- Always-on flag <kbd>n</kbd> (*no auto capture* mode) improves the readability and efficiency of your regexes.
- When interpolating regex instances, numbered backreferences within them are adjusted to work within the overall pattern.<!-- remove from the list when added -->

## ❓ Context

Due to years of legacy and backward compatibility, regular expression syntax in JavaScript is a bit of a mess. There are four different sets of incompatible syntax and behavior rules that might apply to your regexes depending on the flags and features you use. The differences are just plain hard to fully grok and can easily create subtle bugs.

<details>
  <summary>See the four parsing modes</summary>

1. Unicode-unaware (legacy) mode, which you get by default and which silently creates Unicode-related bugs.
2. Named capture mode, triggered when a named capture appears anywhere in a regex. It changes the meaning of `\k`, octal escapes, and escaped literal digits.
3. Unicode mode with flag <kbd>u</kbd>, which makes unreserved letter escapes an error, switches to code point based matching (changing the potential handling of the dot, negated shorthands like `\W`, character class ranges, and quantifiers), changes the behavior of case-insensitive matching, and adds new features/syntax.
4. UnicodeSets mode with flag <kbd>v</kbd>, which improves case-insensitive matching and changes escaping rules within character classes, in addition to adding new features/syntax.
</details>

Additionally, JavaScript regex syntax is hard to write and even harder to read and refactor. But it doesn't have to be that way! With a few key features — raw template strings, insignificant whitespace, comments, no auto capture, subexpressions as subroutines via `\g<name>`, definition blocks via `(?(DEFINE)…)`, and always using UnicodeSets mode (flag <kbd>v</kbd>) — even long and complex regexes can be beautiful, grammatical, and easy to understand.

`Regex.make` adds all of these features and returns native `RegExp` instances. It additionally adds context-aware and safe interpolation (of regexes, escaped strings, and partial pattern strings), along with atomic groups via `(?>…)` and recursion via `(?R)` up to a specified max depth. Combine all this with modern (ES2024+) JavaScript regular expressions, and `Regex.make` lets you create powerful, readable, grammatical regexes like you might not have seen before.

## 🪧 Examples

```js
const emoji = Regex.make`
  (?<emojiPart> \p{Emoji_Modifier_Base} \p{Emoji_Modifier}?
    | \p{Emoji_Presentation}
    | \p{Emoji} \uFE0F
  )
  # Unnamed (…) is non-capturing, and \g<name> is a subroutine,
  # not a backreference like \k<name>
  ( \u200D  \g<emojiPart> )*
  |
  # Regional indicator symbol letters are used for flags
  [🇦-🇿]{2}
`;

const interpolationExample = Regex.make('gm')`
  # The string is contextually escaped and repeated as an atomic unit
  ^ ${'a.b'}+ $
  |
  # Only the inner regex is case insensitive!
  # The outer regex's flag m is also not applied to it
  ${/^a.b$/i}
  |
  # This string is contextually sandboxed but not escaped
  ${Regex.partial('^a.b$')}
`;

const palindrome = Regex.make('i')`
  (?(DEFINE)
    (?<alpha> [a-z] )
  )

  (?<char> \g<alpha> )
  # Recursively match the regex up to max-depth 10
  ( (?R=10) | \g<alpha>? )
  \k<char>
`;
palindrome.test('Redivider'); // true
```

## 🦾 New regex syntax

**Coming in v1.1+:**

- Subexpressions as subroutines: `\g<name>`.
- Definition blocks: `(?(DEFINE)…)`.
- Atomic groups: `(?>…)`. ReDoS begone!
- Recursion, up to a specified max depth: `(?R=N)`.

<!-- Additionally, `Regex.make` adds flags <kbd>x</kbd> and <kbd>n</kbd> that are always implicitly enabled (see the section [*Implicit flags*](#implicit-flags)). -->

## 🚩 Flags

Flags are added like this:

```js
Regex.make('gm')`^.+`
```

`RegExp` instances interpolated into the regex pattern preserve their own flags locally (see the section [*Interpolating regexes*](#interpolating-regexes)).

## Implicit flags

- Flag <kbd>v</kbd> is always on, providing upgraded Unicode support, new regex features, and strict errors. It's applied to the full pattern after interpolation happens.
- Implicit flags <kbd>x</kbd> and <kbd>n</kbd> are also always applied, though they don't extend into interpolated `RegExp` instances (to avoid changing their meaning). Flag <kbd>x</kbd> makes whitespace insignificant and lets you add comments. Flag <kbd>n</kbd> is *no auto capture* mode.

These flags are always on, giving you a modern, baseline regex syntax and avoiding the continual need to opt into their superior modes.

<details>
  <summary>⚠️ Debugging</summary>

> For debugging purposes, you can disable flags <kbd>x</kbd> and <kbd>n</kbd> via experimental options:<br> `` Regex.make({__flag_x: false, __flag_n: false})`…` ``.
</details>

### Flag `v`

Flag <kbd>v</kbd> gives you the best level of Unicode support, strict errors, and all the latest, fancy regex features like character class set operators and properties of strings. It's always on, which helps avoid numerous potential Unicode-related bugs, and means there's only one way to parse a regex instead of four (so you only need to remember one set of regex syntax and behavior).

### Flag `x`

Flag <kbd>x</kbd> adds support for line comments (starting with `#`) and makes whitespace insignificant, allowing you to freely format your regexes for readability. It's always implicitly on.

Example:

```js
const date = Regex.make`
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
  ${Regex.partial('( \d+ | [a - z] )')}

  # Interpolated regexes use their own flags so they preserve their whitespace
  ${/^Hakuna matata$/m}
`;
```

> Flag <kbd>x</kbd> is based on the JavaScript [proposal](https://github.com/tc39/proposal-regexp-x-mode) for it as well as support in many other regex flavors. Note that the rules for whitespace *within character classes* are inconsistent across regex flavors, so `Regex.make` follows the JavaScript proposal and the flag <kbd>xx</kbd> option from PCRE and Perl.

<details>
  <summary>👉 <b>Show more details</b></summary>

- Within a character class, `#` is not a special character. It matches a literal `#` and doesn't start a comment. Additionally, the only insignificant whitespace characters within character classes are <kbd>space</kbd> and <kbd>tab</kbd>.
- Outside of character classes, insignificant whitespace includes all Unicode characters matched natively by `\s`.
- Whitespace and comments still separate tokens, so they aren't *ignored*. This is important with something like `\0 1`, which matches a null character followed by a literal `1`, rather than throwing as the invalid token `\01` would. Conversely, things like `\x 0A` and `(? :` are errors because the whitespace splits a valid node into incomplete parts.
- Quantifiers that follow whitespace or comments apply to the preceeding token, so `x +` is equivalent to `x+`.
- Whitespace is not insignificant within most enclosed tokens like `\p{…}` and `\u{…}`. The exception is `[\q{…}]`.
- Line comments with `#` do not extend into or beyond interpolation, so interpolation effectively acts as a terminating newline for the comment.
</details>

### Flag `n`

Flag <kbd>n</kbd> gives you *no auto capture* mode, which turns `(…)` into a non-capturing group but preserves named capture. It's always implicitly on.

Motivation: Requiring the syntactically clumsy `(?:…)` where you could just use `(…)` hurts readability and encourages adding unneeded captures (which hurt efficiency and refactoring). Flag <kbd>n</kbd> fixes this, making your regexes more readable.

> Flag <kbd>n</kbd> is based on .NET, C++, PCRE, Perl, and XRegExp, which share the `n` flag letter but call it *explicit capture*, *no auto capture*, or *nosubs*. In `Regex.make`, the implicit flag <kbd>n</kbd> also disables numbered backreferences to named groups in the outer regex, which follows C++. Referring to named groups by number is a footgun, and the way named groups are numbered is inconsistent across regex flavors.

> Aside: Flag <kbd>n</kbd>'s behavior also enables `Regex.make` to emulate atomic groups and recursion.

## 🧩 Interpolation

### Interpolating regexes

The meaning of flags (or their absense) on interpolated regexes is preserved. For example, with flag <kbd>i</kbd> (`ignoreCase`):

```js
Regex.make`hello-${/world/i}`
// Matches 'hello-WORLD' but not 'HELLO-WORLD'

Regex.make('i')`hello-${/world/}`
// Matches 'HELLO-world' but not 'HELLO-WORLD'
```

This is also true for other flags that can change how an inner regex is matched: `m` (`multiline`) and `s` (`dotAll`).

Additionally:

- Interpolated regexes are always treated as atomic units. For example, a following quantifier will repeat the entire embedded regex rather than just the last token, and top-level alternation in the embedded regex will not break out to affect the meaning of the outer regex.
- Regexes can't be interpolated in the middle of a character class (so `` Regex.make`[${/./}]` `` is an error) because the syntax context doesn't match. See the section [*Interpolating partial patterns*](#interpolating-partial-patterns) for a way to safely embed regex syntax (rather than `RegExp` instances) in character classes and other edge-case locations with different context.

### Interpolating escaped strings

`Regex.make` escapes special characters in interpolated strings (and values coerced to strings). This escaping is done in a context-aware and safe way that prevents changing the meaning or error status of characters outside the interpolated string.

> As with all interpolation in `Regex.make`, escaped strings are treated as atomic units. In other words, a following quantifier repeats the whole unit rather than just the last character. And if interpolating into a character class, the escaped string is treated as a <kbd>v</kbd>-mode nested union if it contains more than one character node.

As a result, `Regex.make` is a safe and context-aware alternative to JavaScript proposal [`RegExp.escape`](https://github.com/tc39/proposal-regex-escaping).

```js
// Instead of
RegExp.escape(str)
// You can say
Regex.make`${str}`.source

// Instead of
new RegExp(`^(?:${RegExp.escape(str)})+$`)
// You can say
Regex.make`^${str}+$`

// Instead of
new RegExp(`[a-${RegExp.escape(str)}]`, 'u')
// You can say
Regex.make`[a-${str}]`
// Given the context on the end of a range, throws if more than one char in str

// Instead of
new RegExp(`[\\w--[${RegExp.escape(str)}]]`, 'v')
// You can say
Regex.make`[\w--${str}]`
```

Some examples of where context awareness comes into play:

- A `~` is not escaped at the top level, but it must be escaped within character classes in case it's immediately followed by another `~` (in or outside of the interpolation) which would turn it into a reserved UnicodeSets double punctuator.
- Leading digits must be escaped if they're preceded by a numbered backreference or `\0`, else `RegExp` throws (or in Unicode-unaware mode they might turn into octal escapes).
- Letters `A`-`Z` and `a`-`z` must be escaped if preceded by uncompleted token `\c`, else they'll convert what should be an error into a valid token that probably doesn't match what you expect.
- You can't escape your way out of protecting against a preceding unescaped `\`. Doing nothing could turn e.g. `w` into `\w` and introduce a bug, but then escaping the first character (e.g. with a hex code) wouldn't prevent the `\` from mangling it, and if you escaped the preceding `\` elsewhere in your code you'd change its meaning.

These and other issues (including the effects of current and future flags like `x`) make escaping without context unsafe to use at arbitrary positions in a regex, or at least complicated to get right. The existing popular regex escaping libraries are all pretty bad at giving you something you can use reliably.

`Regex.make` solves this via context awareness. So instead of remembering anything above, you should just switch to always safely escaping regex syntax via `Regex.make`.

### Interpolating partial patterns

As an alternative to interpolating `RegExp` instances, you might sometimes want to interpolate partial regex patterns as strings. Some example cases:

- Composing a dynamic number of strings.
- Adding a pattern in the middle of a character class (not allowed for `RegExp` instances since their top-level syntax context doesn't match).
- Adding backreferences without their corresponding captures (which wouldn't be valid as a standalone `RegExp`).
- When you don't want the pattern to specify its own flags.

For all of these cases, you can interpolate `Regex.partial(value)` to avoid escaping special characters in the string or creating an intermediary `RegExp` instance. You can also use `` Regex.partial`…` `` as a tag, equivalent to ``Regex.partial(String.raw`…`)``.

Apart from edge cases, `Regex.partial` just embeds the provided string or other value directly. But because it handles the edge cases, partial patterns can safely be interpolated anywhere in a regex without worrying about their meaning being changed by (or making unintended changes in meaning to) the surrounding pattern.

> As with all interpolation in `Regex.make`, partial patterns are treated as atomic units. This is relevant e.g. if a partial is followed by a quantifier, if it contains top-level alternation, or if it's bordered by a character class range or set operator.

If you want to understand the handling of partial patterns more deeply, let's look at some edge cases…

<details>
  <summary>👉 <b>Show me some edge cases</b></summary>

First, let's consider:

```js
Regex.make`[${Regex.partial('^')}]`
Regex.make`[a${Regex.partial('^')}]`
```

Although `[^…]` is a negated character class, `^` ***within*** a class doesn't need to be escaped, even with the strict escaping rules of flags <kbd>u</kbd> and <kbd>v</kbd>.

Both of these examples therefore match a literal `^`. They don't change the meaning of the surrounding character class. However, note that the `^` is not escaped. `Regex.partial('^^')` embedded in character class context would still correctly lead to a double-punctuator error.

> What if you wanted to dynamically choose whether to negate a character class? Well then! Put the whole character class inside the partial.

Moving on, the following lines all throw because otherwise the partial patterns would break out of their interpolation sandboxes and change the meaning of the surrounding patterns:

```js
Regex.make`(${Regex.partial(')')})`
Regex.make`[${Regex.partial(']')}]`
Regex.make`[${Regex.partial('a\\')}]]`
```

But these are fine since they don't break out:

```js
Regex.make`(${Regex.partial('()')})`
Regex.make`[\w--${Regex.partial('[_]')}]`
Regex.make`[${Regex.partial('\\\\')}]`
```

Partials can be embedded within any token scope:

```js
// Not using Regex.partial for values that are not escaped anyway, but the
// behavior would be the same if providing a partial
Regex.make`.{1,${6}}`
Regex.make`\p{${'Letter'}}`
Regex.make`\u{${'000A'}}`
Regex.make`(?<${'name'}>…)\k<${'name'}>`
Regex.make`[a-${'z'}]`
Regex.make`[\w--${'_'}]`
```

But again, changing the meaning or error status of characters outside the interpolation is an error:

```js
// Not using Regex.partial for values that are not escaped anyway
/* 1.*/ Regex.make`\u${'000A'}`
/* 2.*/ Regex.make`\u{${Regex.partial('A}')}`
/* 3.*/ Regex.make`(${Regex.partial('?:')}…)`
```

These last examples are all errors due to the corresponding reasons below:

1. This is an uncompleted `\u` token (which is an error) followed by the tokens `0`, `0`, `0`, `A`. That's because the interpolation does not happen within an enclosed `\u{…}` context.
2. The unescaped `}` within the partial is not allowed to break out of its interpolation sandbox.
3. The group opening `(` can't be quantified with `?`.

> Characters outside the interpolation such as a preceding, unescaped `\` or an escaped number also can't change the meaning of tokens inside the partial.

And since interpolated values are handled as atomic units, consider the following:

```js
// This works fine
Regex.make`[\0-${Regex.partial('\\cZ')}]`

// But this is an error since you can't create a range from 'a' to the set 'de'
Regex.make`[a-${'de'}]`
// It's the same as if you tried to use /[a-[de]]/v

// Instead, use either of
Regex.make`[a-${'d'}${'e'}]`
Regex.make`[a-${'d'}e]`
// These are equivalent to /[a-de]/ or /[[a-d][e]]/v
```
</details>

<details>
  <summary>👉 <b>Show an example of composing a dynamic number of strings</b></summary>

```js
// Instead of
new RegExp(`^(?:${arr.map(RegExp.escape).join('|')})$`)

// You can say
Regex.make`^${Regex.partial(
  arr.map(a => Regex.make`${a}`.source).join('|')
)}$`

// And you could add your own sugar that returns a partial
Regex.make`^${anyOfEscaped(arr)}$`

// You could do the same thing without Regex.partial by calling Regex.make as a
// function instead of using it with backticks, then assembling the arguments
// list dynamically and holding your nose
Regex.make({raw: ['^(', ...Array(arr.length - 1).fill('|'), ')$']}, ...arr)
```
</details>

### Interpolation principles

The above descriptions of interpolation might feel complex. But there are three simple rules that guide the behavior in all cases:

1. Interpolation never changes the meaning or error status of characters outside of the interpolation, and vice versa.
2. Interpolated values are always aware of the context of where they're embedded.
3. When relevant, interpolated values are always treated as atomic units.

> Examples where rule #3 is relevant: With following quantifiers, if they contain top-level alternation, if they contain numbered backreferences (leading to renumbering), or if they're placed in a character class range or set operation. Also note that "atomic units" are unrelated to the "atomic groups" feature that controls backtracking in some regex flavors (and that is planned for future versions of `Regex.make`).

### Interpolation contexts

> `Regex.make` is shortened below as `make` to better fit the table.

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
    <td><code>make`${'^.+'}`</code><br><br><br></td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br> •&nbsp;Escaped <br><br></td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br><br><br></td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br> •&nbsp;Backrefs adjusted <br> •&nbsp;Own flags apply locally</td>
  </tr>
  <tr>
    <td>Character class: <code>[…]</code>, <code>[^…]</code>, <code>[…[…]]</code>, etc.</td>
    <td><code>make`[${'a-z'}]`</code><br><br></td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br> •&nbsp;Escaped</td>
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br><br></td>
    <td><i>Error</i> <br><br><br></td>
  </tr>
  <tr>
    <td>Interval quantifier: <code>{…}</code></td>
    <td><code>make`.{1,${5}}`</code></td>
    <td rowspan="3">•&nbsp;Sandboxed <br> •&nbsp;Escaped <br><br><br></td>
    <td rowspan="3">•&nbsp;Sandboxed <br><br><br><br></td>
    <td rowspan="3"><i>Error</i> <br><br><br><br></td>
  </tr>
  <tr>
    <td>Enclosed token: <code>\p{…}</code>, <code>\P{…}</code>, <code>\u{…}</code>, <code>[\q{…}]</code></td>
    <td><code>make`\u{${'A0'}}`</code></td>
  </tr>
  <tr>
    <td>Group name: <code>(?<…>)</code>, <code>\k<…></code>
    </td>
    <td><code>make`…\k<${'a'}>`</code></td>
  </tr>
</table>

> *Atomized* means that e.g., in default context, `${x}*` matches any number of the pattern specified by `x`, and not just the last character in the pattern. In character class context, set operators (union, subtraction, intersection) apply to the entire atom.

> The implementation details for how `Regex.make` accomplishes concepts like *sandboxing* and *atomization* can vary given the details of a specific pattern, but the concepts described here should always hold up.

## 🕹️ Use

```js
import Regex from './src/index.js';
// Or: import { make, partial } from './src/index.js';

Regex.make`^\p{L}+$`.test('こんにちは');
```

In browsers:

```html
<script src="./dist/regex-make.min.js"></script>
<script>
  Regex.make`^\p{L}+$`.test('Здраво');
</script>
```

## 🪶 Compatibility

- `Regex.make` relies on `unicodeSets` (flag <kbd>v</kbd>), which has had near-universal browser support since mid-2023 and is available in Node.js 20+.
- Using an interpolated `RegExp` instance with a different value for flag <kbd>i</kbd> than its outer regex currently relies on [regex modifiers](https://github.com/tc39/proposal-regexp-modifiers), a bleeding-edge feature available in Chrome and Edge 125+. A descriptive error is thrown in environments without support, which you can avoid by aligning the use of flag <kbd>i</kbd> on inner and outer regexes. Local-only application of other flags does not rely on this feature.
- If you want `Regex.make` to use a `RegExp` subclass or other constructor, you can do so by modifying `this`: `` Regex.make.bind(RegExpSubclass)`…` ``.

## 🏷️ About

`Regex.make` was partly inspired by and significantly improves upon [`XRegExp`](https://github.com/slevithan/xregexp)`.tag` and [regexp-make-js](https://github.com/mikesamuel/regexp-make-js).

Crafted with ❤︎ by Steven Levithan.<br>
MIT License.
