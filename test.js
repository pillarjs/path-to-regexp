/* global describe, it */

var util = require('util')
var assert = require('assert')
var pathToRegexp = require('./')

/**
 * Execute a regular expression and return a flat array for comparison.
 *
 * @param  {RegExp} re
 * @param  {String} str
 * @return {Array}
 */
function exec (re, str) {
  var match = re.exec(str)

  return match && Array.prototype.slice.call(match)
}

/**
 * An array of test cases with expected inputs and outputs. The format of each
 * array item is:
 *
 * ["path", "expected params", "route", "expected output", "options"]
 *
 * @type {Array}
 */
var TESTS = [
  /**
   * Simple paths.
   */
  ['/', [], '/', ['/']],
  ['/test', [], '/test', ['/test']],
  ['/test', [], '/route', null],
  ['/test', [], '/test/route', null],
  ['/test', [], '/test/', ['/test/']],
  ['/test/', [], '/test', ['/test']],
  ['/test/', [], '/test/', ['/test/']],
  ['/test/', [], '/test//', null],

  /**
   * Case-sensitive paths.
   */
  ['/test', [], '/test', ['/test'], { sensitive: true }],
  ['/test', [], '/TEST', null, { sensitive: true }],
  ['/TEST', [], '/test', null, { sensitive: true }],

  /**
   * Strict mode.
   */
  ['/test', [], '/test', ['/test'], { strict: true }],
  ['/test', [], '/test/', null, { strict: true }],
  ['/test/', [], '/test', null, { strict: true }],
  ['/test/', [], '/test/', ['/test/'], { strict: true }],
  ['/test/', [], '/test//', null, { strict: true }],

  /**
   * Non-ending mode.
   */
  ['/test', [], '/test', ['/test'], { end: false }],
  ['/test', [], '/test/', ['/test/'], { end: false }],
  ['/test', [], '/test/route', ['/test'], { end: false }],
  ['/test/', [], '/test/route', ['/test'], { end: false }],
  ['/test/', [], '/test//', ['/test'], { end: false }],
  ['/test/', [], '/test//route', ['/test'], { end: false }],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route',
    ['/route', 'route'],
    { end: false }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route',
    ['/route', 'route'],
    { end: false }
  ],

  /**
   * Combine modes.
   */
  ['/test', [], '/test', ['/test'], { end: false, strict: true }],
  ['/test', [], '/test/', ['/test'], { end: false, strict: true }],
  ['/test', [], '/test/route', ['/test'], { end: false, strict: true }],
  ['/test/', [], '/test', null, { end: false, strict: true }],
  ['/test/', [], '/test/', ['/test/'], { end: false, strict: true }],
  ['/test/', [], '/test//', ['/test/'], { end: false, strict: true }],
  ['/test/', [], '/test/route', ['/test/'], { end: false, strict: true }],
  ['/test.json', [], '/test.json', ['/test.json'], { end: false, strict: true }],
  ['/test.json', [], '/test.json.hbs', null, { end: false, strict: true }],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route',
    ['/route', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route/',
    ['/route', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route/',
    ['/route/', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route',
    null,
    { end: false, strict: true }
  ],

  /**
   * Arrays of simple paths.
   */
  [['/one', '/two'], [], '/one', ['/one']],
  [['/one', '/two'], [], '/two', ['/two']],
  [['/one', '/two'], [], '/three', null],
  [['/one', '/two'], [], '/one/two', null],

  /**
   * Non-ending simple path.
   */
  ['/test', [], '/test/route', ['/test'], { end: false }],

  /**
   * Single named parameter.
   */
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/another',
    ['/another', 'another']
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/something/else',
    null
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route.json',
    ['/route.json', 'route.json']
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route',
    ['/route', 'route'],
    { strict: true }],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route/',
    null,
    { strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route/',
    ['/route/', 'route'],
    { strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route//',
    null,
    { strict: true }
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route.json',
    ['/route.json', 'route.json'],
    { end: false }
  ],

  /**
   * Optional named parameter.
   */
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '/route/nested',
    null
  ],
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '/',
    ['/', undefined]
  ],
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '/route',
    ['/route', 'route'],
    { strict: true }
  ],
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '/',
    null, // Questionable behaviour.
    { strict: true }
  ],
  [
    '/:test?/',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '/',
    ['/', undefined],
    { strict: true }
  ],
  [
    '/:test?/',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '//',
    null
  ],
  [
    '/:test?/',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '//',
    null,
    { strict: true }
  ],

  // Repeated once or more times parameters.
  [
    '/:test+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true, offset: 1, length: 6 }],
    '/',
    null
  ],
  [
    '/:test+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true, offset: 1, length: 6 }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true, offset: 1, length: 6 }],
    '/some/basic/route',
    ['/some/basic/route', 'some/basic/route']
  ],
  [
    '/:test(\\d+)+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true, offset: 1, length: 11 }],
    '/abc/456/789',
    null
  ],
  [
    '/:test(\\d+)+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true, offset: 1, length: 11 }],
    '/123/456/789',
    ['/123/456/789', '123/456/789']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', delimiter: '.', optional: false, repeat: true, offset: 7, length: 15 }],
    '/route.json',
    ['/route.json', 'json']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', delimiter: '.', optional: false, repeat: true, offset: 7, length: 15 }],
    '/route.xml.json',
    ['/route.xml.json', 'xml.json']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', delimiter: '.', optional: false, repeat: true, offset: 7, length: 15 }],
    '/route.html',
    null
  ],

  /**
   * Repeated zero or more times parameters.
   */
  [
    '/:test*',
    [{ name: 'test', delimiter: '/', optional: true, repeat: true, offset: 1, length: 6 }],
    '/',
    ['/', undefined]
  ],
  [
    '/:test*',
    [{ name: 'test', delimiter: '/', optional: true, repeat: true, offset: 1, length: 6 }],
    '//',
    null
  ],
  [
    '/:test*',
    [{ name: 'test', delimiter: '/', optional: true, repeat: true, offset: 1, length: 6 }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test*',
    [{ name: 'test', delimiter: '/', optional: true, repeat: true, offset: 1, length: 6 }],
    '/some/basic/route',
    ['/some/basic/route', 'some/basic/route']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', delimiter: '.', optional: true, repeat: true, offset: 7, length: 13 }],
    '/route',
    ['/route', undefined]
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', delimiter: '.', optional: true, repeat: true, offset: 7, length: 13 }],
    '/route.json',
    ['/route.json', 'json']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', delimiter: '.', optional: true, repeat: true, offset: 7, length: 13 }],
    '/route.xml.json',
    ['/route.xml.json', 'xml.json']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', delimiter: '.', optional: true, repeat: true, offset: 7, length: 13 }],
    '/route.123',
    null
  ],

  // Custom named parameters.
  [
    '/:test(\\d+)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 10 }],
    '/123',
    ['/123', '123']
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 10 }],
    '/abc',
    null
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 10 }],
    '/123/abc',
    null
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 10 }],
    '/123/abc',
    ['/123', '123'],
    { end: false }
  ],
  [
    '/:test(.*)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 9 }],
    '/anything/goes/here',
    ['/anything/goes/here', 'anything/goes/here']
  ],
  [
    '/:route([a-z]+)',
    [{ name: 'route', delimiter: '/', optional: false, repeat: false, offset: 1, length: 14 }],
    '/abcde',
    ['/abcde', 'abcde']
  ],
  [
    '/:route([a-z]+)',
    [{ name: 'route', delimiter: '/', optional: false, repeat: false, offset: 1, length: 14 }],
    '/12345',
    null
  ],
  [
    '/:route(this|that)',
    [{ name: 'route', delimiter: '/', optional: false, repeat: false, offset: 1, length: 17 }],
    '/this',
    ['/this', 'this']
  ],
  [
    '/:route(this|that)',
    [{ name: 'route', delimiter: '/', optional: false, repeat: false, offset: 1, length: 17 }],
    '/that',
    ['/that', 'that']
  ],

  /**
   * Prefixed slashes could be omitted.
   */
  [
    'test',
    [],
    'test',
    ['test']
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 0, length: 5 }],
    'route',
    ['route', 'route']
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 0, length: 5 }],
    '/route',
    null
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 0, length: 5 }],
    'route/',
    ['route/', 'route']
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 0, length: 5 }],
    'route/',
    null,
    { strict: true }
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 0, length: 5 }],
    'route/',
    ['route/', 'route'],
    { end: false }
  ],

  /**
   * Formats.
   */
  [
    '/test.json',
    [],
    '/test.json',
    ['/test.json']
  ],
  [
    '/test.json',
    [],
    '/route.json',
    null
  ],
  [
    '/:test.json',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route.json',
    ['/route.json', 'route']
  ],
  [
    '/:test.json',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route.json.json',
    ['/route.json.json', 'route.json']
  ],
  [
    '/:test.json',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route.json',
    ['/route.json', 'route'],
    { end: false }
  ],
  [
    '/:test.json',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/route.json.json',
    ['/route.json.json', 'route.json'],
    { end: false }
  ],

  /**
   * Format params.
   */
  [
    '/test.:format',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false, offset: 6, length: 7 }],
    '/test.html',
    ['/test.html', 'html']
  ],
  [
    '/test.:format',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false, offset: 6, length: 7 }],
    '/test.hbs.html',
    null
  ],
  [
    '/test.:format.:format',
    [
      { name: 'format', delimiter: '.', optional: false, repeat: false, offset: 6, length: 7 },
      { name: 'format', delimiter: '.', optional: false, repeat: false, offset: 14, length: 7 }
    ],
    '/test.hbs.html',
    ['/test.hbs.html', 'hbs', 'html']
  ],
  [
    '/test.:format+',
    [
      { name: 'format', delimiter: '.', optional: false, repeat: true, offset: 6, length: 8 }
    ],
    '/test.hbs.html',
    ['/test.hbs.html', 'hbs.html']
  ],
  [
    '/test.:format',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false, offset: 6, length: 7 }],
    '/test.hbs.html',
    null,
    { end: false }
  ],
  [
    '/test.:format.',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false, offset: 6, length: 7 }],
    '/test.hbs.html',
    null,
    { end: false }
  ],

  /**
   * Format and path params.
   */
  [
    '/:test.:format',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'format', delimiter: '.', optional: false, repeat: false, offset: 7, length: 7 }
    ],
    '/route.html',
    ['/route.html', 'route', 'html']
  ],
  [
    '/:test.:format',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'format', delimiter: '.', optional: false, repeat: false, offset: 7, length: 7 }
    ],
    '/route',
    null
  ],
  [
    '/:test.:format',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'format', delimiter: '.', optional: false, repeat: false, offset: 7, length: 7 }
    ],
    '/route',
    null
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'format', delimiter: '.', optional: true, repeat: false, offset: 7, length: 8 }
    ],
    '/route',
    ['/route', 'route', undefined]
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'format', delimiter: '.', optional: true, repeat: false, offset: 7, length: 8 }
    ],
    '/route.json',
    ['/route.json', 'route', 'json']
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'format', delimiter: '.', optional: true, repeat: false, offset: 7, length: 8 }
    ],
    '/route',
    ['/route', 'route', undefined],
    { end: false }
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'format', delimiter: '.', optional: true, repeat: false, offset: 7, length: 8 }
    ],
    '/route.json',
    ['/route.json', 'route', 'json'],
    { end: false }
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'format', delimiter: '.', optional: true, repeat: false, offset: 7, length: 8 }
    ],
    '/route.json.html',
    ['/route.json.html', 'route.json', 'html'],
    { end: false }
  ],
  [
    '/test.:format(.*)z',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false, offset: 6, length: 11 }],
    '/test.abc',
    null,
    { end: false }
  ],
  [
    '/test.:format(.*)z',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false, offset: 6, length: 11 }],
    '/test.abcz',
    ['/test.abcz', 'abc'],
    { end: false }
  ],

  /**
   * Unnamed params.
   */
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/123',
    ['/123', '123']
  ],
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/abc',
    null
  ],
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/123/abc',
    null
  ],
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/123/abc',
    ['/123', '123'],
    { end: false }
  ],
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 }],
    '/abc',
    null,
    { end: false }
  ],
  [
    '/(\\d+)?',
    [{ name: '0', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '/',
    ['/', undefined]
  ],
  [
    '/(\\d+)?',
    [{ name: '0', delimiter: '/', optional: true, repeat: false, offset: 1, length: 6 }],
    '/123',
    ['/123', '123']
  ],
  [
    '/(.*)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false, offset: 1, length: 4 }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/(.*)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false, offset: 1, length: 4 }],
    '/route/nested',
    ['/route/nested', 'route/nested']
  ],

  /**
   * Regexps.
   */
  [
    /.*/,
    [],
    '/match/anything',
    ['/match/anything']
  ],
  [
    /(.*)/,
    [{ name: '0', delimiter: null, optional: false, repeat: false }],
    '/match/anything',
    ['/match/anything', '/match/anything']
  ],
  [
    /\/(\d+)/,
    [{ name: '0', delimiter: null, optional: false, repeat: false }],
    '/123',
    ['/123', '123']
  ],

  /**
   * Mixed arrays.
   */
  [
    ['/test', /\/(\d+)/],
    [{ name: '0', delimiter: null, optional: false, repeat: false }],
    '/test',
    ['/test', undefined]
  ],
  [
    ['/:test(\\d+)', /(.*)/],
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 10 },
      { name: '0', delimiter: null, optional: false, repeat: false }
    ],
    '/123',
    ['/123', '123', undefined]
  ],
  [
    ['/:test(\\d+)', /(.*)/],
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 10 },
      { name: '0', delimiter: null, optional: false, repeat: false }
    ],
    '/abc',
    ['/abc', undefined, '/abc']
  ],

  /**
   * Correct names and indexes.
   */
  [
    ['/:test', '/route/:test'],
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 7, length: 5 }
    ],
    '/test',
    ['/test', 'test', undefined]
  ],
  [
    ['/:test', '/route/:test'],
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 1, length: 5 },
      { name: 'test', delimiter: '/', optional: false, repeat: false, offset: 7, length: 5 }
    ],
    '/route/test',
    ['/route/test', undefined, 'test']
  ],
  [
    [/^\/([^\/]+)$/, /^\/route\/([^\/]+)$/],
    [
      { name: '0', delimiter: null, optional: false, repeat: false },
      { name: '0', delimiter: null, optional: false, repeat: false }
    ],
    '/test',
    ['/test', 'test', undefined]
  ],
  [
    [/^\/([^\/]+)$/, /^\/route\/([^\/]+)$/],
    [
      { name: '0', delimiter: null, optional: false, repeat: false },
      { name: '0', delimiter: null, optional: false, repeat: false }
    ],
    '/route/test',
    ['/route/test', undefined, 'test']
  ],

  /**
   * Ignore non-matching groups in regexps.
   */
  [
    /(?:.*)/,
    [],
    '/anything/you/want',
    ['/anything/you/want']
  ],

  /**
   * Respect escaped characters.
   */
  [
    '/\\(testing\\)',
    [],
    '/testing',
    null
  ],
  [
    '/\\(testing\\)',
    [],
    '/(testing)',
    ['/(testing)']
  ],
  [
    '/.+*?=^!:${}[]|',
    [],
    '/.+*?=^!:${}[]|',
    ['/.+*?=^!:${}[]|']
  ],

  /**
   * Real world examples.
   */
  [
    '/:foo/:bar',
    [
      { name: 'foo', delimiter: '/', optional: false, repeat: false, offset: 1, length: 4 },
      { name: 'bar', delimiter: '/', optional: false, repeat: false, offset: 6, length: 4 }
    ],
    '/match/route',
    ['/match/route', 'match', 'route']
  ],
  [
    '/:remote([\\w-.]+)/:user([\\w-]+)',
    [
      { name: 'remote', delimiter: '/', optional: false, repeat: false, offset: 1, length: 16 },
      { name: 'user', delimiter: '/', optional: false, repeat: false, offset: 18, length: 13 }
    ],
    '/endpoint/user',
    ['/endpoint/user', 'endpoint', 'user']
  ]
]

/**
 * Dynamically generate the entire test suite.
 */
describe('path-to-regexp', function () {
  describe('arguments', function () {
    it('should work without second keys', function () {
      var re = pathToRegexp('/user/:id', { end: false })
      var params = [
        { name: 'id', delimiter: '/', optional: false, repeat: false, offset: 6, length: 3 }
      ]

      assert.deepEqual(re.keys, params)
      assert.deepEqual(exec(re, '/user/123/show'), ['/user/123', '123'])
    })

    it('should work with keys as null', function () {
      var re = pathToRegexp('/user/:id', null, { end: false })
      var params = [
        { name: 'id', delimiter: '/', optional: false, repeat: false, offset: 6, length: 3 }
      ]

      assert.deepEqual(re.keys, params)
      assert.deepEqual(exec(re, '/user/123/show'), ['/user/123', '123'])
    })
  })

  describe('rules', function () {
    TESTS.forEach(function (test) {
      var description = ''
      var options = test[4] || {}

      // Generate a base description using the test values.
      description += 'should ' + (test[3] ? '' : 'not ') + 'match '
      description += util.inspect(test[2]) + ' against ' + util.inspect(test[0])

      // If additional options have been defined, we should render the options
      // in the test descriptions.
      if (Object.keys(options).length) {
        var optionsDescription = Object.keys(options).map(function (key) {
          return (options[key] === false ? 'non-' : '') + key
        }).join(', ')

        description += ' in ' + optionsDescription + ' mode'
      }

      // Execute the test and check each parameter is as expected.
      it(description, function () {
        var params = []
        var re = pathToRegexp(test[0], params, test[4])

        // Check the keys are as expected.
        assert.equal(re.keys, params)
        assert.deepEqual(params, test[1])

        // Run the regexp and check the result is expected.
        assert.deepEqual(exec(re, test[2]), test[3])
      })
    })
  })
})
