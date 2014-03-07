var pathToRegExp = require('./');
var assert       = require('assert');

describe('path-to-regexp', function () {
  describe('strings', function () {
    it('should match simple paths', function () {
      var m = pathToRegExp('/test').exec('/test');

      assert.equal(m[0], '/test');
    });

    it('should match express format params', function () {
      var params = [];
      var m      = pathToRegExp('/:test', params).exec('/pathname');

      assert.equal(m[1], 'pathname');
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
    });

    it('should do strict matches', function () {
      var params = [];
      var m      = pathToRegExp('/:test', params, { strict: true }).exec('/route');

      assert.equal(m[1], 'route');
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
    });

    it('should allow optional express format params', function () {
      var params = [];
      var re     = pathToRegExp('/:test?', params);
      var m;

      m = re.exec('/route');

      assert.equal(m[1], 'route');
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, true);

      m = re.exec('/');

      assert.equal(m[1], undefined);
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, true);
    });

    it('should allow express format param regexps', function () {
      var params = [];
      var m      = pathToRegExp('/:page([0-9]+)', params).exec('/56');

      assert.equal(m[1], '56');
      assert.equal(params[0].name, 'page');
      assert.equal(params[0].optional, false);
    });

    it('should match without prefixed slash', function () {
      var params = [];
      var m      = pathToRegExp(':test', params).exec('string');

      assert.equal(m[0], 'string');
      assert.equal(m[1], 'string');
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
    });

    it('should not match format parts', function () {
      var params = [];
      var m      = pathToRegExp('/:test.json', params).exec('/route.json');

      assert.equal(m[1], 'route');
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
    });

    it('should match format parts', function () {
      var params = [];
      var m      = pathToRegExp('/:test.:format', params).exec('/app.json');

      assert.equal(m[1], 'app');
      assert.equal(m[2], 'json');
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(params[1].name, 'format');
      assert.equal(params[1].optional, false);
    });

    it('should match optional trailing routes', function () {
      var params = [];
      var m      = pathToRegExp('/test*', params).exec('/test/route');

      assert.equal(m[1], '/route');
      assert.equal(params.length, 0);
    });

    it('should match optional trailing routes after a param', function () {
      var params = [];
      var m      = pathToRegExp('/:test*', params).exec('/test/route');

      assert.equal(m[1], 'test');
      assert.equal(m[2], '/route');
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
      assert.equal(m.length, 3);
    });

    it('should do case insensitive matches', function () {
      var m = pathToRegExp('/test').exec('/TEST');

      assert.equal(m[0], '/TEST');
    });

    it('should do case sensitive matches', function () {
      var m = pathToRegExp('/test', [], { sensitive: true }).exec('/TEST');

      assert.ok(!m);
    });

    it('should do non-ending matches', function () {
      var params = [];
      var m      = pathToRegExp('/:test', params, { end: false }).exec('/test/route');

      assert.equal(m[1], 'test');
      assert.equal(params[0].name, 'test');
      assert.equal(params[0].optional, false);
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
