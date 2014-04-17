var pathToRegExp = require('./');
var assert = require('assert');

/**
 * Test matching the regexp and output an array for deep equal.
 *
 * @param  {RegExp} regexp
 * @param  {String} string
 * @return {Array}
 */
var match = function (regexp, string) {
  var match = regexp.exec(string);

  return match && Array.prototype.slice.call(match);
};

describe('path-to-regexp', function () {
  describe('strings', function () {
    it('should match simple paths', function () {
      var params = [];
      var re = pathToRegExp('/test', params);
      var m;

      assert.equal(params.length, 0);

      m = re.exec('/test');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/test');
    });

    it('should match express format params', function () {
      var params = [];
      var re = pathToRegExp('/:test', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/pathname');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/pathname');
      assert.equal(m[1], 'pathname');
    });

    it('should do strict matches', function () {
      var params = [];
      var re = pathToRegExp('/:test', params, { strict: true });
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/route');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route');
      assert.equal(m[1], 'route');

      m = re.exec('/route/');

      assert.ok(!m);
    });

    it('should allow optional express format params', function () {
      var params = [];
      var re = pathToRegExp('/:test?', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, true);

      m = re.exec('/route');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route');
      assert.equal(m[1], 'route');

      m = re.exec('/');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/');
      assert.equal(m[1], undefined);
    });

    it('should allow express format param regexps', function () {
      var params = [];
      var re = pathToRegExp('/:page(\\d+)', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'page');
      assert.equal(params[0].optional, false);

      m = re.exec('/56');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/56');
      assert.equal(m[1], '56');
    });

    it('should match without a prefixed slash', function () {
      var params = [];
      var m = pathToRegExp(':test', params).exec('string');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], 'string');
      assert.equal(m[1], 'string');
    });

    it('should not match format parts', function () {
      var params = [];
      var m = pathToRegExp('/:test.json', params).exec('/route.json');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route.json');
      assert.equal(m[1], 'route');
    });

    it('should match format parts', function () {
      var params = [];
      var re = pathToRegExp('/:test.:format', params);
      var m;

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'format');
      assert.equal(params[1].optional, false);

      m = re.exec('/route.json');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/route.json');
      assert.equal(m[1], 'route');
      assert.equal(m[2], 'json');

      m = re.exec('/route');

      assert.ok(!m);
    });

    it('should match route parts with a trailing format', function () {
      var params = [];
      var m = pathToRegExp('/:test.json', params).exec('/route.json');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route.json');
      assert.equal(m[1], 'route');
    });

    it('should match optional trailing routes', function () {
      var params = [];
      var m = pathToRegExp('/test*', params).exec('/test/route');

      assert.equal(params.length, 1);
      assert.equal(params[0], undefined);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test/route');
      assert.equal(m[1], '/route');
    });

    it('should match optional trailing routes after a param', function () {
      var params = [];
      var re = pathToRegExp('/:test*', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/test/route');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/test/route');
      assert.equal(m[1], 'test');
      assert.equal(m[2], '/route');

      m = re.exec('/testing');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/testing');
      assert.equal(m[1], 'testing');
      assert.equal(m[2], '');
    });

    it('should match optional trailing routes before a format', function () {
      var params = [];
      var re = pathToRegExp('/test*.json', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0], undefined);

      m = re.exec('/test.json');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test.json');
      assert.equal(m[1], '');

      m = re.exec('/testing.json');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/testing.json');
      assert.equal(m[1], 'ing');

      m = re.exec('/test/route.json');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test/route.json');
      assert.equal(m[1], '/route');
    });

    it('should match optional trailing routes after a param and before a format', function () {
      var params = [];
      var re = pathToRegExp('/:test*.json', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/testing.json');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/testing.json');
      assert.equal(m[1], 'testing');
      assert.equal(m[2], '');

      m = re.exec('/test/route.json');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/test/route.json');
      assert.equal(m[1], 'test');
      assert.equal(m[2], '/route');

      m = re.exec('.json');

      assert.ok(!m);
    });

    it('should match optional trailing routes between a normal param and a format param', function () {
      var params = [];
      var re = pathToRegExp('/:test*.:format', params);
      var m;

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'format');
      assert.equal(params[1].optional, false);

      m = re.exec('/testing.json');

      assert.equal(m.length, 4);
      assert.equal(m[0], '/testing.json');
      assert.equal(m[1], 'testing');
      assert.equal(m[2], '');
      assert.equal(m[3], 'json');

      m = re.exec('/test/route.json');

      assert.equal(m.length, 4);
      assert.equal(m[0], '/test/route.json');
      assert.equal(m[1], 'test');
      assert.equal(m[2], '/route');
      assert.equal(m[3], 'json');

      m = re.exec('/test');

      assert.ok(!m);

      m = re.exec('.json');

      assert.ok(!m);
    });

    it('should match optional trailing routes after a param and before an optional format param', function () {
      var params = [];
      var re = pathToRegExp('/:test*.:format?', params);
      var m;

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'format');
      assert.equal(params[1].optional, true);

      m = re.exec('/testing.json');

      assert.equal(m.length, 4);
      assert.equal(m[0], '/testing.json');
      assert.equal(m[1], 'testing');
      assert.equal(m[2], '');
      assert.equal(m[3], 'json');

      m = re.exec('/test/route.json');

      assert.equal(m.length, 4);
      assert.equal(m[0], '/test/route.json');
      assert.equal(m[1], 'test');
      assert.equal(m[2], '/route');
      assert.equal(m[3], 'json');

      m = re.exec('/test');

      assert.equal(m.length, 4);
      assert.equal(m[0], '/test');
      assert.equal(m[1], 'test');
      assert.equal(m[2], '');
      assert.equal(m[3], undefined);

      m = re.exec('.json');

      assert.ok(!m);
    });

    it('should match optional trailing routes inside optional express param', function () {
      var params = [];
      var re = pathToRegExp('/:test*?', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, true);

      m = re.exec('/test/route');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/test/route');
      assert.equal(m[1], 'test');
      assert.equal(m[2], '/route');

      m = re.exec('/test');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/test');
      assert.equal(m[1], 'test');
      assert.equal(m[2], '');

      m = re.exec('/');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/');
      assert.equal(m[1], undefined);
      assert.equal(m[2], undefined);
    });

    it('should do case insensitive matches', function () {
      var m = pathToRegExp('/test').exec('/TEST');

      assert.equal(m[0], '/TEST');
    });

    it('should do case sensitive matches', function () {
      var re = pathToRegExp('/test', null, { sensitive: true });
      var m;

      m = re.exec('/test');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/test');

      m = re.exec('/TEST');

      assert.ok(!m);
    });

    it('should do non-ending matches', function () {
      var params = [];
      var m = pathToRegExp('/:test', params, { end: false }).exec('/test/route');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test');
      assert.equal(m[1], 'test');
    });

    it('should match trailing slashes in non-ending non-strict mode', function () {
      var params = [];
      var re = pathToRegExp('/:test', params, { end: false });
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/test/');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test/');
      assert.equal(m[1], 'test');
    });

    it('should not match trailing slashes in non-ending strict mode', function () {
      var params = [];
      var re = pathToRegExp('/:test', params, { end: false, strict: true });

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/test/');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test');
      assert.equal(m[1], 'test');
    });

    it('should allow matching regexps after a slash', function () {
      var params = [];
      var re = pathToRegExp('/(\\d+)', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0], undefined);

      m = re.exec('/123');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/123');
      assert.equal(m[1], '123');
    });

    it('should match optional formats', function () {
      var params = [];
      var re = pathToRegExp('/:test.:format?', params);
      var m;

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'format');
      assert.equal(params[1].optional, true);

      m = re.exec('/route');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/route');
      assert.equal(m[1], 'route');
      assert.equal(m[2], undefined);

      m = re.exec('/route.json');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/route.json');
      assert.equal(m[1], 'route');
      assert.equal(m[2], 'json');
    });

    it('should match full paths with format by default', function () {
      var params = [];
      var m = pathToRegExp('/:test', params).exec('/test.json');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test.json');
      assert.equal(m[1], 'test.json');
    });

    it('should correctly add custom matching groups to the params array', function () {
      var params = [];
      var re = pathToRegExp('/:test/(.+)/(?:route)', params);

      assert.deepEqual(params, [{ name: 'test', optional: false }, undefined]);

      assert.deepEqual(match(re, '/test'), null);
      assert.deepEqual(match(re, '/test/route'), null);
      assert.deepEqual(match(re, '/test/path/route'), ['/test/path/route', 'test', 'path']);
    });

    it('should escape regexp special characters outside of matching groups', function () {
      var params = [];
      var re = pathToRegExp('/!(.*)$.json', params);

      assert.deepEqual(params, [undefined]);

      assert.deepEqual(match(re, '/test.json'), null);
      assert.deepEqual(match(re, '/!$.json'), ['/!$.json', '']);
      assert.deepEqual(match(re, '/!test$.json'), ['/!test$.json', 'test']);
      assert.deepEqual(match(re, '/!test/path$.json'), ['/!test/path$.json', 'test/path']);
    });

    it('should correctly detect nested custom matching groups and add to the params array', function () {
      var params = [];
      var re = pathToRegExp('/(\\d+([a-z]+))', params);

      assert.deepEqual(params, [undefined, undefined]);

      assert.deepEqual(match(re, '/123'), null);
      assert.deepEqual(match(re, '/123abc'), ['/123abc', '123abc', 'abc']);
    });

    it('should ignore escaped parentheses from matching groups', function () {
      var params = [];
      var re = pathToRegExp('/(abc\\(123\\))', params);

      assert.deepEqual(params, [undefined]);

      assert.deepEqual(match(re, '/abc'), null);
      assert.deepEqual(match(re, '/abc123'), null);
      assert.deepEqual(match(re, '/abc(123)'), ['/abc(123)', 'abc(123)']);
    });

    it('should allow path to regexp characters to be escaped', function () {
      var params = [];
      var re = pathToRegExp('/\\*', params);

      assert.deepEqual(params, []);

      assert.deepEqual(match(re, '/*'), ['/*']);
      assert.deepEqual(match(re, '/test'), null);
    });
  });

  describe('regexps', function () {
    it('should return the regexp', function () {
      assert.deepEqual(pathToRegExp(/.*/), /.*/);
    });
  });

  describe('arrays', function () {
    it('should join arrays parts', function () {
      var re = pathToRegExp(['/test', '/route']);

      assert.ok(re.exec('/test'));
      assert.ok(re.exec('/route'));
      assert.ok(!re.exec('/else'));
    });
  });
});
