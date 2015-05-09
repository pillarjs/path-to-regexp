/* global describe, it */

var util = require('util')
var expect = require('chai').expect
var pathToRegexp = require('./')

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
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route',
    ['/route', 'route'],
    { end: false }
  ],
  [
    '/:test/',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
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
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route',
    ['/route', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route/',
    ['/route', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route/',
    ['/route/', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
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
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/another',
    ['/another', 'another']
  ],
  [
    '/:test',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/something/else',
    null
  ],
  [
    '/:test',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route.json',
    ['/route.json', 'route.json']
  ],
  [
    '/:test',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route',
    ['/route', 'route'],
    { strict: true }],
  [
    '/:test',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route/',
    null,
    { strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route/',
    ['/route/', 'route'],
    { strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route//',
    null,
    { strict: true }
  ],
  [
    '/:test',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route.json',
    ['/route.json', 'route.json'],
    { end: false }
  ],

  /**
   * Optional named parameter.
   */
  [
    '/:test?',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test?',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '/route/nested',
    null
  ],
  [
    '/:test?',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '/',
    ['/', undefined]
  ],
  [
    '/:test?',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '/route',
    ['/route', 'route'],
    { strict: true }
  ],
  [
    '/:test?',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '/',
    null, // Questionable behaviour.
    { strict: true }
  ],
  [
    '/:test?/',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '/',
    ['/', undefined],
    { strict: true }
  ],
  [
    '/:test?/',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '//',
    null
  ],
  [
    '/:test?/',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '//',
    null,
    { strict: true }
  ],

  // Repeated once or more times parameters.
  [
    '/:test+',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: true, pattern: '[^\\/]+?' }],
    '/',
    null
  ],
  [
    '/:test+',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: true, pattern: '[^\\/]+?' }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test+',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: true, pattern: '[^\\/]+?' }],
    '/some/basic/route',
    ['/some/basic/route', 'some/basic/route']
  ],
  [
    '/:test(\\d+)+',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: true, pattern: '\\d+' }],
    '/abc/456/789',
    null
  ],
  [
    '/:test(\\d+)+',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: true, pattern: '\\d+' }],
    '/123/456/789',
    ['/123/456/789', '123/456/789']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', prefix: '.', delimiter: '.', optional: false, repeat: true, pattern: 'json|xml' }],
    '/route.json',
    ['/route.json', 'json']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', prefix: '.', delimiter: '.', optional: false, repeat: true, pattern: 'json|xml' }],
    '/route.xml.json',
    ['/route.xml.json', 'xml.json']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', prefix: '.', delimiter: '.', optional: false, repeat: true, pattern: 'json|xml' }],
    '/route.html',
    null
  ],

  /**
   * Repeated zero or more times parameters.
   */
  [
    '/:test*',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: true, pattern: '[^\\/]+?' }],
    '/',
    ['/', undefined]
  ],
  [
    '/:test*',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: true, pattern: '[^\\/]+?' }],
    '//',
    null
  ],
  [
    '/:test*',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: true, pattern: '[^\\/]+?' }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test*',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: true, repeat: true, pattern: '[^\\/]+?' }],
    '/some/basic/route',
    ['/some/basic/route', 'some/basic/route']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', prefix: '.', delimiter: '.', optional: true, repeat: true, pattern: '[a-z]+' }],
    '/route',
    ['/route', undefined]
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', prefix: '.', delimiter: '.', optional: true, repeat: true, pattern: '[a-z]+' }],
    '/route.json',
    ['/route.json', 'json']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', prefix: '.', delimiter: '.', optional: true, repeat: true, pattern: '[a-z]+' }],
    '/route.xml.json',
    ['/route.xml.json', 'xml.json']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', prefix: '.', delimiter: '.', optional: true, repeat: true, pattern: '[a-z]+' }],
    '/route.123',
    null
  ],

  // Custom named parameters.
  [
    '/:test(\\d+)',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/123',
    ['/123', '123']
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/abc',
    null
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/123/abc',
    null
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/123/abc',
    ['/123', '123'],
    { end: false }
  ],
  [
    '/:test(.*)',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '.*' }],
    '/anything/goes/here',
    ['/anything/goes/here', 'anything/goes/here']
  ],
  [
    '/:route([a-z]+)',
    [{ name: 'route', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[a-z]+' }],
    '/abcde',
    ['/abcde', 'abcde']
  ],
  [
    '/:route([a-z]+)',
    [{ name: 'route', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[a-z]+' }],
    '/12345',
    null
  ],
  [
    '/:route(this|that)',
    [{ name: 'route', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: 'this|that' }],
    '/this',
    ['/this', 'this']
  ],
  [
    '/:route(this|that)',
    [{ name: 'route', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: 'this|that' }],
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
    [{ name: 'test', prefix: '', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    'route',
    ['route', 'route']
  ],
  [
    ':test',
    [{ name: 'test', prefix: '', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route',
    null
  ],
  [
    ':test',
    [{ name: 'test', prefix: '', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    'route/',
    ['route/', 'route']
  ],
  [
    ':test',
    [{ name: 'test', prefix: '', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    'route/',
    null,
    { strict: true }
  ],
  [
    ':test',
    [{ name: 'test', prefix: '', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    'route/',
    ['route/', 'route'],
    { end: false }
  ],
  [
    ':test?',
    [{ name: 'test', prefix: '', delimiter: '/', optional: true, repeat: false, pattern: '[^\\/]+?' }],
    '',
    ['', undefined]
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
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route.json',
    ['/route.json', 'route']
  ],
  [
    '/:test.json',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route.json.json',
    ['/route.json.json', 'route.json']
  ],
  [
    '/:test.json',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route.json',
    ['/route.json', 'route'],
    { end: false }
  ],
  [
    '/:test.json',
    [{ name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }],
    '/route.json.json',
    ['/route.json.json', 'route.json'],
    { end: false }
  ],

  /**
   * Format params.
   */
  [
    '/test.:format',
    [{ name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' }],
    '/test.html',
    ['/test.html', 'html']
  ],
  [
    '/test.:format',
    [{ name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' }],
    '/test.hbs.html',
    null
  ],
  [
    '/test.:format.:format',
    [
      { name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' }
    ],
    '/test.hbs.html',
    ['/test.hbs.html', 'hbs', 'html']
  ],
  [
    '/test.:format+',
    [
      { name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: true, pattern: '[^.]+?' }
    ],
    '/test.hbs.html',
    ['/test.hbs.html', 'hbs.html']
  ],
  [
    '/test.:format',
    [{ name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' }],
    '/test.hbs.html',
    null,
    { end: false }
  ],
  [
    '/test.:format.',
    [{ name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' }],
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
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' }
    ],
    '/route.html',
    ['/route.html', 'route', 'html']
  ],
  [
    '/:test.:format',
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' }
    ],
    '/route',
    null
  ],
  [
    '/:test.:format',
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '[^.]+?' }
    ],
    '/route',
    null
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: true, repeat: false, pattern: '[^.]+?' }
    ],
    '/route',
    ['/route', 'route', undefined]
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: true, repeat: false, pattern: '[^.]+?' }
    ],
    '/route.json',
    ['/route.json', 'route', 'json']
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: true, repeat: false, pattern: '[^.]+?' }
    ],
    '/route',
    ['/route', 'route', undefined],
    { end: false }
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: true, repeat: false, pattern: '[^.]+?' }
    ],
    '/route.json',
    ['/route.json', 'route', 'json'],
    { end: false }
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'format', prefix: '.', delimiter: '.', optional: true, repeat: false, pattern: '[^.]+?' }
    ],
    '/route.json.html',
    ['/route.json.html', 'route.json', 'html'],
    { end: false }
  ],
  [
    '/test.:format(.*)z',
    [{ name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '.*' }],
    '/test.abc',
    null,
    { end: false }
  ],
  [
    '/test.:format(.*)z',
    [{ name: 'format', prefix: '.', delimiter: '.', optional: false, repeat: false, pattern: '.*' }],
    '/test.abcz',
    ['/test.abcz', 'abc'],
    { end: false }
  ],

  /**
   * Unnamed params.
   */
  [
    '/(\\d+)',
    [{ name: 0, prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/123',
    ['/123', '123']
  ],
  [
    '/(\\d+)',
    [{ name: 0, prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/abc',
    null
  ],
  [
    '/(\\d+)',
    [{ name: 0, prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/123/abc',
    null
  ],
  [
    '/(\\d+)',
    [{ name: 0, prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/123/abc',
    ['/123', '123'],
    { end: false }
  ],
  [
    '/(\\d+)',
    [{ name: 0, prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' }],
    '/abc',
    null,
    { end: false }
  ],
  [
    '/(\\d+)?',
    [{ name: 0, prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '\\d+' }],
    '/',
    ['/', undefined]
  ],
  [
    '/(\\d+)?',
    [{ name: 0, prefix: '/', delimiter: '/', optional: true, repeat: false, pattern: '\\d+' }],
    '/123',
    ['/123', '123']
  ],
  [
    '/(.*)',
    [{ name: 0, prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '.*' }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/(.*)',
    [{ name: 0, prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '.*' }],
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
    [{ name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null }],
    '/match/anything',
    ['/match/anything', '/match/anything']
  ],
  [
    /\/(\d+)/,
    [{ name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null }],
    '/123',
    ['/123', '123']
  ],

  /**
   * Mixed arrays.
   */
  [
    ['/test', /\/(\d+)/],
    [{ name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null }],
    '/test',
    ['/test', undefined]
  ],
  [
    ['/:test(\\d+)', /(.*)/],
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' },
      { name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null }
    ],
    '/123',
    ['/123', '123', undefined]
  ],
  [
    ['/:test(\\d+)', /(.*)/],
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '\\d+' },
      { name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null }
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
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }
    ],
    '/test',
    ['/test', 'test', undefined]
  ],
  [
    ['/:test', '/route/:test'],
    [
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'test', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }
    ],
    '/route/test',
    ['/route/test', undefined, 'test']
  ],
  [
    [/^\/([^\/]+)$/, /^\/route\/([^\/]+)$/],
    [
      { name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null },
      { name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null }
    ],
    '/test',
    ['/test', 'test', undefined]
  ],
  [
    [/^\/([^\/]+)$/, /^\/route\/([^\/]+)$/],
    [
      { name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null },
      { name: 0, prefix: null, delimiter: null, optional: false, repeat: false, pattern: null }
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
      { name: 'foo', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' },
      { name: 'bar', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }
    ],
    '/match/route',
    ['/match/route', 'match', 'route']
  ],
  [
    '/:remote([\\w-.]+)/:user([\\w-]+)',
    [
      { name: 'remote', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[\\w-.]+' },
      { name: 'user', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[\\w-]+' }
    ],
    '/endpoint/user',
    ['/endpoint/user', 'endpoint', 'user']
  ],
  [
    '/:foo\\?',
    [
      { name: 'foo', prefix: '/', delimiter: '/', optional: false, repeat: false, pattern: '[^\\/]+?' }
    ],
    '/route?',
    ['/route?', 'route']
  ]
]

/**
 * Dynamically generate the entire test suite.
 */
describe('path-to-regexp', function () {
  var TEST_PATH = '/user/:id'

  var TEST_PARAM = {
    name: 'id',
    prefix: '/',
    delimiter: '/',
    optional: false,
    repeat: false,
    pattern: '[^\\/]+?'
  }

  describe('parse', function () {
    it('should parse the string', function () {
      var tokens = pathToRegexp.parse(TEST_PATH)

      expect(tokens).to.deep.equal(['/user', TEST_PARAM])
    })
  })

  describe('compile', function () {
    it('should compile a path into a function for reversing', function () {
      var toPath = pathToRegexp.compile(TEST_PATH)

      expect(toPath({ id: 123 })).to.equal('/user/123')
    })

    it('should generate path without parameters', function () {
      var toPath = pathToRegexp.compile('/user')

      expect(toPath()).to.equal('/user')
    })

    it('should omit optional parameters', function () {
      var toPath = pathToRegexp.compile('/a/:b?/c')

      expect(toPath()).to.equal('/a/c')
    })

    it('should throw when a required param is undefined', function () {
      var toPath = pathToRegexp.compile('/a/:b/c')

      expect(function () {
        toPath()
      }).to.throw(TypeError, 'Expected "b" to be defined')
    })

    it('should encode path parameters', function () {
      var toPath = pathToRegexp.compile('/:foo')

      expect(toPath({ foo: 'café' })).to.equal('/caf%C3%A9')
    })

    it('should throw when it does not match the pattern', function () {
      var toPath = pathToRegexp.compile('/:foo(\\d+)')

      expect(function () {
        toPath({ foo: 'abc' })
      }).to.throw(TypeError, 'Expected "foo" to match "\\d+"')
    })

    it('should handle repeated values', function () {
      var toPath = pathToRegexp.compile('/:foo+')

      expect(toPath({ foo: [1, 2, 3] })).to.equal('/1/2/3')
    })

    it('should throw when expecting a repeated value', function () {
      var toPath = pathToRegexp.compile('/:foo+')

      expect(function () {
        toPath({ foo: [] })
      }).to.throw(TypeError, 'Expected "foo" to not be empty')
    })

    it('should throw when not expecting a repeated value', function () {
      var toPath = pathToRegexp.compile('/:foo')

      expect(function () {
        toPath({ foo: [] })
      }).to.throw(TypeError, 'Expected "foo" to not repeat')
    })

    it('should throw when repeated value does not match', function () {
      var toPath = pathToRegexp.compile('/:foo(\\d+)+')

      expect(function () {
        toPath({ foo: [1, 2, 3, 'a'] })
      }).to.throw(TypeError, 'Expected all "foo" to match "\\d+"')
    })

    it('should allow optional repeated values', function () {
      var toPath = pathToRegexp.compile('/user/:id(\\d+)*')

      expect(toPath()).to.equal('/user')
    })

    it('should allow optional repeated values to be empty arrays', function () {
      var toPath = pathToRegexp.compile('/user/:id(\\d+)*')

      expect(toPath({ id: [] })).to.equal('/user')
    })

    it('should handle optional repeated parameters', function () {
      var toPath = pathToRegexp.compile('/a/:b*/c')

      expect(toPath({ b: [1, 2, 3] })).to.equal('/a/1/2/3/c')
    })
  })

  describe('arguments', function () {
    it('should work without second keys', function () {
      var re = pathToRegexp(TEST_PATH, { end: false })

      expect(re.keys).to.deep.equal([TEST_PARAM])
      expect(exec(re, '/user/123/show')).to.deep.equal(['/user/123', '123'])
    })

    it('should work with keys as null', function () {
      var re = pathToRegexp(TEST_PATH, null, { end: false })

      expect(re.keys).to.deep.equal([TEST_PARAM])
      expect(exec(re, '/user/123/show')).to.deep.equal(['/user/123', '123'])
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
        var keys = []
        var re = pathToRegexp(test[0], keys, test[4])

        // Check the keys match each other and the expected output.
        expect(re.keys).to.equal(keys)
        expect(keys).to.deep.equal(test[1])

        // Run the regexp and check the result as expected.
        expect(exec(re, test[2])).to.deep.equal(test[3])
      })
    })
  })
})

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
