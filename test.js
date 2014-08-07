var util = require('util');
var assert = require('assert');
var pathToRegexp = require('./');

/**
 * Execute a regular expression and return a flat array for comparison.
 *
 * @param  {RegExp} re
 * @param  {String} str
 * @return {Array}
 */
var exec = function (re, str) {
  var match = re.exec(str);

  return match && Array.prototype.slice.call(match);
};

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
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route',
    ['/route', 'route'],
    { end: false }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
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
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route',
    ['/route', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route/',
    ['/route', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route/',
    ['/route/', 'route'],
    { end: false, strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
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
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/another',
    ['/another', 'another']
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/something/else',
    null
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route.json',
    ['/route.json', 'route.json']
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route',
    ['/route', 'route'],
    { strict: true }],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route/',
    null,
    { strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route/',
    ['/route/', 'route'],
    { strict: true }
  ],
  [
    '/:test/',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route//',
    null,
    { strict: true }
  ],
  [
    '/:test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route.json',
    ['/route.json', 'route.json'],
    { end: false }
  ],

  /**
   * Optional named parameter.
   */
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false }],
    '/route/nested',
    null
  ],
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false }],
    '/',
    ['/', undefined]
  ],
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false }],
    '/route',
    ['/route', 'route'],
    { strict: true }
  ],
  [
    '/:test?',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false }],
    '/',
    null, // Questionable behaviour.
    { strict: true }
  ],
  [
    '/:test?/',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false }],
    '/',
    ['/', undefined],
    { strict: true }
  ],
  [
    '/:test?/',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false }],
    '//',
    null
  ],
  [
    '/:test?/',
    [{ name: 'test', delimiter: '/', optional: true, repeat: false }],
    '//',
    null,
    { strict: true }
  ],

  // Repeated once or more times parameters.
  [
    '/:test+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true }],
    '/',
    null
  ],
  [
    '/:test+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true }],
    '/some/basic/route',
    ['/some/basic/route', 'some/basic/route']
  ],
  [
    '/:test(\\d+)+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true }],
    '/abc/456/789',
    null
  ],
  [
    '/:test(\\d+)+',
    [{ name: 'test', delimiter: '/', optional: false, repeat: true }],
    '/123/456/789',
    ['/123/456/789', '123/456/789']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', delimiter: '.', optional: false, repeat: true }],
    '/route.json',
    ['/route.json', 'json']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', delimiter: '.', optional: false, repeat: true }],
    '/route.xml.json',
    ['/route.xml.json', 'xml.json']
  ],
  [
    '/route.:ext(json|xml)+',
    [{ name: 'ext', delimiter: '.', optional: false, repeat: true }],
    '/route.html',
    null
  ],

  /**
   * Repeated zero or more times parameters.
   */
  [
    '/:test*',
    [{ name: 'test', delimiter: '/', optional: true, repeat: true }],
    '/',
    ['/', undefined]
  ],
  [
    '/:test*',
    [{ name: 'test', delimiter: '/', optional: true, repeat: true }],
    '//',
    null
  ],
  [
    '/:test*',
    [{ name: 'test', delimiter: '/', optional: true, repeat: true }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/:test*',
    [{ name: 'test', delimiter: '/', optional: true, repeat: true }],
    '/some/basic/route',
    ['/some/basic/route', 'some/basic/route']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', delimiter: '.', optional: true, repeat: true }],
    '/route',
    ['/route', undefined]
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', delimiter: '.', optional: true, repeat: true }],
    '/route.json',
    ['/route.json', 'json']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', delimiter: '.', optional: true, repeat: true }],
    '/route.xml.json',
    ['/route.xml.json', 'xml.json']
  ],
  [
    '/route.:ext([a-z]+)*',
    [{ name: 'ext', delimiter: '.', optional: true, repeat: true }],
    '/route.123',
    null
  ],

  // Custom named parameters.
  [
    '/:test(\\d+)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/123',
    ['/123', '123']
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/abc',
    null
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/123/abc',
    null
  ],
  [
    '/:test(\\d+)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/123/abc',
    ['/123', '123'],
    { end: false }
  ],
  [
    '/:test(.*)',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/anything/goes/here',
    ['/anything/goes/here', 'anything/goes/here']
  ],
  [
    '/:route([a-z]+)',
    [{ name: 'route', delimiter: '/', optional: false, repeat: false }],
    '/abcde',
    ['/abcde', 'abcde']
  ],
  [
    '/:route([a-z]+)',
    [{ name: 'route', delimiter: '/', optional: false, repeat: false }],
    '/12345',
    null
  ],
  [
    '/:route(this|that)',
    [{ name: 'route', delimiter: '/', optional: false, repeat: false }],
    '/this',
    ['/this', 'this']
  ],
  [
    '/:route(this|that)',
    [{ name: 'route', delimiter: '/', optional: false, repeat: false }],
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
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    'route',
    ['route', 'route']
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route',
    null
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    'route/',
    ['route/', 'route']
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    'route/',
    null,
    { strict: true }
  ],
  [
    ':test',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
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
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route.json',
    ['/route.json', 'route']
  ],
  [
    '/:test.json',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route.json.json',
    ['/route.json.json', 'route.json']
  ],
  [
    '/:test.json',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route.json',
    ['/route.json', 'route'],
    { end: false }
  ],
  [
    '/:test.json',
    [{ name: 'test', delimiter: '/', optional: false, repeat: false }],
    '/route.json.json',
    ['/route.json.json', 'route.json'],
    { end: false }
  ],

  /**
   * Format params.
   */
  [
    '/test.:format',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false }],
    '/test.html',
    ['/test.html', 'html']
  ],
  [
    '/test.:format',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false }],
    '/test.hbs.html',
    null
  ],
  [
    '/test.:format.:format',
    [
      { name: 'format', delimiter: '.', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: false, repeat: false }
    ],
    '/test.hbs.html',
    ['/test.hbs.html', 'hbs', 'html']
  ],
  [
    '/test.:format+',
    [
      { name: 'format', delimiter: '.', optional: false, repeat: true }
    ],
    '/test.hbs.html',
    ['/test.hbs.html', 'hbs.html']
  ],
  [
    '/test.:format',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false }],
    '/test.hbs.html',
    null,
    { end: false }
  ],
  [
    '/test.:format.',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false }],
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
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: false, repeat: false }
    ],
    '/route.html',
    ['/route.html', 'route', 'html']
  ],
  [
    '/:test.:format',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: false, repeat: false }
    ],
    '/route',
    null
  ],
  [
    '/:test.:format',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: false, repeat: false }
    ],
    '/route',
    null
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: true, repeat: false }
    ],
    '/route',
    ['/route', 'route', undefined]
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: true, repeat: false }
    ],
    '/route.json',
    ['/route.json', 'route', 'json']
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: true, repeat: false }
    ],
    '/route',
    ['/route', 'route', undefined],
    { end: false }
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: true, repeat: false }
    ],
    '/route.json',
    ['/route.json', 'route', 'json'],
    { end: false }
  ],
  [
    '/:test.:format?',
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'format', delimiter: '.', optional: true, repeat: false }
    ],
    '/route.json.html',
    ['/route.json.html', 'route.json', 'html'],
    { end: false }
  ],
  [
    '/test.:format(.*)z',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false }],
    '/test.abc',
    null,
    { end: false }
  ],
  [
    '/test.:format(.*)z',
    [{ name: 'format', delimiter: '.', optional: false, repeat: false }],
    '/test.abcz',
    ['/test.abcz', 'abc'],
    { end: false }
  ],

  /**
   * Unnamed params.
   */
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false }],
    '/123',
    ['/123', '123']
  ],
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false }],
    '/abc',
    null
  ],
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false }],
    '/123/abc',
    null
  ],
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false }],
    '/123/abc',
    ['/123', '123'],
    { end: false }
  ],
  [
    '/(\\d+)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false }],
    '/abc',
    null,
    { end: false }
  ],
  [
    '/(\\d+)?',
    [{ name: '0', delimiter: '/', optional: true, repeat: false }],
    '/',
    ['/', undefined]
  ],
  [
    '/(\\d+)?',
    [{ name: '0', delimiter: '/', optional: true, repeat: false }],
    '/123',
    ['/123', '123']
  ],
  [
    '/(.*)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false }],
    '/route',
    ['/route', 'route']
  ],
  [
    '/(.*)',
    [{ name: '0', delimiter: '/', optional: false, repeat: false }],
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
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: '0', delimiter: null, optional: false, repeat: false }
    ],
    '/123',
    ['/123', '123', undefined]
  ],
  [
    ['/:test(\\d+)', /(.*)/],
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
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
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'test', delimiter: '/', optional: false, repeat: false }
    ],
    '/test',
    ['/test', 'test', undefined]
  ],
  [
    ['/:test', '/route/:test'],
    [
      { name: 'test', delimiter: '/', optional: false, repeat: false },
      { name: 'test', delimiter: '/', optional: false, repeat: false }
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
      { name: 'foo', delimiter: '/', optional: false, repeat: false },
      { name: 'bar', delimiter: '/', optional: false, repeat: false }
    ],
    '/match/route',
    ['/match/route', 'match', 'route']
  ],
  [
    '/:remote([\\w-.]+)/:user([\\w-]+)',
    [
      { name: 'remote', delimiter: '/', optional: false, repeat: false },
      { name: 'user', delimiter: '/', optional: false, repeat: false }
    ],
    '/endpoint/user',
    ['/endpoint/user', 'endpoint', 'user']
  ]
];

/**
 * Dynamically generate the entire test suite.
 */
describe('path-to-regexp', function () {
  describe('arguments', function () {
    it('should work without second keys', function () {
      var re = pathToRegexp('/user/:id', { end: false });
      var params = [
        { name: 'id', delimiter: '/', optional: false, repeat: false }
      ];

      assert.deepEqual(re.keys, params);
      assert.deepEqual(exec(re, '/user/123/show'), ['/user/123', '123']);
    });
  });

  describe('rules', function () {
    TESTS.forEach(function (test) {
      var description = '';
      var options     = test[4] || {};

      // Generate a base description using the test values.
      description += 'should ' + (test[3] ? '' : 'not ') + 'match ';
      description += util.inspect(test[2]) + ' against ' + util.inspect(test[0]);

      // If additional options have been defined, we should render the options
      // in the test descriptions.
      if (Object.keys(options).length) {
        var optionsDescription = Object.keys(options).map(function (key) {
          return (options[key] === false ? 'non-' : '') + key;
        }).join(', ');

        description += ' in ' + optionsDescription + ' mode';
      }

      // Execute the test and check each parameter is as expected.
      it(description, function () {
        var params = [];
        var re     = pathToRegexp(test[0], params, test[4]);

        // Check the keys are as expected.
        assert.equal(re.keys, params);
        assert.deepEqual(params, test[1]);

        // Run the regexp and check the result is expected.
        assert.deepEqual(exec(re, test[2]), test[3]);
      });
    });
  });
});
