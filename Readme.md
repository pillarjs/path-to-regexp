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

### Parameters

Parameters match arbitrary strings in a path by matching up to the end of the segment, or up to any proceeding tokens. They are defined by prefixing a colon to the parameter name (`:foo`). Parameter names can use any valid JavaScript identifier, or be double quoted to use other characters (`:"param-name"`).

```js
const fn = match("/:foo/:bar");

fn("/test/route");
//=> { path: '/test/route', params: { foo: 'test', bar: 'route' } }
```

### Wildcard

Wildcard parameters match one or more characters across multiple segments. They are defined the same way as regular parameters, but are prefixed with an asterisk (`*foo`).

```js
const fn = match("/*splat");

fn("/bar/baz");
//=> { path: '/bar/baz', params: { splat: [ 'bar', 'baz' ] } }
```

### Optional

Braces can be used to define parts of the path that are optional.

```js
const fn = match("/users{/:id}/delete");

fn("/users/delete");
//=> { path: '/users/delete', params: {} }

fn("/users/123/delete");
//=> { path: '/users/123/delete', params: { id: '123' } }
```

## Match

The `match` function returns a function for matching strings against a path:

- **path** String or array of strings.
- **options** _(optional)_ (See [parse](#parse) for more options)
  - **sensitive** Regexp will be case sensitive. (default: `false`)
  - **end** Validate the match reaches the end of the string. (default: `true`)
  - **trailing** Allows optional trailing delimiter to match. (default: `true`)
  - **decode** Function for decoding strings to params, or `false` to disable all processing. (default: `decodeURIComponent`)

```js
const fn = match("/foo/:bar");
```

**Please note:** `path-to-regexp` is intended for ordered data (e.g. pathnames, hostnames). It can not handle arbitrarily ordered data (e.g. query strings, URL fragments, JSON, etc).

## Compile ("Reverse" Path-To-RegExp)

The `compile` function will return a function for transforming parameters into a valid path:

- **path** A string.
- **options** (See [parse](#parse) for more options)
  - **encode** Function for encoding input strings for output into the path, or `false` to disable entirely. (default: `encodeURIComponent`)

```js
const toPath = compile("/user/:id");

toPath({ id: "name" }); //=> "/user/name"
toPath({ id: "café" }); //=> "/user/caf%C3%A9"

const toPathRepeated = compile("/*segment");

toPathRepeated({ segment: ["foo"] }); //=> "/foo"
toPathRepeated({ segment: ["a", "b", "c"] }); //=> "/a/b/c"

// When disabling `encode`, you need to make sure inputs are encoded correctly. No arrays are accepted.
const toPathRaw = compile("/user/:id", { encode: false });

toPathRaw({ id: "%3A%2F" }); //=> "/user/%3A%2F"
```

## Developers

- If you are rewriting paths with match and compile, consider using `encode: false` and `decode: false` to keep raw paths passed around.
- To ensure matches work on paths containing characters usually encoded, such as emoji, consider using [encodeurl](https://github.com/pillarjs/encodeurl) for `encodePath`.

### Parse

The `parse` function accepts a string and returns `TokenData`, the set of tokens and other metadata parsed from the input string. `TokenData` is can used with `match` and `compile`.

- **path** A string.
- **options** _(optional)_
  - **delimiter** The default delimiter for segments, e.g. `[^/]` for `:named` parameters. (default: `'/'`)
  - **encodePath** A function for encoding input strings. (default: `x => x`, recommended: [`encodeurl`](https://github.com/pillarjs/encodeurl))

### Tokens

`TokenData` is a sequence of tokens, currently of types `text`, `parameter`, `wildcard`, or `group`.

### Custom path

In some applications, you may not be able to use the `path-to-regexp` syntax, but still want to use this library for `match` and `compile`. For example:

```js
import { TokenData, match } from "path-to-regexp";

const tokens = [
  { type: "text", value: "/" },
  { type: "parameter", name: "foo" },
];
const path = new TokenData(tokens);
const fn = match(path);

fn("/test"); //=> { path: '/test', index: 0, params: { foo: 'test' } }
```

## Errors

An effort has been made to ensure ambiguous paths from previous releases throw an error. This means you might be seeing an error when things worked before.

### Unexpected `?` or `+`

In past releases, `?`, `*`, and `+` were used to denote optional or repeating parameters. As an alternative, try these:

- For optional (`?`), use an empty segment in a group such as `/:file{.:ext}`.
- For repeating (`+`), only wildcard matching is supported, such as `/*path`.
- For optional repeating (`*`), use a group and a wildcard parameter such as `/files{/*path}`.

### Unexpected `(`, `)`, `[`, `]`, etc.

Previous versions of Path-to-RegExp used these for RegExp features. This version no longer supports them so they've been reserved to avoid ambiguity. To use these characters literally, escape them with a backslash, e.g. `"\\("`.

### Missing parameter name

Parameter names, the part after `:` or `*`, must be a valid JavaScript identifier. For example, it cannot start with a number or contain a dash. If you want a parameter name that uses these characters you can wrap the name in quotes, e.g. `:"my-name"`.

### Unterminated quote

Parameter names can be wrapped in double quote characters, and this error means you forgot to close the quote character.

### Express <= 4.x

Path-To-RegExp breaks compatibility with Express <= `4.x` in the following ways:

- Regexp characters can no longer be provided.
- The optional character `?` is no longer supported, use braces instead: `/:file{.:ext}`.
- Some characters have new meaning or have been reserved (`{}?*+@!;`).
- The parameter name now supports all JavaScript identifier characters, previously it was only `[a-z0-9]`.

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
