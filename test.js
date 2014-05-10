var pathToRegexp = require('./');
var assert = require('assert');

describe('path-to-regexp', function () {
  describe('strings', function () {
    it('should match simple paths', function () {
      var params = [];
      var m = pathToRegexp('/test', params).exec('/test');

      assert.equal(params.length, 0);

      assert.equal(m.length, 1);
      assert.equal(m[0], '/test');
    });

    it('should match named params', function () {
      var params = [];
      var m = pathToRegexp('/:test', params).exec('/pathname');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/pathname');
      assert.equal(m[1], 'pathname');
    });

    it('should do strict matches', function () {
      var params = [];
      var re = pathToRegexp('/:test', params, { strict: true });
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

    it('should do strict matches with trailing slashes', function () {
      var params = [];
      var re = pathToRegexp('/:test/', params, { strict: true });
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/route');

      assert.ok(!m);

      m = re.exec('/route/');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route/');
      assert.equal(m[1], 'route');

      m = re.exec('/route//');

      assert.ok(!m);
    });

    it('should allow optional named params', function () {
      var params = [];
      var re = pathToRegexp('/:test?', params);
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

    it('should allow params to have custom matching groups', function () {
      var params = [];
      var m = pathToRegexp('/:page(\\d+)', params).exec('/56');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'page');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/56');
      assert.equal(m[1], '56');
    });

    it('should match without a prefixed slash', function () {
      var params = [];
      var m = pathToRegexp(':test', params).exec('string');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], 'string');
      assert.equal(m[1], 'string');
    });

    it('should not match the format', function () {
      var params = [];
      var m = pathToRegexp('/:test.json', params).exec('/route.json');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route.json');
      assert.equal(m[1], 'route');
    });

    it('should match format params', function () {
      var params = [];
      var re = pathToRegexp('/:test.:format', params);
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

    it('should match a param with a trailing format', function () {
      var params = [];
      var m = pathToRegexp('/:test.json', params).exec('/route.json');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route.json');
      assert.equal(m[1], 'route');
    });

    it('should do greedy matches', function () {
      var params = [];
      var re = pathToRegexp('/test*', params);
      var m;

      assert.equal(params.length, 0);

      m = re.exec('/test/route');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test/route');
      assert.equal(m[1], '/route');

      m = re.exec('/test');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test');
      assert.equal(m[1], '');
    });

    it('should do greedy param matches', function () {
      var params = [];
      var re = pathToRegexp('/:test*', params);
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

    it('should do greedy matches with a trailing format', function () {
      var params = [];
      var re = pathToRegexp('/test*.json', params);
      var m;

      assert.equal(params.length, 0);

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

    it('should do greedy param matches with a trailing format', function () {
      var params = [];
      var re = pathToRegexp('/:test*.json', params);
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

    it('should do greedy param matches with a trailing format param', function () {
      var params = [];
      var re = pathToRegexp('/:test*.:format', params);
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

    it('should do greedy param matches with an optional trailing format param', function () {
      var params = [];
      var re = pathToRegexp('/:test*.:format?', params);
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

    it('should do greedy, optional param matching', function () {
      var params = [];
      var re = pathToRegexp('/:test*?', params);
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

    it('should do greedy, optional param matching with a custom matching group', function () {
      var params = [];
      var re = pathToRegexp('/:test(\\d+)*?', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, true);

      m = re.exec('/123');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/123');
      assert.equal(m[1], '123');
      assert.equal(m[2], '');

      m = re.exec('/123/foo/bar');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/123/foo/bar');
      assert.equal(m[1], '123');
      assert.equal(m[2], '/foo/bar');

      m = re.exec('/foo/bar');

      assert.ok(!m);
    });

    it('should do case insensitive matches', function () {
      var m = pathToRegexp('/test').exec('/TEST');

      assert.equal(m[0], '/TEST');
    });

    it('should do case sensitive matches', function () {
      var re = pathToRegexp('/test', null, { sensitive: true });
      var m;

      m = re.exec('/test');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/test');

      m = re.exec('/TEST');

      assert.ok(!m);
    });

    it('should do non-ending matches', function () {
      var params = [];
      var m = pathToRegexp('/:test', params, { end: false }).exec('/test/route');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test');
      assert.equal(m[1], 'test');
    });

    it('should work with trailing slashes in non-ending mode', function () {
      var params = [];
      var re = pathToRegexp('/:test', params, { end: false });
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/foo/bar');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/foo');
      assert.equal(m[1], 'foo');

      m = re.exec('/foo/');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/foo/');
      assert.equal(m[1], 'foo');
    });

    it('should match trailing slashing in non-ending strict mode', function () {
      var params = [];
      var re = pathToRegexp('/route/', params, { end: false, strict: true });

      assert.equal(params.length, 0);

      m = re.exec('/route/');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route/');

      m = re.exec('/route/test');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route/');

      m = re.exec('/route');

      assert.ok(!m);

      m = re.exec('/route//');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route/');
    });

    it('should not match trailing slashes in non-ending strict mode', function () {
      var params = [];
      var re = pathToRegexp('/route', params, { end: false, strict: true });

      assert.equal(params.length, 0);

      m = re.exec('/route');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route');

      m = re.exec('/route/');

      assert.ok(m.length, 1);
      assert.equal(m[0], '/route');
    });

    it('should allow matching regexps after a slash', function () {
      var params = [];
      var re = pathToRegexp('/(\\d+)', params);
      var m;

      assert.equal(params.length, 0);

      m = re.exec('/123');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/123');
      assert.equal(m[1], '123');
    });

    it('should match optional format params', function () {
      var params = [];
      var re = pathToRegexp('/:test.:format?', params);
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

    it('should match full paths when not prefixed with a period', function () {
      var params = [];
      var m = pathToRegexp('/:test', params).exec('/test.json');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test.json');
      assert.equal(m[1], 'test.json');
    });
  });

  describe('regexps', function () {
    it('should return the regexp', function () {
      assert.deepEqual(pathToRegexp(/.*/), /.*/);
    });
  });

  describe('arrays', function () {
    it('should join arrays parts', function () {
      var re = pathToRegexp(['/test', '/route']);

      assert.ok(re.test('/test'));
      assert.ok(re.test('/route'));
      assert.ok(!re.test('/else'));
    });

    it('should match parts properly', function () {
      var params = [];
      var re = pathToRegexp(['/:test', '/test/:route'], params);
      var m;

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'route');
      assert.equal(params[1].optional, false);

      m = re.exec('/route');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/route');
      assert.equal(m[1], 'route');
      assert.equal(m[2], undefined);

      m = re.exec('/test/path');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/test/path');
      assert.equal(m[1], undefined);
      assert.equal(m[2], 'path');
    });
  });
});
