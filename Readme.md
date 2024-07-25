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
const { match, compile, parse } = require("path-to-regexp");

// match(path, options?)
// compile(path, options?)
// parse(path, options?)
```

### Match

The `match` function returns a function for transforming paths into parameters:

- **path** A string.
- **options** _(optional)_ (See [parse](#parse) for more options)
  - **sensitive** Regexp will be case sensitive. (default: `false`)
  - **end** Validate the match reaches the end of the string. (default: `true`)
  - **decode** Function for decoding strings to params, or `false` to disable all processing. (default: `decodeURIComponent`)

```js
const fn = match("/foo/:bar");
```

**Please note:** `path-to-regexp` is intended for ordered data (e.g. pathnames, hostnames). It can not handle arbitrarily ordered data (e.g. query strings, URL fragments, JSON, etc).

### Parameters

Parameters match arbitrary strings in a path by matching up to the end of the segment, or up to any proceeding tokens.

#### Named parameters

Named parameters are defined by prefixing a colon to the parameter name (`:foo`). Parameter names can use any valid unicode identifier characters, similar to JavaScript.

```js
const fn = match("/:foo/:bar");

fn("/test/route");
//=> { path: '/test/route', params: { foo: 'test', bar: 'route' } }
```

##### Custom matching parameters

Parameters can have a custom regexp, which overrides the default match (`[^/]+`). For example, you can match digits or names in a path:

```js
const exampleNumbers = match("/icon-:foo(\\d+).png");

exampleNumbers("/icon-123.png");
//=> { path: '/icon-123.png', params: { foo: '123' } }

exampleNumbers("/icon-abc.png");
//=> false

const exampleWord = pathToRegexp("/(user|u)");

exampleWord("/u");
//=> { path: '/u', params: { '0': 'u' } }

exampleWord("/users");
//=> false
```

**Tip:** Backslashes need to be escaped with another backslash in JavaScript strings.

#### Unnamed parameters

It is possible to define a parameter without a name. The name will be numerically indexed:

```js
const fn = match("/:foo/(.*)");

fn("/test/route");
//=> { path: '/test/route', params: { '0': 'route', foo: 'test' } }
```

#### Custom prefix and suffix

Parameters can be wrapped in `{}` to create custom prefixes or suffixes for your segment:

```js
const fn = match("{/:attr1}?{-:attr2}?{-:attr3}?");

fn("/test");
//=> { path: '/test', params: { attr1: 'test' } }

fn("/test-test");
//=> { path: '/test-test', params: { attr1: 'test', attr2: 'test' } }
```

#### Modifiers

Modifiers are used after parameters with custom prefixes and suffixes (`{}`).

##### Optional

Parameters can be suffixed with a question mark (`?`) to make the parameter optional.

```js
const fn = match("/:foo{/:bar}?");

fn("/test");
//=> { path: '/test', params: { foo: 'test' } }

fn("/test/route");
//=> { path: '/test/route', params: { foo: 'test', bar: 'route' } }
```

##### Zero or more

Parameters can be suffixed with an asterisk (`*`) to denote a zero or more parameter matches.

```js
const fn = match("{/:foo}*");

fn("/foo");
//=> { path: '/foo', params: { foo: [ 'foo' ] } }

fn("/bar/baz");
//=> { path: '/bar/baz', params: { foo: [ 'bar', 'baz' ] } }
```

##### One or more

Parameters can be suffixed with a plus sign (`+`) to denote a one or more parameter matches.

```js
const fn = match("{/:foo}+");

fn("/");
//=> false

fn("/bar/baz");
//=> { path: '/bar/baz', params: { foo: [ 'bar', 'baz' ] } }
```

##### Custom separator

By default, parameters set the separator as the `prefix + suffix` of the token. Using `;` you can modify this:

```js
const fn = match("/name{/:parts;-}+");

fn("/name");
//=> false

fn("/bar/1-2-3");
//=> { path: '/name/1-2-3', params: { parts: [ '1', '2', '3' ] } }
```

#### Wildcard

A wildcard is also supported. It is roughly equivalent to `(.*)`.

```js
const fn = match("/*");

fn("/");
//=> { path: '/', params: {} }

fn("/bar/baz");
//=> { path: '/bar/baz', params: { '0': [ 'bar', 'baz' ] } }
```

### Compile ("Reverse" Path-To-RegExp)

The `compile` function will return a function for transforming parameters into a valid path:

- **path** A string.
- **options** (See [parse](#parse) for more options)
  - **sensitive** Regexp will be case sensitive. (default: `false`)
  - **validate** When `false` the function can produce an invalid (unmatched) path. (default: `true`)
  - **encode** Function for encoding input strings for output into the path, or `false` to disable entirely. (default: `encodeURIComponent`)

```js
const toPath = compile("/user/:id");

toPath({ id: "name" }); //=> "/user/name"
toPath({ id: "café" }); //=> "/user/caf%C3%A9"

// When disabling `encode`, you need to make sure inputs are encoded correctly. No arrays are accepted.
const toPathRaw = compile("/user/:id", { encode: false });

toPathRaw({ id: "%3A%2F" }); //=> "/user/%3A%2F"
toPathRaw({ id: ":/" }); //=> Throws, "/user/:/" when `validate` is `false`.

const toPathRepeated = compile("{/:segment}+");

toPathRepeated({ segment: ["foo"] }); //=> "/foo"
toPathRepeated({ segment: ["a", "b", "c"] }); //=> "/a/b/c"

const toPathRegexp = compile("/user/:id(\\d+)");

toPathRegexp({ id: "123" }); //=> "/user/123"
```

## Developers

- If you are rewriting paths with match and compile, consider using `encode: false` and `decode: false` to keep raw paths passed around.
- To ensure matches work on paths containing characters usually encoded, consider using [encodeurl](https://github.com/pillarjs/encodeurl) for `encodePath`.

### Parse

The `parse` function accepts a string and returns `TokenData`, the set of tokens and other metadata parsed from the input string. `TokenData` is can used with `$match` and `$compile`.

- **path** A string.
- **options** _(optional)_
  - **delimiter** The default delimiter for segments, e.g. `[^/]` for `:named` parameters. (default: `'/'`)
  - **encodePath** A function for encoding input strings. (default: `x => x`, recommended: [`encodeurl`](https://github.com/pillarjs/encodeurl) for unicode encoding)

### Tokens

The `tokens` returned by `TokenData` is an array of strings or keys, represented as objects, with the following properties:

- `name` The name of the token
- `prefix` _(optional)_ The prefix string for the segment (e.g. `"/"`)
- `suffix` _(optional)_ The suffix string for the segment (e.g. `""`)
- `pattern` _(optional)_ The pattern defined to match this token
- `modifier` _(optional)_ The modifier character used for the segment (e.g. `?`)
- `separator` _(optional)_ The string used to separate repeated parameters

### Custom path

In some applications, you may not be able to use the `path-to-regexp` syntax, but still want to use this library for `match` and `compile`. For example:

```js
import { TokenData, match } from "path-to-regexp";

const tokens = ["/", { name: "foo" }];
const path = new TokenData(tokens, "/");
const fn = $match(path);

fn("/test"); //=> { path: '/test', index: 0, params: { foo: 'test' } }
```

## Errors

An effort has been made to ensure ambiguous paths from previous releases throw an error. This means you might be seeing an error when things worked before.

### Unexpected `?`, `*`, or `+`

In previous major versions `/` and `.` were used as implicit prefixes of parameters. So `/:key?` was implicitly `{/:key}?`. For example:

- `/:key?` → `{/:key}?` or `/:key*` → `{/:key}*` or `/:key+` → `{/:key}+`
- `.:key?` → `{.:key}?` or `.:key*` → `{.:key}*` or `.:key+` → `{.:key}+`
- `:key?` → `{:key}?` or `:key*` → `{:key}*` or `:key+` → `{:key}+`

### Unexpected `;`

Used as a [custom separator](#custom-separator) for repeated parameters.

### Unexpected `!`, `@`, or `,`

These characters have been reserved for future use.

### Missing separator

Repeated parameters must have a separator to be valid. For example, `{:foo}*` can't be used. Separators can be defined manually, such as `{:foo;/}*`, or they default to the suffix and prefix with the parameter, such as `{/:foo}*`.

### Missing parameter name

Parameter names, the part after `:`, must be a valid JavaScript identifier. For example, it cannot start with a number or dash. If you want a parameter name that uses these characters you can wrap the name in quotes, e.g. `:"my-name"`.

### Unterminated quote

Parameter names can be wrapped in double quote characters, and this error means you forgot to close the quote character.

### Pattern cannot start with "?"

Parameters in `path-to-regexp` must be basic groups. However, you can use features that require the `?` nested within the pattern. For example, `:foo((?!login)[^/]+)` is valid, but `:foo(?!login)` is not.

### Capturing groups are not allowed

A parameter pattern can not contain nested capturing groups.

### Unbalanced or missing pattern

A parameter pattern must have the expected number of parentheses. An unbalanced amount, such as `((?!login)` implies something has been written that is invalid. Check you didn't forget any parentheses.

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
