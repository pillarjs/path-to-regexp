/* global describe, it */

/// <reference path="typings/index.d.ts" />

import util = require('util')
import chai = require('chai')
import pathToRegexp = require('./index')

const expect = chai.expect

type Test = [
  pathToRegexp.Path,
  pathToRegexp.Options,
  pathToRegexp.Token[],
  Array<[string, string[]]>,
  Array<[any, string]>
]

/**
 * An array of test cases with expected inputs and outputs.
 *
 * @type {Array}
 */
var TESTS: Test[] = [
  /**
   * Simple paths.
   */
  [
    '/',
    null,
    [
      '/'
    ],
    [
      ['/', ['/']],
      ['/route', null]
    ],
    [
      [null, '/'],
      [{}, '/'],
      [{ id: 123 }, '/']
    ]
  ],
  [
    '/test',
    null,
    [
      '/test'
    ],
    [
      ['/test', ['/test']],
      ['/route', null],
      ['/test/route', null],
      ['/test/', ['/test/']]
    ],
    [
      [null, '/test'],
      [{}, '/test']
    ]
  ],
  [
    '/test/',
    null,
    [
      '/test/'
    ],
    [
      ['/test', ['/test']],
      ['/test/', ['/test/']],
      ['/test//', null]
    ],
    [
      [null, '/test/']
    ]
  ],

  /**
   * Case-sensitive paths.
   */
  [
    '/test',
    {
      sensitive: true
    },
    [
      '/test'
    ],
    [
      ['/test', ['/test']],
      ['/TEST', null]
    ],
    [
      [null, '/test']
    ]
  ],
  [
    '/TEST',
    {
      sensitive: true
    },
    [
      '/TEST'
    ],
    [
      ['/test', null],
      ['/TEST', ['/TEST']]
    ],
    [
      [null, '/TEST']
    ]
  ],

  /**
   * Strict mode.
   */
  [
    '/test',
    {
      strict: true
    },
    [
      '/test'
    ],
    [
      ['/test', ['/test']],
      ['/test/', null],
      ['/TEST', ['/TEST']]
    ],
    [
      [null, '/test']
    ]
  ],
  [
    '/test/',
    {
      strict: true
    },
    [
      '/test/'
    ],
    [
      ['/test', null],
      ['/test/', ['/test/']],
      ['/test//', null]
    ],
    [
      [null, '/test/']
    ]
  ],

  /**
   * Non-ending mode.
   */
  [
    '/test',
    {
      end: false
    },
    [
      '/test'
    ],
    [
      ['/test', ['/test']],
      ['/test/', ['/test/']],
      ['/test/route', ['/test']],
      ['/route', null]
    ],
    [
      [null, '/test']
    ]
  ],
  [
    '/test/',
    {
      end: false
    },
    [
      '/test/'
    ],
    [
      ['/test/route', ['/test']],
      ['/test//', ['/test']],
      ['/test//route', ['/test']]
    ],
    [
      [null, '/test/']
    ]
  ],
  [
    '/:test',
    {
      end: false
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']]
    ],
    [
      [{}, null],
      [{ test: 'abc' }, '/abc']
    ]
  ],
  [
    '/:test/',
    {
      end: false
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '/'
    ],
    [
      ['/route', ['/route', 'route']]
    ],
    [
      [{ test: 'abc' }, '/abc/']
    ]
  ],

  /**
   * Combine modes.
   */
  [
    '/test',
    {
      end: false,
      strict: true
    },
    [
      '/test'
    ],
    [
      ['/test', ['/test']],
      ['/test/', ['/test']],
      ['/test/route', ['/test']]
    ],
    [
      [null, '/test']
    ]
  ],
  [
    '/test/',
    {
      end: false,
      strict: true
    },
    [
      '/test/'
    ],
    [
      ['/test', null],
      ['/test/', ['/test/']],
      ['/test//', ['/test/']],
      ['/test/route', ['/test/']]
    ],
    [
      [null, '/test/']
    ]
  ],
  [
    '/test.json',
    {
      end: false,
      strict: true
    },
    [
      '/test.json'
    ],
    [
      ['/test.json', ['/test.json']],
      ['/test.json.hbs', null],
      ['/test.json/route', ['/test.json']]
    ],
    [
      [null, '/test.json']
    ]
  ],
  [
    '/:test',
    {
      end: false,
      strict: true
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']],
      ['/route/', ['/route', 'route']]
    ],
    [
      [{}, null],
      [{ test: 'abc' }, '/abc']
    ]
  ],
  [
    '/:test/',
    {
      end: false,
      strict: true
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '/'
    ],
    [
      ['/route', null],
      ['/route/', ['/route/', 'route']]
    ],
    [
      [{ test: 'foobar' }, '/foobar/']
    ]
  ],

  /**
   * Arrays of simple paths.
   */
  [
    ['/one', '/two'],
    null,
    [],
    [
      ['/one', ['/one']],
      ['/two', ['/two']],
      ['/three', null],
      ['/one/two', null]
    ],
    []
  ],

  /**
   * Non-ending simple path.
   */
  [
    '/test',
    {
      end: false
    },
    [
      '/test'
    ],
    [
      ['/test/route', ['/test']]
    ],
    [
      [null, '/test']
    ]
  ],

  /**
   * Single named parameter.
   */
  [
    '/:test',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']],
      ['/another', ['/another', 'another']],
      ['/something/else', null],
      ['/route.json', ['/route.json', 'route.json']],
      ['/something%2Felse', ['/something%2Felse', 'something%2Felse']],
      ['/something%2Felse%2Fmore', ['/something%2Felse%2Fmore', 'something%2Felse%2Fmore']],
      ['/;,:@&=+$-_.!~*()', ['/;,:@&=+$-_.!~*()', ';,:@&=+$-_.!~*()']]
    ],
    [
      [{ test: 'route' }, '/route'],
      [{ test: 'something/else' }, '/something%2Felse'],
      [{ test: 'something/else/more' }, '/something%2Felse%2Fmore']
    ]
  ],
  [
    '/:test',
    {
      strict: true
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']],
      ['/route/', null]
    ],
    [
      [{ test: 'route' }, '/route']
    ]
  ],
  [
    '/:test/',
    {
      strict: true
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '/'
    ],
    [
      ['/route/', ['/route/', 'route']],
      ['/route//', null]
    ],
    [
      [{ test: 'route' }, '/route/']
    ]
  ],
  [
    '/:test',
    {
      end: false
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route.json', ['/route.json', 'route.json']],
      ['/route//', ['/route', 'route']]
    ],
    [
      [{ test: 'route' }, '/route']
    ]
  ],

  /**
   * Optional named parameter.
   */
  [
    '/:test?',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']],
      ['/route/nested', null],
      ['/', ['/', undefined]],
      ['//', null]
    ],
    [
      [null, ''],
      [{ test: 'foobar' }, '/foobar']
    ]
  ],
  [
    '/:test?',
    {
      strict: true
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']],
      ['/', null], // Questionable behaviour.
      ['//', null]
    ],
    [
      [null, ''],
      [{ test: 'foobar' }, '/foobar']
    ]
  ],
  [
    '/:test?/',
    {
      strict: true
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '/'
    ],
    [
      ['/route', null],
      ['/route/', ['/route/', 'route']],
      ['/', ['/', undefined]],
      ['//', null]
    ],
    [
      [null, '/'],
      [{ test: 'foobar' }, '/foobar/']
    ]
  ],
  [
    '/:test?/bar',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '/bar'
    ],
    [
      ['/foo/bar', ['/foo/bar', 'foo']]
    ],
    [
      [{ test: 'foo' }, '/foo/bar']
    ]
  ],
  [
    '/:test?-bar',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '-bar'
    ],
    [
      ['/-bar', ['/-bar', undefined]],
      ['/foo-bar', ['/foo-bar', 'foo']]
    ],
    [
      [{ test: 'foo' }, '/foo-bar']
    ]
  ],

  /**
   * Repeated one or more times parameters.
   */
  [
    '/:test+',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: true,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/', null],
      ['/route', ['/route', 'route']],
      ['/some/basic/route', ['/some/basic/route', 'some/basic/route']],
      ['//', null]
    ],
    [
      [{}, null],
      [{ test: 'foobar' }, '/foobar'],
      [{ test: ['a', 'b', 'c'] }, '/a/b/c']
    ]
  ],
  [
    '/:test(\\d+)+',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: true,
        partial: false,
        asterisk: false,
        pattern: '\\d+'
      }
    ],
    [
      ['/abc/456/789', null],
      ['/123/456/789', ['/123/456/789', '123/456/789']]
    ],
    [
      [{ test: 'abc' }, null],
      [{ test: 123 }, '/123'],
      [{ test: [1, 2, 3] }, '/1/2/3']
    ]
  ],
  [
    '/route.:ext(json|xml)+',
    null,
    [
      '/route',
      {
        name: 'ext',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: true,
        partial: false,
        asterisk: false,
        pattern: 'json|xml'
      }
    ],
    [
      ['/route', null],
      ['/route.json', ['/route.json', 'json']],
      ['/route.xml.json', ['/route.xml.json', 'xml.json']],
      ['/route.html', null]
    ],
    [
      [{ ext: 'foobar' }, null],
      [{ ext: 'xml' }, '/route.xml'],
      [{ ext: ['xml', 'json'] }, '/route.xml.json']
    ]
  ],

  /**
   * Repeated zero or more times parameters.
   */
  [
    '/:test*',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: true,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/', ['/', undefined]],
      ['//', null],
      ['/route', ['/route', 'route']],
      ['/some/basic/route', ['/some/basic/route', 'some/basic/route']]
    ],
    [
      [{}, ''],
      [{ test: 'foobar' }, '/foobar'],
      [{ test: ['foo', 'bar'] }, '/foo/bar']
    ]
  ],
  [
    '/route.:ext([a-z]+)*',
    null,
    [
      '/route',
      {
        name: 'ext',
        prefix: '.',
        delimiter: '.',
        optional: true,
        repeat: true,
        partial: false,
        asterisk: false,
        pattern: '[a-z]+'
      }
    ],
    [
      ['/route', ['/route', undefined]],
      ['/route.json', ['/route.json', 'json']],
      ['/route.json.xml', ['/route.json.xml', 'json.xml']],
      ['/route.123', null]
    ],
    [
      [{}, '/route'],
      [{ ext: [] }, '/route'],
      [{ ext: '123' }, null],
      [{ ext: 'foobar' }, '/route.foobar'],
      [{ ext: ['foo', 'bar'] }, '/route.foo.bar']
    ]
  ],

  /**
   * Custom named parameters.
   */
  [
    '/:test(\\d+)',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\d+'
      }
    ],
    [
      ['/123', ['/123', '123']],
      ['/abc', null],
      ['/123/abc', null]
    ],
    [
      [{ test: 'abc' }, null],
      [{ test: '123' }, '/123']
    ]
  ],
  [
    '/:test(\\d+)',
    {
      end: false
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\d+'
      }
    ],
    [
      ['/123', ['/123', '123']],
      ['/abc', null],
      ['/123/abc', ['/123', '123']]
    ],
    [
      [{ test: '123' }, '/123']
    ]
  ],
  [
    '/:test(.*)',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '.*'
      }
    ],
    [
      ['/anything/goes/here', ['/anything/goes/here', 'anything/goes/here']],
      ['/;,:@&=/+$-_.!/~*()', ['/;,:@&=/+$-_.!/~*()', ';,:@&=/+$-_.!/~*()']]
    ],
    [
      [{ test: '' }, '/'],
      [{ test: 'abc' }, '/abc'],
      [{ test: 'abc/123' }, '/abc%2F123'],
      [{ test: 'abc/123/456' }, '/abc%2F123%2F456']
    ]
  ],
  [
    '/:route([a-z]+)',
    null,
    [
      {
        name: 'route',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[a-z]+'
      }
    ],
    [
      ['/abcde', ['/abcde', 'abcde']],
      ['/12345', null]
    ],
    [
      [{ route: '' }, null],
      [{ route: '123' }, null],
      [{ route: 'abc' }, '/abc']
    ]
  ],
  [
    '/:route(this|that)',
    null,
    [
      {
        name: 'route',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: 'this|that'
      }
    ],
    [
      ['/this', ['/this', 'this']],
      ['/that', ['/that', 'that']],
      ['/foo', null]
    ],
    [
      [{ route: 'this' }, '/this'],
      [{ route: 'foo' }, null],
      [{ route: 'that' }, '/that']
    ]
  ],
  [
    '/:path(abc|xyz)*',
    null,
    [
      {
        name: 'path',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: true,
        partial: false,
        asterisk: false,
        pattern: 'abc|xyz'
      }
    ],
    [
      ['/abc', ['/abc', 'abc']],
      ['/abc/abc', ['/abc/abc', 'abc/abc']],
      ['/xyz/xyz', ['/xyz/xyz', 'xyz/xyz']],
      ['/abc/xyz', ['/abc/xyz', 'abc/xyz']],
      ['/abc/xyz/abc/xyz', ['/abc/xyz/abc/xyz', 'abc/xyz/abc/xyz']],
      ['/xyzxyz', null]
    ],
    [
      [{ path: 'abc' }, '/abc'],
      [{ path: ['abc', 'xyz'] }, '/abc/xyz'],
      [{ path: ['xyz', 'abc', 'xyz'] }, '/xyz/abc/xyz'],
      [{ path: 'abc123' }, null],
      [{ path: 'abcxyz' }, null]
    ]
  ],

  /**
   * Prefixed slashes could be omitted.
   */
  [
    'test',
    null,
    [
      'test'
    ],
    [
      ['test', ['test']],
      ['/test', null]
    ],
    [
      [null, 'test']
    ]
  ],
  [
    ':test',
    null,
    [
      {
        name: 'test',
        prefix: '',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['route', ['route', 'route']],
      ['/route', null],
      ['route/', ['route/', 'route']]
    ],
    [
      [{ test: '' }, null],
      [{}, null],
      [{ test: null }, null],
      [{ test: 'route' }, 'route']
    ]
  ],
  [
    ':test',
    {
      strict: true
    },
    [
      {
        name: 'test',
        prefix: '',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['route', ['route', 'route']],
      ['/route', null],
      ['route/', null]
    ],
    [
      [{ test: 'route' }, 'route']
    ]
  ],
  [
    ':test',
    {
      end: false
    },
    [
      {
        name: 'test',
        prefix: '',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['route', ['route', 'route']],
      ['/route', null],
      ['route/', ['route/', 'route']],
      ['route/foobar', ['route', 'route']]
    ],
    [
      [{ test: 'route' }, 'route']
    ]
  ],
  [
    ':test?',
    null,
    [
      {
        name: 'test',
        prefix: '',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['route', ['route', 'route']],
      ['/route', null],
      ['', ['', undefined]],
      ['route/foobar', null]
    ],
    [
      [{}, ''],
      [{ test: '' }, null],
      [{ test: 'route' }, 'route']
    ]
  ],

  /**
   * Formats.
   */
  [
    '/test.json',
    null,
    [
      '/test.json'
    ],
    [
      ['/test.json', ['/test.json']],
      ['/route.json', null]
    ],
    [
      [{}, '/test.json']
    ]
  ],
  [
    '/:test.json',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '.json'
    ],
    [
      ['/.json', null],
      ['/test.json', ['/test.json', 'test']],
      ['/route.json', ['/route.json', 'route']],
      ['/route.json.json', ['/route.json.json', 'route.json']]
    ],
    [
      [{ test: '' }, null],
      [{ test: 'foo' }, '/foo.json']
    ]
  ],

  /**
   * Format params.
   */
  [
    '/test.:format',
    null,
    [
      '/test',
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      }
    ],
    [
      ['/test.html', ['/test.html', 'html']],
      ['/test.hbs.html', null]
    ],
    [
      [{}, null],
      [{ format: '' }, null],
      [{ format: 'foo' }, '/test.foo']
    ]
  ],
  [
    '/test.:format.:format',
    null,
    [
      '/test',
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      },
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      }
    ],
    [
      ['/test.html', null],
      ['/test.hbs.html', ['/test.hbs.html', 'hbs', 'html']]
    ],
    [
      [{ format: 'foo.bar' }, null],
      [{ format: 'foo' }, '/test.foo.foo']
    ]
  ],
  [
    '/test.:format+',
    null,
    [
      '/test',
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: true,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      }
    ],
    [
      ['/test.html', ['/test.html', 'html']],
      ['/test.hbs.html', ['/test.hbs.html', 'hbs.html']]
    ],
    [
      [{ format: [] }, null],
      [{ format: 'foo' }, '/test.foo'],
      [{ format: ['foo', 'bar'] }, '/test.foo.bar']
    ]
  ],
  [
    '/test.:format',
    {
      end: false
    },
    [
      '/test',
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      }
    ],
    [
      ['/test.html', ['/test.html', 'html']],
      ['/test.hbs.html', null]
    ],
    [
      [{ format: 'foo' }, '/test.foo']
    ]
  ],
  [
    '/test.:format.',
    null,
    [
      '/test',
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      },
      '.'
    ],
    [
      ['/test.html.', ['/test.html.', 'html']],
      ['/test.hbs.html', null]
    ],
    [
      [{ format: '' }, null],
      [{ format: 'foo' }, '/test.foo.']
    ]
  ],

  /**
   * Format and path params.
   */
  [
    '/:test.:format',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      }
    ],
    [
      ['/route.html', ['/route.html', 'route', 'html']],
      ['/route', null],
      ['/route.html.json', ['/route.html.json', 'route.html', 'json']]
    ],
    [
      [{}, null],
      [{ test: 'route', format: 'foo' }, '/route.foo']
    ]
  ],
  [
    '/:test.:format?',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      }
    ],
    [
      ['/route', ['/route', 'route', undefined]],
      ['/route.json', ['/route.json', 'route', 'json']],
      ['/route.json.html', ['/route.json.html', 'route.json', 'html']]
    ],
    [
      [{ test: 'route' }, '/route'],
      [{ test: 'route', format: '' }, null],
      [{ test: 'route', format: 'foo' }, '/route.foo']
    ]
  ],
  [
    '/:test.:format?',
    {
      end: false
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^.]+?'
      }
    ],
    [
      ['/route', ['/route', 'route', undefined]],
      ['/route.json', ['/route.json', 'route', 'json']],
      ['/route.json.html', ['/route.json.html', 'route.json', 'html']]
    ],
    [
      [{ test: 'route' }, '/route'],
      [{ test: 'route', format: undefined }, '/route'],
      [{ test: 'route', format: '' }, null],
      [{ test: 'route', format: 'foo' }, '/route.foo']
    ]
  ],
  [
    '/test.:format(.*)z',
    {
      end: false
    },
    [
      '/test',
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '.*'
      },
      'z'
    ],
    [
      ['/test.abc', null],
      ['/test.z', ['/test.z', '']],
      ['/test.abcz', ['/test.abcz', 'abc']]
    ],
    [
      [{}, null],
      [{ format: '' }, '/test.z'],
      [{ format: 'foo' }, '/test.fooz']
    ]
  ],

  /**
   * Unnamed params.
   */
  [
    '/(\\d+)',
    null,
    [
      {
        name: 0,
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\d+'
      }
    ],
    [
      ['/123', ['/123', '123']],
      ['/abc', null],
      ['/123/abc', null]
    ],
    [
      [{}, null],
      [{ '0': '123' }, '/123']
    ]
  ],
  [
    '/(\\d+)',
    {
      end: false
    },
    [
      {
        name: 0,
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\d+'
      }
    ],
    [
      ['/123', ['/123', '123']],
      ['/abc', null],
      ['/123/abc', ['/123', '123']],
      ['/123/', ['/123/', '123']]
    ],
    [
      [{ '0': '123' }, '/123']
    ]
  ],
  [
    '/(\\d+)?',
    null,
    [
      {
        name: 0,
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\d+'
      }
    ],
    [
      ['/', ['/', undefined]],
      ['/123', ['/123', '123']]
    ],
    [
      [{}, ''],
      [{ '0': '123' }, '/123']
    ]
  ],
  [
    '/(.*)',
    null,
    [
      {
        name: 0,
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '.*'
      }
    ],
    [
      ['/', ['/', '']],
      ['/route', ['/route', 'route']],
      ['/route/nested', ['/route/nested', 'route/nested']]
    ],
    [
      [{ '0': '' }, '/'],
      [{ '0': '123' }, '/123']
    ]
  ],
  [
    '/route\\(\\\\(\\d+\\\\)\\)',
     null,
    [
      '/route(\\',
      {
        name: 0,
        prefix: '',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\d+\\\\'
      },
      ')'
    ],
    [
      ['/route(\\123\\)', ['/route(\\123\\)', '123\\']]
    ],
    []
  ],

  /**
   * Regexps.
   */
  [
    /.*/,
    null,
    [],
    [
      ['/match/anything', ['/match/anything']]
    ],
    []
  ],
  [
    /(.*)/,
    null,
    [
      {
        name: 0,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      }
    ],
    [
      ['/match/anything', ['/match/anything', '/match/anything']]
    ],
    []
  ],
  [
    /\/(\d+)/,
    null,
    [
      {
        name: 0,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      }
    ],
    [
      ['/abc', null],
      ['/123', ['/123', '123']]
    ],
    []
  ],

  /**
   * Mixed arrays.
   */
  [
    ['/test', /\/(\d+)/],
    null,
    [
      {
        name: 0,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      }
    ],
    [
      ['/test', ['/test', undefined]]
    ],
    []
  ],
  [
    ['/:test(\\d+)', /(.*)/],
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\d+'
      },
      {
        name: 0,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      }
    ],
    [
      ['/123', ['/123', '123', undefined]],
      ['/abc', ['/abc', undefined, '/abc']]
    ],
    []
  ],

  /**
   * Correct names and indexes.
   */
  [
    ['/:test', '/route/:test'],
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/test', ['/test', 'test', undefined]],
      ['/route/test', ['/route/test', undefined, 'test']]
    ],
    []
  ],
  [
    [/^\/([^\/]+)$/, /^\/route\/([^\/]+)$/],
    null,
    [
      {
        name: 0,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      },
      {
        name: 0,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: null
      }
    ],
    [
      ['/test', ['/test', 'test', undefined]],
      ['/route/test', ['/route/test', undefined, 'test']]
    ],
    []
  ],

  /**
   * Ignore non-matching groups in regexps.
   */
  [
    /(?:.*)/,
    null,
    [],
    [
      ['/anything/you/want', ['/anything/you/want']]
    ],
    []
  ],

  /**
   * Respect escaped characters.
   */
  [
    '/\\(testing\\)',
    null,
    [
      '/(testing)'
    ],
    [
      ['/testing', null],
      ['/(testing)', ['/(testing)']]
    ],
    [
      [null, '/(testing)']
    ]
  ],
  [
    '/.+\\*?=^!:${}[]|',
    null,
    [
      '/.+*?=^!:${}[]|'
    ],
    [
      ['/.+*?=^!:${}[]|', ['/.+*?=^!:${}[]|']]
    ],
    [
      [null, '/.+*?=^!:${}[]|']
    ]
  ],

  /**
   * Asterisk functionality.
   */
  [
    '/*',
    null,
    [
      {
        name: 0,
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: true,
        pattern: '.*'
      }
    ],
    [
      ['', null],
      ['/', ['/', '']],
      ['/foo/bar', ['/foo/bar', 'foo/bar']]
    ],
    [
      [null, null],
      [{ '0': '' }, '/'],
      [{ '0': 'foobar' }, '/foobar'],
      [{ '0': 'foo/bar' }, '/foo/bar'],
      [{ '0': ['foo', 'bar'] }, null],
      [{ '0': 'foo/bar?baz' }, '/foo/bar%3Fbaz']
    ]
  ],
  [
    '/foo/*',
    null,
    [
      '/foo',
      {
        name: 0,
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: true,
        pattern: '.*'
      }
    ],
    [
      ['', null],
      ['/test', null],
      ['/foo', null],
      ['/foo/', ['/foo/', '']],
      ['/foo/bar', ['/foo/bar', 'bar']]
    ],
    [
      [{ '0': 'bar' }, '/foo/bar']
    ]
  ],
  [
    '/:foo/*',
    null,
    [
      {
        name: 'foo',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      {
        name: 0,
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: true,
        pattern: '.*'
      }
    ],
    [
      ['', null],
      ['/test', null],
      ['/foo', null],
      ['/foo/', ['/foo/', 'foo', '']],
      ['/foo/bar', ['/foo/bar', 'foo', 'bar']]
    ],
    [
      [{ foo: 'foo' }, null],
      [{ '0': 'bar' }, null],
      [{ foo: 'foo', '0': 'bar' }, '/foo/bar'],
      [{ foo: 'a', '0': 'b/c' }, '/a/b/c']
    ]
  ],

  /**
   * Unnamed group prefix.
   */
  [
    '/(apple-)?icon-:res(\\d+).png',
    null,
    [
      {
        name: 0,
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: 'apple-'
      },
      'icon-',
      {
        name: 'res',
        prefix: '',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\d+'
      },
      '.png'
    ],
    [
      ['/icon-240.png', ['/icon-240.png', undefined, '240']],
      ['/apple-icon-240.png', ['/apple-icon-240.png', 'apple-', '240']]
    ],
    []
  ],

  /**
   * Random examples.
   */
  [
    '/:foo/:bar',
    null,
    [
      {
        name: 'foo',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      {
        name: 'bar',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/match/route', ['/match/route', 'match', 'route']]
    ],
    [
      [{ foo: 'a', bar: 'b' }, '/a/b']
    ]
  ],
  [
    '/:foo(test\\)/bar',
    null,
    [
      {
        name: 'foo',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '(test)/bar'
    ],
    [],
    []
  ],
  [
    '/:remote([\\w-.]+)/:user([\\w-]+)',
    null,
    [
      {
        name: 'remote',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[\\w-.]+'
      },
      {
        name: 'user',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[\\w-]+'
      }
    ],
    [
      ['/endpoint/user', ['/endpoint/user', 'endpoint', 'user']],
      ['/endpoint/user-name', ['/endpoint/user-name', 'endpoint', 'user-name']],
      ['/foo.bar/user-name', ['/foo.bar/user-name', 'foo.bar', 'user-name']]
    ],
    [
      [{ remote: 'foo', user: 'bar' }, '/foo/bar'],
      [{ remote: 'foo.bar', user: 'uno' }, '/foo.bar/uno']
    ]
  ],
  [
    '/:foo\\?',
    null,
    [
      {
        name: 'foo',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '?'
    ],
    [
      ['/route?', ['/route?', 'route']]
    ],
    [
      [{ foo: 'bar' }, '/bar?']
    ]
  ],
  [
    '/:foo+baz',
    null,
    [
      {
        name: 'foo',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: true,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      'baz'
    ],
    [
      ['/foobaz', ['/foobaz', 'foo']],
      ['/foo/barbaz', ['/foo/barbaz', 'foo/bar']],
      ['/baz', null]
    ],
    [
      [{ foo: 'foo' }, '/foobaz'],
      [{ foo: 'foo/bar' }, '/foo%2Fbarbaz'],
      [{ foo: ['foo', 'bar'] }, '/foo/barbaz']
    ]
  ],
  [
    '/:pre?baz',
    null,
    [
      {
        name: 'pre',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      'baz'
    ],
    [
      ['/foobaz', ['/foobaz', 'foo']],
      ['/baz', ['/baz', undefined]]
    ],
    [
      [{}, '/baz'],
      [{ pre: 'foo' }, '/foobaz']
    ]
  ],
  [
    '/:foo\\(:bar?\\)',
    null,
    [
      {
        name: 'foo',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      '(',
      {
        name: 'bar',
        prefix: '',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      },
      ')'
    ],
    [
      ['/hello(world)', ['/hello(world)', 'hello', 'world']],
      ['/hello()', ['/hello()', 'hello', undefined]]
    ],
    [
      [{ foo: 'hello', bar: 'world' }, '/hello(world)'],
      [{ foo: 'hello' }, '/hello()']
    ]
  ],
  [
    '/:postType(video|audio|text)(\\+.+)?',
    null,
    [
      {
        name: 'postType',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: true,
        asterisk: false,
        pattern: 'video|audio|text'
      },
      {
        name: 0,
        prefix: '',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '\\+.+'
      }
    ],
    [
      ['/video', ['/video', 'video', undefined]],
      ['/video+test', ['/video+test', 'video', '+test']],
      ['/video+', null]
    ],
    [
      [{ postType: 'video' }, '/video'],
      [{ postType: 'random' }, null]
    ]
  ],

  /**
   * Unicode characters.
   */
  [
    '/:foo',
    null,
    [
      {
        name: 'foo',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        asterisk: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/café', ['/café', 'café']]
    ],
    [
      [{ foo: 'café' }, '/caf%C3%A9']
    ]
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
    partial: false,
    asterisk: false,
    pattern: '[^\\/]+?'
  }

  describe('arguments', function () {
    it('should accept an array of keys as the second argument', function () {
      var keys = []
      var re = pathToRegexp(TEST_PATH, keys, { end: false })

      expect(re.keys).to.equal(keys)
      expect(keys).to.deep.equal([TEST_PARAM])
      expect(exec(re, '/user/123/show')).to.deep.equal(['/user/123', '123'])
    })

    it('should work with keys as null', function () {
      var re = pathToRegexp(TEST_PATH, null, { end: false })

      expect(re.keys).to.deep.equal([TEST_PARAM])
      expect(exec(re, '/user/123/show')).to.deep.equal(['/user/123', '123'])
    })
  })

  describe('tokens', function () {
    var tokens = pathToRegexp.parse(TEST_PATH)

    it('should expose method to compile tokens to regexp', function () {
      var re = pathToRegexp.tokensToRegExp(tokens)

      expect(exec(re, '/user/123')).to.deep.equal(['/user/123', '123'])
    })

    it('should expose method to compile tokens to a path function', function () {
      var fn = pathToRegexp.tokensToFunction(tokens)

      expect(fn({ id: 123 })).to.equal('/user/123')
    })
  })

  describe('rules', function () {
    TESTS.forEach(function (test) {
      var path = test[0]
      var opts = test[1]
      var tokens = test[2]
      var matchCases = test[3]
      var compileCases = test[4]

      var keys = tokens.filter(function (token) {
        return typeof token !== 'string'
      })

      describe(util.inspect(path), function () {
        var re = pathToRegexp(path, opts)

        // Parsing and compiling is only supported with string input.
        if (typeof path === 'string') {
          it('should parse', function () {
            expect(pathToRegexp.parse(path)).to.deep.equal(tokens)
          })

          describe('compile', function () {
            var toPath = pathToRegexp.compile(path)

            compileCases.forEach(function (io) {
              var input = io[0]
              var output = io[1]

              if (output != null) {
                it('should compile using ' + util.inspect(input), function () {
                  expect(toPath(input)).to.equal(output)
                })
              } else {
                it('should not compile using ' + util.inspect(input), function () {
                  expect(function () {
                    toPath(input)
                  }).to.throw(TypeError)
                })
              }
            })
          })
        } else {
          it('should parse keys', function () {
            expect(re.keys).to.deep.equal(keys)
          })
        }

        describe('match' + (opts ? ' using ' + util.inspect(opts) : ''), function () {
          matchCases.forEach(function (io) {
            var input = io[0]
            var output = io[1]
            var message = 'should' + (output ? ' ' : ' not ') + 'match ' + util.inspect(input)

            it(message, function () {
              expect(exec(re, input)).to.deep.equal(output)
            })
          })
        })
      })
    })
  })

  describe('compile', function () {
    it('should allow pretty option', function () {
      var value = ';,:@&=+$-_.!~*()'
      var toPath = pathToRegexp.compile('/:value')
      var path = toPath({ value }, { pretty: true })

      expect(path).to.equal(`/${value}`)
    })
  })

  describe('compile errors', function () {
    it('should throw when a required param is undefined', function () {
      var toPath = pathToRegexp.compile('/a/:b/c')

      expect(function () {
        toPath()
      }).to.throw(TypeError, 'Expected "b" to be defined')
    })

    it('should throw when it does not match the pattern', function () {
      var toPath = pathToRegexp.compile('/:foo(\\d+)')

      expect(function () {
        toPath({ foo: 'abc' })
      }).to.throw(TypeError, 'Expected "foo" to match "\\d+"')
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
