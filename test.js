var pathToRegExp = require('./');
var assert = require('assert');

describe('path-to-regexp', function () {
  describe('strings', function () {
    it('should match simple paths', function () {
      var params = [];
      var m = pathToRegExp('/test', params).exec('/test');

      assert.equal(params.length, 0);

      assert.equal(m.length, 1);
      assert.equal(m[0], '/test');
    });

    it('should match express format params', function () {
      var params = [];
      var m = pathToRegExp('/:test', params).exec('/pathname');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

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

    it('should match wildcards', function () {
      var params = [];
      var m = pathToRegExp('/*', params).exec('/pathname');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 0);
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/pathname');
      assert.equal(m[1], 'pathname');
    });

    it('should match wildcards without leading /', function () {
      var params = [];
      var m = pathToRegExp('*', params).exec('/pathname');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 0);
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/pathname');
      assert.equal(m[1], '/pathname');
    });

    it('should match wildcards with express params', function () {
      var params = [];
      var m = pathToRegExp('/:test/*', params).exec('/pathone/pathtwo');

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);

      assert.equal(m.length, 3);
      assert.equal(m[0], '/pathone/pathtwo');
      assert.equal(m[1], 'pathone');
      assert.equal(m[2], 'pathtwo');
    });

    it('should match wildcards with express params (reverse order)', function () {
      var params = [];
      var m = pathToRegExp('/*/:test', params).exec('/pathone/pathtwo');

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 0);
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'test');
      assert.equal(params[1].optional, false);

      assert.equal(m.length, 3);
      assert.equal(m[0], '/pathone/pathtwo');
      assert.equal(m[1], 'pathone');
      assert.equal(m[2], 'pathtwo');
    });

    it('should match wildcards with express params (reverse order, no leading /)', function () {
      var params = [];
      var m = pathToRegExp('*/:test', params).exec('/pathone/pathtwo');

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 0);
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'test');
      assert.equal(params[1].optional, false);

      assert.equal(m.length, 3);
      assert.equal(m[0], '/pathone/pathtwo');
      assert.equal(m[1], '/pathone');
      assert.equal(m[2], 'pathtwo');
    });

    it('should have proper indexes when using multiple wildcards', function () {
      var params = [];
      var m = pathToRegExp('*/:test/*/:foo/*/:bar/*', params).exec('/a/b/c/d/e/f/g');

      assert.equal(params.length, 7);
      assert.equal(params[0].name, 0);
      assert.equal(params[1].name, 'test');
      assert.equal(params[2].name, 1);
      assert.equal(params[3].name, 'foo');
      assert.equal(params[4].name, 2);
      assert.equal(params[5].name, 'bar');
      assert.equal(params[6].name, 3);

      assert.equal(m.length, 8);
      assert.equal(m[0], '/a/b/c/d/e/f/g');
      assert.equal(m[1], '/a');
      assert.equal(m[2], 'b');
      assert.equal(m[3], 'c');
      assert.equal(m[4], 'd');
      assert.equal(m[5], 'e');
      assert.equal(m[6], 'f');
      assert.equal(m[7], 'g');
    });

    it('should have proper indexes with matching groups', function () {
      var params = [];
      var m = pathToRegExp('/:foo((\\d)+)/:bar', params).exec('/123/abc');

      assert.equal(params.length, 3);
      assert.equal(params[0].name, 'foo');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);
      assert.equal(params[2].name, 'bar');
      assert.equal(params[2].optional, false);

      assert.equal(m.length, 4);
      assert.equal(m[0], '/123/abc');
      assert.equal(m[1], '3');
      assert.equal(m[2], '3');
      assert.equal(m[3], 'abc');
    });

    it('should do strict matches with trailing slashes', function () {
      var params = [];
      var re = pathToRegExp('/:test/', params, { strict: true });
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
      var m = pathToRegExp('/:page(\\d+)', params).exec('/56');

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'page');
      assert.equal(params[0].optional, false);

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
      assert.equal(params[0].name, 0);
      assert.equal(params[0].optional, false);

      assert.equal(m.length, 2);
      assert.equal(m[0], '/test/route');
      assert.equal(m[1], '/route');
    });

    it('should match optional trailing routes after a param', function () {
      var params = [];
      var re = pathToRegExp('/:test*', params);
      var m;

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);

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
      assert.equal(params[0].name, 0);
      assert.equal(params[0].optional, false);

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

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);

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

      assert.equal(params.length, 3);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);
      assert.equal(params[2].name, 'format');
      assert.equal(params[2].optional, false);

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

      assert.equal(params.length, 3);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);
      assert.equal(params[2].name, 'format');
      assert.equal(params[2].optional, true);

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

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, true);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);

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

    it('should match trailing slashes in non-ending non-strict mode', function () {
      var params = [];
      var re = pathToRegExp('/route/', params, { end: false });
      var m;

      assert.equal(params.length, 0);

      m = re.exec('/route/');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route/');

      m = re.exec('/route/test');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route');

      m = re.exec('/route');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route');

      m = re.exec('/route//');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route/');
    });

    it('should match trailing slashing in non-ending strict mode', function () {
      var params = [];
      var re = pathToRegExp('/route/', params, { end: false, strict: true });
      var m;

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
      var re = pathToRegExp('/route', params, { end: false, strict: true });
      var m;

      assert.equal(params.length, 0);

      m = re.exec('/route');

      assert.equal(m.length, 1);
      assert.equal(m[0], '/route');

      m = re.exec('/route/');

      assert.ok(m.length, 1);
      assert.equal(m[0], '/route');
    });

    it('should match text after an express param', function () {
      var params = [];
      var re = pathToRegExp('/(:test)route', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);

      m = re.exec('/route');

      assert.ok(!m);

      m = re.exec('/testroute');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/testroute');
      assert.equal(m[1], 'test');

      m = re.exec('testroute');

      assert.ok(!m);
    });

    it('should match text after an optional express param', function () {
      var params = [];
      var re = pathToRegExp('/(:test?)route', params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, true);

      m = re.exec('/route');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route');
      assert.equal(m[1], undefined);

      m = re.exec('/testroute');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/testroute');
      assert.equal(m[1], 'test');

      m = re.exec('route');

      assert.ok(!m);
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
  });

  describe('regexps', function () {
    it('should return the regexp', function () {
      assert.deepEqual(pathToRegExp(/.*/), /.*/);
    });

    it('should pull out matching groups', function () {
      var params = [];
      var re = pathToRegExp(/(.*)/, params);
      var m;

      assert.equal(params.length, 1);
      assert.equal(params[0].name, 0);
      assert.equal(params[0].optional, false);

      m = re.exec('/route');

      assert.equal(m.length, 2);
      assert.equal(m[0], '/route');
      assert.equal(m[1], '/route');
    });

    it('should pull out matching named groups', function () {
      var params = [];
      var re = pathToRegExp(/\/(.*)\/(?<foo>.*)\/(.*)/, params);
      var m;

      assert.equal(params.length, 3);
      assert.equal(params[0].name, 0);
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 1);
      assert.equal(params[1].optional, false);
      assert.equal(params[2].name, 'foo');
      assert.equal(params[2].optional, false);

      m = re.exec('/foo/bar/baz');

      assert.equal(m.length, 4);
      assert.equal(m[0], '/foo/bar/baz');
      assert.equal(m[1], 'foo');
      assert.equal(m[2], 'bar');
      assert.equal(m[3], 'baz');
    })
  });

  describe('arrays', function () {
    it('should join arrays parts', function () {
      var re = pathToRegExp(['/test', '/route']);

      assert.ok(re.test('/test'));
      assert.ok(re.test('/route'));
      assert.ok(!re.test('/else'));
    });

    it('should match parts properly', function () {
      var params = [];
      var re = pathToRegExp(['/:test', '/*/route', '/test/:route'], params);
      var m;

      assert.equal(params.length, 3);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);
      assert.equal(params[2].name, 'route');
      assert.equal(params[2].optional, false);

      m = re.exec('/route');

      assert.equal(m.length, 4);
      assert.equal(m[0], '/route');
      assert.equal(m[1], 'route');
      assert.equal(m[2], undefined);
      assert.equal(m[3], undefined);

      m = re.exec('/test/path');

      assert.equal(m.length, 4);
      assert.equal(m[0], '/test/path');
      assert.equal(m[1], undefined);
      assert.equal(m[2], undefined);
      assert.equal(m[3], 'path');
    });
  });

  describe('regressions', function () {
    it('should work with strongloop/expressjs.com#417', function () {
      var params = [];
      var re = pathToRegExp('/:foo\\(:bar?\\)', params);
      var m;

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'foo');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'bar');
      assert.equal(params[1].optional, true);

      m = re.exec('/hello(world)');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/hello(world)');
      assert.equal(m[1], 'hello');
      assert.equal(m[2], 'world');
    });

    it('should handle an escaped escape character', function () {
      var params = [];
      var re = pathToRegExp('/:foo\\\\(world)', params);
      var m;

      assert.equal(params.length, 2);
      assert.equal(params[0].name, 'foo');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 0);
      assert.equal(params[1].optional, false);

      m = re.exec('/hello\\world');

      assert.equal(m.length, 3);
      assert.equal(m[0], '/hello\\world');
      assert.equal(m[1], 'hello');
      assert.equal(m[2], 'world');
    });
  });
});
