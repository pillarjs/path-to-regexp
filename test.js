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
  // Simple paths.
  ['/test', [], '/test', ['/test']],
  ['/test', [], '/route', null],
  ['/test', [], '/test/route', null],
  ['/test', [], '/test/', ['/test/']],

  // Case-sensitive paths.
  ['/test', [], '/test', ['/test'], { sensitive: true }],
  ['/test', [], '/TEST', null, { sensitive: true }],
  ['/TEST', [], '/test', null, { sensitive: true }],

  // Strict mode.
  ['/test', [], '/test', ['/test'], { strict: true }],
  ['/test', [], '/test/', null, { strict: true }],
  ['/test/', [], '/test', null, { strict: true }],
  ['/test/', [], '/test/', ['/test/'], { strict: true }],
  ['/test/', [], '/test//', null, { strict: true }],

  // Non-ending mode.
  ['/test', [], '/test', ['/test'], { end: false }],
  ['/test', [], '/test/route', ['/test'], { end: false }],

  // Combine modes.
  ['/test', [], '/test', ['/test'], { end: false, strict: true }],
  ['/test', [], '/test/', ['/test'], { end: false, strict: true }],
  ['/test', [], '/test/route', ['/test'], { end: false, strict: true }],
  ['/test/', [], '/test', null, { end: false, strict: true }],
  ['/test/', [], '/test/', ['/test/'], { end: false, strict: true }],
  ['/test/', [], '/test//', ['/test/'], { end: false, strict: true }],
  ['/test/', [], '/test/route', ['/test/'], { end: false, strict: true }],
  ['/test.json', [], '/test.json', ['/test.json'], { end: false, strict: true }],
  ['/test.json', [], '/test.json.hbs', null, { end: false, strict: true }],

  // Arrays of simple paths.
  [['/one', '/two'], [], '/one', ['/one']],
  [['/one', '/two'], [], '/two', ['/two']],
  [['/one', '/two'], [], '/three', null],
  [['/one', '/two'], [], '/one/two', null],

  // Non-ending simple path.
  ['/test', [], '/test/route', ['/test'], { end: false }],

  // Single named parameter
  ['/:test', ['test'], '/route', ['/route', 'route']],
  ['/:test', ['test'], '/another', ['/another', 'another']],
  ['/:test', ['test'], '/something/else', null],
  ['/:test', ['test'], '/route.json', ['/route.json', 'route.json']],
  ['/:test', ['test'], '/route', ['/route', 'route'], { strict: true }],
  ['/:test', ['test'], '/route/', null, { strict: true }],
  ['/:test/', ['test'], '/route/', ['/route/', 'route'], { strict: true }],
  ['/:test/', ['test'], '/route//', null, { strict: true }],,
  ['/:test', ['test'], '/route.json', ['/route.json', 'route.json'], { end: false }],

  // Optional named parameter.
  ['/:test?', ['test'], '/route', ['/route', 'route']],
  ['/:test?', ['test'], '/route/nested', null],
  ['/:test?', ['test'], '/', ['/', undefined]],
  ['/:test?', ['test'], '/route', ['/route', 'route'], { strict: true }],
  ['/:test?', ['test'], '/', null, { strict: true }], // Questionable behaviour.
  ['/:test?/', ['test'], '/', ['/', undefined], { strict: true }],
  ['/:test?/', ['test'], '//', null, { strict: true }],

  // Custom named parameters.
  ['/:test(\\d+)', ['test'], '/123', ['/123', '123']],
  ['/:test(\\d+)', ['test'], '/abc', null],
  ['/:test(\\d+)', ['test'], '/123/abc', null],
  ['/:test(\\d+)', ['test'], '/123/abc', ['/123', '123'], { end: false }],
  ['/:test(.*)', ['test'], '/anything/goes/here', ['/anything/goes/here', 'anything/goes/here']],
  ['/:route([a-z]+)', ['route'], '/abcde', ['/abcde', 'abcde']],
  ['/:route([a-z]+)', ['route'], '/12345', null],
  ['/:route(this|that)', ['route'], '/this', ['/this', 'this']],
  ['/:route(this|that)', ['route'], '/that', ['/that', 'that']],

  // Prefixed slashes could be omitted.
  ['test', [], 'test', ['test']],
  [':test', ['test'], 'route', ['route', 'route']],
  [':test', ['test'], '/route', null],
  [':test', ['test'], 'route/', ['route/', 'route']],
  [':test', ['test'], 'route/', null, { strict: true }],
  [':test', ['test'], 'route/', ['route', 'route'], { end: false }],

  // Formats.
  ['/test.json', [], '/test.json', ['/test.json']],
  ['/test.json', [], '/route.json', null],
  ['/:test.json', ['test'], '/route.json', ['/route.json', 'route']],
  ['/:test.json', ['test'], '/route.json.json', ['/route.json.json', 'route.json']],
  ['/:test.json', ['test'], '/route.json', ['/route.json', 'route'], { end: false }],
  ['/:test.json', ['test'], '/route.json.json', ['/route.json.json', 'route.json'], { end: false }],

  // Format params.
  ['/test.:format', ['format'], '/test.html', ['/test.html', 'html']],
  ['/test.:format', ['format'], '/test.hbs.html', null],
  ['/test.:format.:format', ['format', 'format'], '/test.hbs.html', ['/test.hbs.html', 'hbs', 'html']],
  ['/test.:format', ['format'], '/test.hbs.html', null, { end: false }],
  ['/test.:format.', ['format'], '/test.hbs.html', null, { end: false }],
  // Format and path params.
  ['/:test.:format', ['test', 'format'], '/route.html', ['/route.html', 'route', 'html']],
  ['/:test.:format', ['test', 'format'], '/route', null],
  ['/:test.:format', ['test', 'format'], '/route', null],
  ['/:test.:format?', ['test', 'format'], '/route', ['/route', 'route', undefined]],
  ['/:test.:format?', ['test', 'format'], '/route.json', ['/route.json', 'route', 'json']],
  ['/:test.:format?', ['test', 'format'], '/route', ['/route', 'route', undefined], { end: false }],
  ['/:test.:format?', ['test', 'format'], '/route.json', ['/route.json', 'route', 'json'], { end: false }],
  ['/:test.:format?', ['test', 'format'], '/route.json.html', ['/route.json.html', 'route.json', 'html'], { end: false }],
  ['/test.:format(.*)z', ['format'], '/test.abc', null, { end: false }],
  ['/test.:format(.*)z', ['format'], '/test.abcz', ['/test.abcz', 'abc'], { end: false }],

  // Unnamed params.
  ['/(\\d+)', ['0'], '/123', ['/123', '123']],
  ['/(\\d+)', ['0'], '/abc', null],
  ['/(\\d+)', ['0'], '/123/abc', null],
  ['/(\\d+)', ['0'], '/123/abc', ['/123', '123'], { end: false }],
  ['/(\\d+)', ['0'], '/abc', null, { end: false }],
  ['/(\\d+)?', ['0'], '/', ['/', undefined]],
  ['/(\\d+)?', ['0'], '/123', ['/123', '123']],
  ['/(.*)', ['0'], '/route', ['/route', 'route']],
  ['/(.*)', ['0'], '/route/nested', ['/route/nested', 'route/nested']],

  // Regexps.
  [/.*/, [], '/match/anything', ['/match/anything']],
  [/(.*)/, ['0'], '/match/anything', ['/match/anything', '/match/anything']],
  [/\/(\d+)/, ['0'], '/123', ['/123', '123']],

  // Mixed arrays.
  [['/test', /\/(\d+)/], ['0'], '/test', ['/test', undefined]],
  [['/:test(\\d+)', /(.*)/], ['test', '0'], '/123', ['/123', '123', undefined]],
  [['/:test(\\d+)', /(.*)/], ['test', '0'], '/abc', ['/abc', undefined, '/abc']],

  // Correct names and indexes.
  [['/:test', '/route/:test'], ['test', 'test'], '/test', ['/test', 'test', undefined]],
  [['/:test', '/route/:test'], ['test', 'test'], '/route/test', ['/route/test', undefined, 'test']],
  [[/^\/([^\/]+)$/, /^\/route\/([^\/]+)$/], ['0', '0'], '/test', ['/test', 'test', undefined]],
  [[/^\/([^\/]+)$/, /^\/route\/([^\/]+)$/], ['0', '0'], '/route/test', ['/route/test', undefined, 'test']],

  // Ignore non-matching groups in regexps.
  [/(?:.*)/, [], '/anything/you/want', ['/anything/you/want']],

  // Respect escaped characters.
  ['/\\(testing\\)', [], '/testing', null],
  ['/\\(testing\\)', [], '/(testing)', ['/(testing)']],

  // Regexp special characters should be ignored outside matching groups.
  ['/.+*?=^!:${}[]|', [], '/.+*?=^!:${}[]|', ['/.+*?=^!:${}[]|']]
];

describe('path-to-regexp', function () {
  it('should not break when keys aren\'t provided', function () {
    var re = pathToRegexp('/:foo/:bar');

    assert.deepEqual(exec(re, '/test/route'), ['/test/route', 'test', 'route']);
  });

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

      // Check the params are as expected.
      assert.deepEqual(params, test[1]);

      // Run the regexp and check the result is expected.
      assert.deepEqual(exec(re, test[2]), test[3]);
    });
  });
});
