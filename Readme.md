# Path-to-RegExp

Turn an Express-style path string such as `/user/:name` into a regular expression.

[![Build Status](https://img.shields.io/travis/component/path-to-regexp/master.svg)](https://travis-ci.org/component/path-to-regexp)
[![NPM version](https://img.shields.io/npm/v/path-to-regexp.svg)](https://www.npmjs.org/package/path-to-regexp)

## Usage

```javascript
var pathToRegexp = require('path-to-regexp');

// pathToRegexp(path, keys, options);
```

- **path** A string in the express format, an array of strings, or a regular expression.
- **keys** An array to be populated with the keys present in the url.
- **options**
  - **options.sensitive** When set to `true` the route will be case sensitive.
  - **options.strict** When set to `true` a trailing slash will affect the url matching.
  - **options.end** When set to `false` the url will match only the prefix.

```javascript
var keys = [];
var re = pathToRegexp('/foo/:bar', keys);
// re = /^\/foo\/(?:([^\/]+?))\/?$/i
// keys = [{ name: 'bar', optional: false }]
```

### Named parameters

Paths have the ability to define named parameters that populate the keys array. Named parameters are defined by prefixing a colon to a parameter name (`:foo`) and optionally suffixing a number of different modifiers. A named parameter will match any text until the next slash.

```javascript
var re = pathToRegexp('/:foo/:bar');

re.exec('/test/route');
//=> ['/test/route', 'test', 'route']
```

#### Optional Matches

Named parameters can be suffixed with a question mark to indicate an optional match.

```javascript
var re = pathToRegExp('/:foo?');

re.exec('/');
//=> ['/', undefined]
```

Please note: Optional matches can be combined with the greedy match to only have it take effect with the parameter exists. E.g. `/:foo*?`.

#### Custom Matching Groups

Named parameters can be provided a custom matching group and override the default. Please note: Backslashes will need to be escaped.

```javascript
var re = pathToRegexp('/:foo(\\d+)');

re.exec('/123');
//=> ['/123', '123']

re.exec('/abc');
//=> null
```

#### Prefixes

By default a named parameter will match any character up until the next slash, but if the parameter is prefixed with a period it will only match to the next period.

```javascript
var re = pathToRegexp('/test.:foo');

re.exec('/test.json');
//=> ['/test.json', 'json']

re.exec('/test.html.json');
//=> null
```

### Greedy Matching

The path uses an asterisk to greedily match any trailing characters. This can be placed anywhere in the route, including after a named parameter.

```javascript
var re = pathToRegexp('/foo*');

re.exec('/foo/bar.json');
//=> ['/foo/bar', '/bar.json']
```

## Live Demo

You can see a live demo of this library in use at [express-route-tester](http://forbeslindesay.github.com/express-route-tester/).

## License

MIT
