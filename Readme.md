# Path-to-RegExp

> Turn a path string such as `/user/:name` into a regular expression.

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][build-image]][build-url]
[![Build coverage][coverage-image]][coverage-url]
[![License][license-image]][license-url]

## Installation

```
npm install path-to-regexp --save
```

## Usage

```js
const { pathToRegexp, match, parse, compile } = require("path-to-regexp");

// pathToRegexp(path, options?)
// match(path, options?)
// parse(path, options?)
// compile(path, options?)
```

### Path to regexp

The `pathToRegexp` function returns a regular expression with `keys` as a property. It accepts the following arguments:

- **path** A string.
- **options** _(optional)_
  - **sensitive** Regexp will be case sensitive. (default: `false`)
  - **trailing** Regexp allows an optional trailing delimiter to match. (default: `true`)
  - **end** Match to the end of the string. (default: `true`)
  - **start** Match from the beginning of the string. (default: `true`)
  - **loose** Allow the delimiter to be repeated an arbitrary number of times. (default: `true`)
  - **delimiter** The default delimiter for segments, e.g. `[^/]` for `:named` parameters. (default: `'/'`)
  - **encodePath** A function to encode strings before inserting into `RegExp`. (default: `x => x`, recommended: [`encodeurl`](https://github.com/pillarjs/encodeurl))

```js
const regexp = pathToRegexp("/foo/:bar");
// regexp = /^\/+foo(?:\/+([^\/]+?))(?:\/+)?$/i
// keys = [{ name: 'bar', prefix: '', suffix: '', pattern: '', modifier: '' }]
```

**Please note:** The `RegExp` returned by `path-to-regexp` is intended for ordered data (e.g. pathnames, hostnames). It can not handle arbitrarily ordered data (e.g. query strings, URL fragments, JSON, etc).

### Parameters

The path argument is used to define parameters and populate keys.

#### Named parameters

Named parameters are defined by prefixing a colon to the parameter name (`:foo`). Parameter names can use any valid unicode identifier characters (similar to JavaScript).

```js
const regexp = pathToRegexp("/:foo/:bar");
// keys = [{ name: 'foo', ... }, { name: 'bar', ... }]

regexp.exec("/test/route");
//=> [ '/test/route', 'test', 'route', index: 0 ]
```

##### Custom matching parameters

Parameters can have a custom regexp, which overrides the default match (`[^/]+`). For example, you can match digits or names in a path:

```js
const regexpNumbers = pathToRegexp("/icon-:foo(\\d+).png");
// keys = [{ name: 'foo', ... }]

regexpNumbers.exec("/icon-123.png");
//=> ['/icon-123.png', '123']

regexpNumbers.exec("/icon-abc.png");
//=> null

const regexpWord = pathToRegexp("/(user|u)");
// keys = [{ name: 0, ... }]

regexpWord.exec("/u");
//=> ['/u', 'u']

regexpWord.exec("/users");
//=> null
```

**Tip:** Backslashes need to be escaped with another backslash in JavaScript strings.

#### Unnamed parameters

It is possible to define a parameter without a name. The name will be numerically indexed:

```js
const regexp = pathToRegexp("/:foo/(.*)");
// keys = [{ name: 'foo', ... }, { name: '0', ... }]

regexp.exec("/test/route");
//=> [ '/test/route', 'test', 'route', index: 0 ]
```

##### Custom prefix and suffix

Parameters can be wrapped in `{}` to create custom prefixes or suffixes for your segment:

```js
const regexp = pathToRegexp("{/:attr1}?{-:attr2}?{-:attr3}?");

regexp.exec("/test");
// => ['/test', 'test', undefined, undefined]

regexp.exec("/test-test");
// => ['/test', 'test', 'test', undefined]
```

#### Modifiers

Modifiers are used after parameters with custom prefixes and suffixes (`{}`).

##### Optional

Parameters can be suffixed with a question mark (`?`) to make the parameter optional.

```js
const regexp = pathToRegexp("/:foo{/:bar}?");
// keys = [{ name: 'foo', ... }, { name: 'bar', prefix: '/', modifier: '?' }]

regexp.exec("/test");
//=> [ '/test', 'test', undefined, index: 0 ]

regexp.exec("/test/route");
//=> [ '/test/route', 'test', 'route', index: 0 ]
```

##### Zero or more

Parameters can be suffixed with an asterisk (`*`) to denote a zero or more parameter matches.

```js
const regexp = pathToRegexp("{/:foo}*");
// keys = [{ name: 'foo', prefix: '/', modifier: '*' }]

regexp.exec("/foo");
//=> [ '/foo', "foo", index: 0 ]

regexp.exec("/bar/baz");
//=> [ '/bar/baz', 'bar/baz', index: 0 ]
```

##### One or more

Parameters can be suffixed with a plus sign (`+`) to denote a one or more parameter matches.

```js
const regexp = pathToRegexp("{/:foo}+");
// keys = [{ name: 'foo', prefix: '/', modifier: '+' }]

regexp.exec("/");
//=> null

regexp.exec("/bar/baz");
//=> [ '/bar/baz', 'bar/baz', index: 0 ]
```

#### Wildcard

A wildcard can also be used. It is roughly equivalent to `(.*)`.

```js
const regexp = pathToRegexp("/*");
// keys = [{ name: '0', pattern: '[^\\/]*', separator: '/', modifier: '*' }]

regexp.exec("/");
//=> [ '/', '', index: 0 ]

regexp.exec("/bar/baz");
//=> [ '/bar/baz', 'bar/baz', index: 0 ]
```

### Match

The `match` function returns a function for transforming paths into parameters:

- **path** A string.
- **options** _(optional)_ The same options as `pathToRegexp`, plus:
  - **decode** Function for decoding strings for params, or `false` to disable entirely. (default: `decodeURIComponent`)

```js
// Make sure you consistently `decode` segments.
const fn = match("/user/:id", { decode: decodeURIComponent });

fn("/user/123"); //=> { path: '/user/123', index: 0, params: { id: '123' } }
fn("/invalid"); //=> false
fn("/user/caf%C3%A9"); //=> { path: '/user/caf%C3%A9', index: 0, params: { id: 'café' } }
```

**Note:** Setting `decode: false` disables the "splitting" behavior of repeated parameters, which is useful if you need the exactly matched parameter back.

### Compile ("Reverse" Path-To-RegExp)

The `compile` function will return a function for transforming parameters into a valid path:

- **path** A string.
- **options** _(optional)_ Similar to `pathToRegexp` (`delimiter`, `encodePath`, `sensitive`, and `loose`), plus:
  - **validate** When `false` the function can produce an invalid (unmatched) path. (default: `true`)
  - **encode** Function for encoding input strings for output into the path, or `false` to disable entirely. (default: `encodeURIComponent`)

```js
const toPath = compile("/user/:id");

toPath({ id: 123 }); //=> "/user/123"
toPath({ id: "café" }); //=> "/user/caf%C3%A9"
toPath({ id: ":/" }); //=> "/user/%3A%2F"

// When disabling `encode`, you need to make sure inputs are encoded correctly. No arrays are accepted.
const toPathRaw = compile("/user/:id", { encode: false });

toPathRaw({ id: "%3A%2F" }); //=> "/user/%3A%2F"
toPathRaw({ id: ":/" }); //=> "/user/:/", throws when `validate: false` is not set.

const toPathRepeated = compile("{/:segment}+");

toPathRepeated({ segment: ["foo"] }); //=> "/foo"
toPathRepeated({ segment: ["a", "b", "c"] }); //=> "/a/b/c"

const toPathRegexp = compile("/user/:id(\\d+)");

toPathRegexp({ id: "123" }); //=> "/user/123"
```

## Developers

- If you are rewriting paths with match and compiler, consider using `encode: false` and `decode: false` to keep raw paths passed around.
- To ensure matches work on paths containing characters usually encoded, consider using [encodeurl](https://github.com/pillarjs/encodeurl) for `encodePath`.
- If matches are intended to be exact, you need to set `loose: false`, `trailing: false`, and `sensitive: true`.

### Parse

A `parse` function is available and returns `TokenData`, the set of tokens and other metadata parsed from the input string. `TokenData` is can passed directly into `pathToRegexp`, `match`, and `compile`. It accepts only two options, `delimiter` and `encodePath`, which makes those options redundant in the above methods.

### Token Information

- `name` The name of the token
- `prefix` _(optional)_ The prefix string for the segment (e.g. `"/"`)
- `suffix` _(optional)_ The suffix string for the segment (e.g. `""`)
- `pattern` _(optional)_ The pattern defined to match this token
- `modifier` _(optional)_ The modifier character used for the segment (e.g. `?`)
- `separator` _(optional)_ The string used to separate repeated parameters

## Errors

An effort has been made to ensure ambiguous paths from previous releases throw an error. This means you might be seeing an error when things worked before.

### Unexpected `?`, `*`, or `+`

In previous major versions `/` and `.` were used as implicit prefixes of parameters. So `/:key?` was implicitly `{/:key}?`. For example:

- `/:key?` → `{/:key}?` or `/:key*` → `{/:key}*` or `/:key+` → `{/:key}+`
- `.:key?` → `{.:key}?` or `.:key*` → `{.:key}*` or `.:key+` → `{.:key}+`
- `:key?` → `{:key}?` or `:key*` → `{:key}*` or `:key+` → `{:key}+`

### Unexpected `!`, `@`, `,`, or `;`

These characters have been reserved for future use.

### Express <= 4.x

Path-To-RegExp breaks compatibility with Express <= `4.x` in the following ways:

- The only part of the string that is a regex is within `()`.
  - In Express.js 4.x, everything was passed as-is after a simple replacement, so you could write `/[a-z]+` to match `/test`.
- The `?` optional character must be used after `{}`.
- Some characters have new meaning or have been reserved (`{}?*+@!;`).
- The parameter name now supports all unicode identifier characters, previously it was only `[a-z0-9]`.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/path-to-regexp
[npm-url]: https://npmjs.org/package/path-to-regexp
[downloads-image]: https://img.shields.io/npm/dm/path-to-regexp
[downloads-url]: https://npmjs.org/package/path-to-regexp
[build-image]: https://img.shields.io/github/actions/workflow/status/pillarjs/path-to-regexp/ci.yml?branch=master
[build-url]: https://github.com/pillarjs/path-to-regexp/actions/workflows/ci.yml?query=branch%3Amaster
[coverage-image]: https://img.shields.io/codecov/c/gh/pillarjs/path-to-regexp
[coverage-url]: https://codecov.io/gh/pillarjs/path-to-regexp
[license-image]: http://img.shields.io/npm/l/path-to-regexp.svg?style=flat
[license-url]: LICENSE.md
