/* global describe, it */

import util = require('util')
import chai = require('chai')
import {pathToRegexp, Path, RegExpOptions, ParseOptions, Token, PathFunctionOptions, parse, compile, tokensToFunction, tokensToRegExp} from './index'

const expect = chai.expect

type Test = [
  Path,
  RegExpOptions & ParseOptions,
  Token[],
  Array<[string, string[]]>,
  Array<[any, string] | [any, string, PathFunctionOptions]>
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
      ['/test', null],
      ['/test/', ['/test/']],
      ['/test//', ['/test//']]
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
      ['/test', null],
      ['/test/route', ['/test/']],
      ['/test//', ['/test//']],
      ['/test//route', ['/test/']]
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
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']]
    ],
    [
      [{}, null],
      [{ test: 'abc' }, '/abc'],
      [{ test: 'a+b' }, '/a+b', { encode: (value) => value }],
      [{ test: 'a+b' }, '/test', { encode: (_, token) => String(token.name) }],
      [{ test: 'a+b' }, '/a%2Bb']
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
        pattern: '[^\\/]+?'
      },
      '/'
    ],
    [
      ['/route', null],
      ['/route/', ['/route/', 'route']]
    ],
    [
      [{ test: 'abc' }, '/abc/']
    ]
  ],
  [
    '',
    {
      end: false
    },
    [],
    [
      ['', ['']],
      ['/', ['/']],
      ['route', ['']],
      ['/route', ['']],
      ['/route/', ['']]
    ],
    [
      [null, '']
    ]
  ],

  /**
   * Non-starting mode.
   */
  [
    '/test',
    {
      start: false
    },
    [
      '/test'
    ],
    [
      ['/test', ['/test']],
      ['/test/', ['/test/']],
      ['/route/test', ['/test']],
      ['/test/route', null],
      ['/route/test/deep', null],
      ['/route', null]
    ],
    [
      [null, '/test']
    ]
  ],
  [
    '/test/',
    {
      start: false
    },
    [
      '/test/'
    ],
    [
      ['/test', null],
      ['/test/route', null],
      ['/test//route', null],
      ['/test//', ['/test//']],
      ['/route/test/', ['/test/']]
    ],
    [
      [null, '/test/']
    ]
  ],
  [
    '/:test',
    {
      start: false
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']],
    ],
    [
      [{}, null],
      [{ test: 'abc' }, '/abc'],
      [{ test: 'a+b' }, '/a+b', { encode: (value) => value }],
      [{ test: 'a+b' }, '/test', { encode: (_, token) => String(token.name) }],
      [{ test: 'a+b' }, '/a%2Bb']
    ]
  ],
  [
    '/:test/',
    {
      start: false
    },
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
        pattern: '[^\\/]+?'
      },
      '/'
    ],
    [
      ['/route', null],
      ['/route/', ['/route/', 'route']]
    ],
    [
      [{ test: 'abc' }, '/abc/']
    ]
  ],
  [
    '',
    {
      start: false
    },
    [],
    [
      ['', ['']],
      ['/', ['/']],
      ['route', ['']],
      ['/route', ['']],
      ['/route/', ['/']]
    ],
    [
      [null, '']
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
  [
    '/test',
    {
      start: false,
      end: false
    },
    [
      '/test'
    ],
    [
      ['/test', ['/test']],
      ['/test/', ['/test/']],
      ['/test/route', ['/test']],
      ['/route/test/deep', ['/test']]
    ],
    [
      [null, '/test']
    ]
  ],
  [
    '/test/',
    {
      start: false,
      end: false
    },
    [
      '/test/'
    ],
    [
      ['/test', null],
      ['/test/', ['/test/']],
      ['/test//', ['/test//']],
      ['/test/route', ['/test/']],
      ['/route/test/deep', ['/test/']],
    ],
    [
      [null, '/test/']
    ]
  ],
  [
    '/test.json',
    {
      start: false,
      end: false
    },
    [
      '/test.json'
    ],
    [
      ['/test.json', ['/test.json']],
      ['/test.json.hbs', null],
      ['/test.json/route', ['/test.json']],
      ['/route/test.json/deep', ['/test.json']]
    ],
    [
      [null, '/test.json']
    ]
  ],
  [
    '/:test',
    {
      start: false,
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
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/route', ['/route', 'route']],
      ['/route/', ['/route/', 'route']]
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
        pattern: '[^\\/]+?'
      },
      '-bar'
    ],
    [
      ['/-bar', ['/-bar', undefined]],
      ['/foo-bar', ['/foo-bar', 'foo']]
    ],
    [
      [undefined, '/-bar'],
      [{ test: 'foo' }, '/foo-bar']
    ]
  ],
  [
    '/:test*-bar',
    null,
    [
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: true,
        repeat: true,
        partial: true,
        pattern: '[^\\/]+?'
      },
      '-bar'
    ],
    [
      ['/-bar', ['/-bar', undefined]],
      ['/foo-bar', ['/foo-bar', 'foo']],
      ['/foo/baz-bar', ['/foo/baz-bar', 'foo/baz']],
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
  [
    ':test+',
    null,
    [
      {
        name: 'test',
        prefix: '',
        delimiter: '/',
        optional: false,
        repeat: true,
        partial: false,
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['route', ['route', 'route']],
      ['/route', null],
      ['', null],
      ['foo/bar', ['foo/bar', 'foo/bar']]
    ],
    [
      [{}, null],
      [{ test: '' }, null],
      [{ test: ['route'] }, 'route'],
      [{ test: ['foo', 'bar'] }, 'foo/bar']
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
        pattern: '[^\\.]+?'
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
        pattern: '[^\\.]+?'
      },
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        pattern: '[^\\.]+?'
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
        pattern: '[^\\.]+?'
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
        pattern: '[^\\.]+?'
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
        pattern: '[^\\.]+?'
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
        pattern: '[^\\/]+?'
      },
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        pattern: '[^\\.]+?'
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
        pattern: '[^\\/]+?'
      },
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: true,
        repeat: false,
        partial: false,
        pattern: '[^\\.]+?'
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
        pattern: '[^\\/]+?'
      },
      {
        name: 'format',
        prefix: '.',
        delimiter: '.',
        optional: true,
        repeat: false,
        partial: false,
        pattern: '[^\\.]+?'
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
        pattern: '\\d+'
      },
      {
        name: 0,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
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
        pattern: '[^\\/]+?'
      },
      {
        name: 'test',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
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
        pattern: null
      },
      {
        name: 0,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
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
    '/.+*?=^!:${}[]|',
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
  [
    '/test\\/:uid(u\\d+)?:cid(c\\d+)?',
    null,
    [
      '/test/',
      {
        name: 'uid',
        prefix: '',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        pattern: 'u\\d+'
      },
      {
        name: 'cid',
        prefix: '',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
        pattern: 'c\\d+'
      }
    ],
    [
      ['/test', null],
      ['/test/', ['/test/', undefined, undefined]],
      ['/test/u123', ['/test/u123', 'u123', undefined]],
      ['/test/c123', ['/test/c123', undefined, 'c123']],
    ],
    [
      [{ uid: 'u123' }, '/test/u123'],
      [{ cid: 'c123' }, '/test/c123'],
      [{ cid: 'u123' }, null]
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
        pattern: '[^\\/]+?'
      },
      {
        name: 'bar',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
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
        pattern: '[\\w-.]+'
      },
      {
        name: 'user',
        prefix: '/',
        delimiter: '/',
        optional: false,
        repeat: false,
        partial: false,
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
        pattern: 'video|audio|text'
      },
      {
        name: 0,
        prefix: '',
        delimiter: '/',
        optional: true,
        repeat: false,
        partial: false,
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
        pattern: '[^\\/]+?'
      }
    ],
    [
      ['/café', ['/café', 'café']]
    ],
    [
      [{ foo: 'café' }, '/caf%C3%A9']
    ]
  ],
  [
    '/café',
    null,
    [
      '/café'
    ],
    [
      ['/café', ['/café']]
    ],
    [
      [null, '/café']
    ]
  ],
  [
    'packages/',
    null,
    [
      'packages/'
    ],
    [
      ['packages', null],
      ['packages/', ['packages/']]
    ],
    [
      [null, 'packages/']
    ]
  ],

  /**
   * Hostnames.
   */
  [
    ':domain.com',
    {
      delimiter: '.'
    },
    [
      {
        name: 'domain',
        prefix: '',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        pattern: '[^\\.]+?'
      },
      '.com'
    ],
    [
      ['example.com', ['example.com', 'example']],
      ['github.com', ['github.com', 'github']],
    ],
    [
      [{ domain: 'example' }, 'example.com'],
      [{ domain: 'github' }, 'github.com']
    ]
  ],
  [
    'mail.:domain.com',
    {
      delimiter: '.'
    },
    [
      'mail',
      {
        name: 'domain',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        pattern: '[^\\.]+?'
      },
      '.com'
    ],
    [
      ['mail.example.com', ['mail.example.com', 'example']],
      ['mail.github.com', ['mail.github.com', 'github']]
    ],
    [
      [{ domain: 'example' }, 'mail.example.com'],
      [{ domain: 'github' }, 'mail.github.com']
    ]
  ],
  [
    'example.:ext',
    {
      delimiter: '.'
    },
    [
      'example',
      {
        name: 'ext',
        prefix: '.',
        delimiter: '.',
        optional: false,
        repeat: false,
        partial: false,
        pattern: '[^\\.]+?'
      }
    ],
    [
      ['example.com', ['example.com', 'com']],
      ['example.org', ['example.org', 'org']],
    ],
    [
      [{ ext: 'com' }, 'example.com'],
      [{ ext: 'org' }, 'example.org']
    ]
  ],
  [
    'this is',
    {
      delimiter: ' ',
      end: false
    },
    [
      'this is'
    ],
    [
      ['this is a test', ['this is']],
      ['this isn\'t', null]
    ],
    [
      [null, 'this is']
    ]
  ],

  /**
   * Ends with.
   */
  [
    '/test',
    {
      endsWith: '?'
    },
    [
      '/test'
    ],
    [
      ['/test', ['/test']],
      ['/test?query=string', ['/test']],
      ['/test/?query=string', ['/test/']],
      ['/testx', null]
    ],
    [
      [null, '/test']
    ]
  ],
  [
    '/test',
    {
      endsWith: '?',
      strict: true
    },
    [
      '/test'
    ],
    [
      ['/test?query=string', ['/test']],
      ['/test/?query=string', null]
    ],
    [
      [null, '/test']
    ]
  ],

  /**
   * Custom delimiters.
   */
  [
    '$:foo$:bar?',
    {
      delimiters: '$'
    },
    [
      {
        delimiter: '$',
        name: 'foo',
        optional: false,
        partial: false,
        pattern: '[^\\$]+?',
        prefix: '$',
        repeat: false
      },
      {
        delimiter: '$',
        name: 'bar',
        optional: true,
        partial: false,
        pattern: '[^\\$]+?',
        prefix: '$',
        repeat: false
      }
    ],
    [
      ['$x', ['$x', 'x', undefined]],
      ['$x$y', ['$x$y', 'x', 'y']]
    ],
    [
      [{ foo: 'foo' }, '$foo'],
      [{ foo: 'foo', bar: 'bar' }, '$foo$bar'],
    ]
  ],
  [
    ':test+',
    {
      delimiter: ' ',
      delimiters: ' '
    },
    [
      {
        name: 'test',
        prefix: '',
        delimiter: ' ',
        optional: false,
        repeat: true,
        partial: false,
        pattern: '[^ ]+?'
      }
    ],
    [
      ['hello', ['hello', 'hello']],
      [' hello ', null],
      ['', null],
      ['hello world', ['hello world', 'hello world']]
    ],
    [
      [{}, null],
      [{ test: '' }, null],
      [{ test: ['hello'] }, 'hello'],
      [{ test: ['hello', 'world'] }, 'hello world']
    ]
  ],
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
    pattern: '[^\\/]+?'
  }

  describe('arguments', function () {
    it('should work without different call combinations', function () {
      pathToRegexp('/test')
      pathToRegexp('/test', [])
      pathToRegexp('/test', undefined, {})

      pathToRegexp(/^\/test/)
      pathToRegexp(/^\/test/, [])
      pathToRegexp(/^\/test/, null, {})

      pathToRegexp(['/a', '/b'])
      pathToRegexp(['/a', '/b'], [])
      pathToRegexp(['/a', '/b'], null, {})
    })

    it('should accept an array of keys as the second argument', function () {
      var keys = []
      var re = pathToRegexp(TEST_PATH, keys, { end: false })

      expect(keys).to.deep.equal([TEST_PARAM])
      expect(exec(re, '/user/123/show')).to.deep.equal(['/user/123', '123'])
    })
  })

  describe('tokens', function () {
    var tokens = parse(TEST_PATH)

    it('should expose method to compile tokens to regexp', function () {
      var re = tokensToRegExp(tokens)

      expect(exec(re, '/user/123')).to.deep.equal(['/user/123', '123'])
    })

    it('should expose method to compile tokens to a path function', function () {
      var fn = tokensToFunction(tokens)

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

      describe(util.inspect(path), function () {
        var keys = []
        var re = pathToRegexp(path, keys, opts)

        // Parsing and compiling is only supported with string input.
        if (typeof path === 'string') {
          it('should parse', function () {
            expect(parse(path as string, opts)).to.deep.equal(tokens)
          })

          describe('compile', function () {
            var toPath = compile(path as string, opts)

            compileCases.forEach(function (io) {
              var input = io[0]
              var output = io[1]
              var options = io[2]

              if (output != null) {
                it('should compile using ' + util.inspect(input), function () {
                  expect(toPath(input, options)).to.equal(output)
                })
              } else {
                it('should not compile using ' + util.inspect(input), function () {
                  expect(function () {
                    toPath(input, options)
                  }).to.throw(TypeError)
                })
              }
            })
          })
        } else {
          it('should parse keys', function () {
            expect(keys).to.deep.equal(tokens.filter(function (token) {
              return typeof token !== 'string'
            }))
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

  describe('compile errors', function () {
    it('should throw when a required param is undefined', function () {
      var toPath = compile('/a/:b/c')

      expect(function () {
        toPath()
      }).to.throw(TypeError, 'Expected "b" to be a string')
    })

    it('should throw when it does not match the pattern', function () {
      var toPath = compile('/:foo(\\d+)')

      expect(function () {
        toPath({ foo: 'abc' })
      }).to.throw(TypeError, 'Expected "foo" to match "\\d+"')
    })

    it('should throw when expecting a repeated value', function () {
      var toPath = compile('/:foo+')

      expect(function () {
        toPath({ foo: [] })
      }).to.throw(TypeError, 'Expected "foo" to not be empty')
    })

    it('should throw when not expecting a repeated value', function () {
      var toPath = compile('/:foo')

      expect(function () {
        toPath({ foo: [] })
      }).to.throw(TypeError, 'Expected "foo" to not repeat')
    })

    it('should throw when repeated value does not match', function () {
      var toPath = compile('/:foo(\\d+)+')

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
