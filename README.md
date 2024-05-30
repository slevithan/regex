# `Regex.make` 0.1 <sup>(alpha)</sup>

`Regex.make` is a string template tag for dynamically creating regular expressions. It comes with advanced features and deep knowledge of regex context that helps you **write beautiful, easy to understand, native regexes with batteries and safety included**. It's lightweight, and supports all ES2024+ regex features.

## Features

- Raw string template tag, for dynamic regexes without unreadable escaped backslashes `\\\\`.
- Context-aware escaping of regex syntax.
- Context-aware interpolation of `RegExp` instances, partial patterns, and escaped strings.
- Interpolated `RegExp` instances locally preserve the meaning of their flags (or their absense).
- Implicit flag `v` (`unicodeSets` mode) is always on, giving you the best level of Unicode support.

**Coming in v1:**

> The documentation below assumes these features are available.

- "Free spacing and comments" mode is always on (implicit flag `x`).
- "No auto capture" mode is always on (implicit flag `n`).
- Numbered backreferences in interpolated regexes are adjusted to work within the overall pattern.

**Coming in v1.1+:**

- Subexpressions as subroutines: `\g<name>`.
- Definition blocks: `(?(DEFINE)…)`.
- Atomic groups: `(?>…)`. ReDoS begone!
- Recursion, up to a specified max depth: `(?R=N)`.

## Examples

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

## Why

Due to years of legacy and backward compatibility, regular expression syntax in JavaScript is a bit of a mess. There are four different sets of incompatible syntax and behavior rules that might apply to your regexes depending on the flags and features you use.<sup>[1]</sup> The differences are just plain hard to fully grok and can easily create subtle bugs.

> <sup>[1]: These are (1) Unicode-unaware (legacy) mode, (2) named capture mode (a set of different escaping rules that are triggered when a named capture appears anywhere in a regex), (3) Unicode mode with flag `u`, and (4) UnicodeSets mode with flag `v`. The differences in each of these modes go beyond adding new features.</sup>

Additionally, JavaScript regex syntax is hard to write and even harder to read and refactor. But it doesn't have to be that way! With a few key features — raw template strings, free spacing, comments, no auto capture, subexpressions as subroutines via `\g<name>`, definition blocks via `(?(DEFINE)…)`, and always using UnicodeSets mode (flag `v`) — even long and complex regexes can be beautiful, grammatical, and easy to understand.

`Regex.make` adds all of these features and outputs native `RegExp` instances. It additionally adds context-aware and safe interpolation (of regexes, escaped strings, and partial pattern strings), along with atomic groups via `(?>…)` and recursion via `(?R)` up to a specified max depth. Combine all this with modern (ES2024+) JavaScript regular expressions, and `Regex.make` lets you create powerful, readable, grammatical regexes like you might not have seen before.

## Flags

To specify flags:

```js
Regex.make('im')`^a`
```

Flags provided this way do not apply to inner, interpolated `RegExp` instances, which preserve their own flags (see section "Interpolating regexes").

`Regex.make` always uses flag `v` (ES2024's upgrade to flag `u`), so it can't be explicitly added or removed. It's applied after interpolation happens, so it applies to the full pattern. `Regex.make` also implicitly applies flags `x` (free spacing and comments) and `n` (no auto capture) to the outer regex. See the examples above for how regexes with these features look in practice.

> There's a flag `x` [proposal](https://github.com/tc39/proposal-regexp-x-mode) for JavaScript, and it's available in many other regex flavors. Flag `n` is available in .NET, Perl, and XRegExp, with an equivalent mode in PCRE, C++, and others. These flags will be supported on inner regexes should they ever be accepted into the JavaScript language. Note that the implicit flag `n` also disables numbered backreferences in the outer regex, since using them to reference named groups is a footgun (C++ also prevents numbered backreferences in its equivalent `nosubs` mode, and in other regex flavors the numbering of named groups is inconsistent).

### Can you disable implicit flags `v`, `x`, and `n`?

No. Since `Regex.make` is new and doesn't have to deal with legacy regular expressions, these flags are always on to encourage best practices, avoid footguns, and avoid needlessly forcing you to choose between parsing modes.

- Flag `v` gives you the best level of Unicode support, all the latest regex features, and strict errors. Being always on avoids many potential Unicode-related bugs and means there's only one way to parse a regex instead of four (not counting future `x`), so you only need to remember one set of regex syntax and behavior.
- Flag `x` gives you free spacing and comments. This improves readability and the ability to refactor regexes. Being always on encourages best practices and avoids forcing you to continually opt into the superior mode.
- Flag `n` turns off automatic capturing via `(…)` but keeps named capture. Requiring the noisy `(?:…)` where you could use `(…)` hurts readability and encourages adding unneeded captures (which hurt efficiency and refactoring). Flag `n` fixes this. And by encouraging more named groups, your regexes and the code using them become easier to read. Additionally, flag `n`'s behavior enables `Regex.make` to emulate atomic groups and recursion without unwanted side effects.

> Implicit flags `x` and `n`, like all other flags except `v`, are not applied to interpolated `RegExp` instances (which preserve their own flags). Of course, if you interpolate a `RegExp` instance created by `Regex.make`, its implicit flags will continue to apply.

## Interpolating regexes

The meaning of flags (or their absense) on interpolated regexes is preserved. For example, with flag `i` (`ignoreCase`):

```js
Regex.make`hello-${/world/i}`
// Matches 'hello-WORLD' but not 'HELLO-WORLD'

Regex.make('i')`hello-${/world/}`
// Matches 'HELLO-world' but not 'HELLO-WORLD'
```

This is also true for other flags that can change how an inner regex is matched: `m` (`multiline`) and `s` (`dotAll`).

Additionally:

- Interpolated regexes are always treated as atomic units. For example, a following quantifier will repeat the entire embedded regex rather than just the last token, and top-level alternation in the embedded regex will not break out to affect the meaning of the outer regex.
- Regexes can't be interpolated in the middle of a character class (so `` Regex.make`[${/./}]` `` is an error) because the syntax context doesn't match. See the section "Interpolating partial patterns" for a way to safely embed regex syntax (rather than `RegExp` instances) in character classes and other edge-case locations with different context.

## Interpolating escaped strings

`Regex.make` escapes special characters in interpolated strings (and values coerced to strings). This escaping is done in a context-aware and safe way that prevents changing the meaning or error status of characters outside the interpolated string.

> As with all interpolation in `Regex.make`, escaped strings are treated as atomic units. In other words, a following quantifier repeats the whole unit rather than just the last character. And if interpolating into a character class, the escaped string is treated as a nested union if it contains more than one character node.

As a result, `Regex.make` is a safe alternative to TC39 proposal [`RegExp.escape`](https://github.com/tc39/proposal-regex-escaping).

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
Regex.make`[a-${str}]` // Would be an error if str had more than one char

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

## Interpolating partial patterns

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

Although `[^…]` is a negated character class, `^` ***within*** a class doesn't need to be escaped, even with the strict escaping rules of flags `u` and `v`.

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

Interacting with the pattern outside the interpolation at any safe point based on the context is also fine:

```js
// Not using Regex.partial for values that are not escaped anyway, but the
// behavior would be the same if providing a partial
Regex.make`.{1,${6}}`
Regex.make`\p{${'Letter'}}`
Regex.make`\u{${'000A'}}`
Regex.make`(?<${'name'}>…)\k<${'name'}>`
Regex.make`[a-${'z'}]` // Would be an error if the str had more than one char
Regex.make`[\w--${'_'}]`
Regex.make`[\w${Regex.partial('--_')}]`
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

> Characters outside the interpolation such as a preceding, unescaped `\` or an escaped number also can't change the meaning of the interpolated pattern.

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

## Interpolation principles

The above descriptions of interpolation might feel complex. But there are three simple rules that guide the behavior in all cases:

1. Interpolation never changes the meaning or error status of characters outside of the interpolation, and vice versa.
2. Interpolated values are always aware of the context of where they're embedded.
3. When relevant, interpolated values are always treated as atomic units.

> Examples where rule #3 is relevant: With following quantifiers, if they contain top-level alternation, if they contain numbered backreferences (leading to renumbering), or if they're placed in a character class range or set operation. Also note that "atomic units" are unrelated to the "atomic groups" feature that controls backtracking in some regex flavors (and that is planned for future versions of `Regex.make`).

## Interpolation contexts

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
    <td>•&nbsp;Sandboxed <br> •&nbsp;Atomized <br> •&nbsp;Backrefs adjusted <br> •&nbsp;Own flags apply</td>
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

## Use

```js
import Regex from './src/index.js';

console.log(Regex.make`\w+`.test('Nice!'));
```

## Compatibility

`Regex.make` relies on `unicodeSets` (flag `v`), which has near-universal browser support since mid-2023 and is available in Node.js 20+. Using an interpolated `RegExp` instance with a different value for flag `i` than its outer regex currently relies on regex [modifiers](https://github.com/tc39/proposal-regexp-modifiers), a bleeding-edge feature available in Chrome and Edge 125+, and throws a descriptive error in environments without support. You can avoid this by aligning the use of flag `i` on inner and outer regexes. Local-only application of other flags does not rely on this feature.

## About

`Regex.make` was partly inspired by [regexp-make-js](https://github.com/mikesamuel/regexp-make-js) and [`XRegExp`](https://github.com/slevithan/xregexp)`.tag`. However, I wouldn't recommend using those libraries anymore since they have numerous problems with context awareness, safety, and correctness (in addition to lacking some of `Regex.make`'s advanced features and showing their age by not supporting the latest flags and features from modern JavaScript regular expressions).
