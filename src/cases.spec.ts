import {
  type MatchOptions,
  type Match,
  type ParseOptions,
  type Token,
  type CompileOptions,
  type ParamData,
  TokenData,
  Path,
} from "./index.js";

export interface ParserTestSet {
  path: string;
  options?: ParseOptions;
  expected: TokenData;
}

export interface StringifyTestSet {
  data: TokenData;
  options?: ParseOptions;
  expected: string;
}

export interface CompileTestSet {
  path: Path;
  options?: CompileOptions & ParseOptions;
  tests: Array<{
    input: ParamData | undefined;
    expected: string | null;
  }>;
}

export interface MatchTestSet {
  path: Path | Path[];
  options?: MatchOptions & ParseOptions;
  tests: Array<{
    input: string;
    expected: Match<any>;
  }>;
}

export const PARSER_TESTS: ParserTestSet[] = [
  {
    path: "/",
    expected: new TokenData([{ type: "text", value: "/" }], "/"),
  },
  {
    path: "/:test",
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "param", name: "test" },
      ],
      "/:test",
    ),
  },
  {
    path: "/:a:b",
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "param", name: "a" },
        { type: "param", name: "b" },
      ],
      "/:a:b",
    ),
  },
  {
    path: '/:"0"',
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "param", name: "0" },
      ],
      '/:"0"',
    ),
  },
  {
    path: "/:_",
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "param", name: "_" },
      ],
      "/:_",
    ),
  },
  {
    path: "/:café",
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "param", name: "café" },
      ],
      "/:café",
    ),
  },
  {
    path: '/:"123"',
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "param", name: "123" },
      ],
      '/:"123"',
    ),
  },
  {
    path: '/:"1\\"\\2\\"3"',
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "param", name: '1"2"3' },
      ],
      '/:"1\\"\\2\\"3"',
    ),
  },
  {
    path: "/*path",
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "wildcard", name: "path" },
      ],
      "/*path",
    ),
  },
  {
    path: '/:"test"stuff',
    expected: new TokenData(
      [
        { type: "text", value: "/" },
        { type: "param", name: "test" },
        { type: "text", value: "stuff" },
      ],
      '/:"test"stuff',
    ),
  },
  {
    path: "\\\\:test",
    expected: new TokenData(
      [
        { type: "text", value: "\\" },
        { type: "param", name: "test" },
      ],
      "\\\\:test",
    ),
  },
];

export const STRINGIFY_TESTS: StringifyTestSet[] = [
  {
    data: new TokenData([{ type: "text", value: "/" }]),
    expected: "/",
  },
  {
    data: new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "test" },
    ]),
    expected: "/:test",
  },
  {
    data: new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "café" },
    ]),
    expected: "/:café",
  },
  {
    data: new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "0" },
    ]),
    expected: '/:"0"',
  },
  {
    data: new TokenData([
      { type: "text", value: "/" },
      { type: "wildcard", name: "test" },
    ]),
    expected: "/*test",
  },
  {
    data: new TokenData([
      { type: "text", value: "/" },
      { type: "wildcard", name: "0" },
    ]),
    expected: '/*"0"',
  },
  {
    data: new TokenData([
      { type: "text", value: "/users" },
      {
        type: "group",
        tokens: [
          { type: "text", value: "/" },
          { type: "param", name: "id" },
        ],
      },
      { type: "text", value: "/delete" },
    ]),
    expected: "/users{/:id}/delete",
  },
  {
    data: new TokenData([{ type: "text", value: "/:+?*" }]),
    expected: "/\\:\\+\\?\\*",
  },
  {
    data: new TokenData([
      { type: "text", value: "/" },
      { type: "param", name: "test" },
      { type: "text", value: "stuff" },
    ]),
    expected: '/:"test"stuff',
  },
  {
    data: new TokenData([
      { type: "text", value: "\\" },
      { type: "param", name: "test" },
    ]),
    expected: "\\\\:test",
  },
];

export const COMPILE_TESTS: CompileTestSet[] = [
  {
    path: "/",
    tests: [
      { input: undefined, expected: "/" },
      { input: {}, expected: "/" },
      { input: { id: "123" }, expected: "/" },
    ],
  },
  {
    path: "/test",
    tests: [
      { input: undefined, expected: "/test" },
      { input: {}, expected: "/test" },
      { input: { id: "123" }, expected: "/test" },
    ],
  },
  {
    path: "/test/",
    tests: [
      { input: undefined, expected: "/test/" },
      { input: {}, expected: "/test/" },
      { input: { id: "123" }, expected: "/test/" },
    ],
  },
  {
    path: '/:"0"',
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { 0: "123" }, expected: "/123" },
    ],
  },
  {
    path: "/:test",
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123%2Fxyz" },
    ],
  },
  {
    path: "/:test",
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123%2Fxyz" },
    ],
  },
  {
    path: "/:test",
    options: { encode: false },
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123/xyz" },
    ],
  },
  {
    path: "/:test",
    options: { encode: () => "static" },
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "123" }, expected: "/static" },
      { input: { test: "123/xyz" }, expected: "/static" },
    ],
  },
  {
    path: "{/:test}",
    options: { encode: false },
    tests: [
      { input: undefined, expected: "" },
      { input: {}, expected: "" },
      { input: { test: undefined }, expected: "" },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123/xyz" },
    ],
  },
  {
    path: "/*test",
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: [] }, expected: null },
      { input: { test: ["123"] }, expected: "/123" },
      { input: { test: ["123", "xyz"] }, expected: "/123/xyz" },
    ],
  },
  {
    path: "/*test",
    options: { encode: false },
    tests: [
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123/xyz" },
    ],
  },
];

/**
 * An array of test cases with expected inputs and outputs.
 */
export const MATCH_TESTS: MatchTestSet[] = [
  /**
   * Simple paths.
   */
  {
    path: "/",
    tests: [
      {
        input: "/",
        expected: { path: "/", params: {} },
      },
      { input: "/route", expected: false },
    ],
  },
  {
    path: "/test",
    tests: [
      {
        input: "/test",
        expected: { path: "/test", params: {} },
      },
      { input: "/route", expected: false },
      { input: "/test/route", expected: false },
      {
        input: "/test/",
        expected: { path: "/test/", params: {} },
      },
      {
        input: "/TEST/",
        expected: { path: "/TEST/", params: {} },
      },
    ],
  },
  {
    path: "/test/",
    tests: [
      {
        input: "/test/",
        expected: { path: "/test/", params: {} },
      },
      { input: "/route", expected: false },
      { input: "/test", expected: false },
      {
        input: "/test//",
        expected: { path: "/test//", params: {} },
      },
    ],
  },
  {
    path: "/:test",
    tests: [
      {
        input: "/route",
        expected: { path: "/route", params: { test: "route" } },
      },
      {
        input: "/route/",
        expected: { path: "/route/", params: { test: "route" } },
      },
      {
        input: "/route.json",
        expected: {
          path: "/route.json",
          params: { test: "route.json" },
        },
      },
      {
        input: "/route.json/",
        expected: {
          path: "/route.json/",
          params: { test: "route.json" },
        },
      },
      {
        input: "/route/test",
        expected: false,
      },
      {
        input: "/caf%C3%A9",
        expected: {
          path: "/caf%C3%A9",
          params: { test: "café" },
        },
      },
      {
        input: "/;,:@&=+$-_.!~*()",
        expected: {
          path: "/;,:@&=+$-_.!~*()",
          params: { test: ";,:@&=+$-_.!~*()" },
        },
      },
      {
        input: "/param%2523",
        expected: {
          path: "/param%2523",
          params: { test: "param%23" },
        },
      },
    ],
  },

  /**
   * Case-sensitive paths.
   */
  {
    path: "/test",
    options: {
      sensitive: true,
    },
    tests: [
      {
        input: "/test",
        expected: { path: "/test", params: {} },
      },
      { input: "/TEST", expected: false },
    ],
  },
  {
    path: "/TEST",
    options: {
      sensitive: true,
    },
    tests: [
      { input: "/test", expected: false },
      {
        input: "/TEST",
        expected: { path: "/TEST", params: {} },
      },
    ],
  },

  /**
   * Non-ending mode.
   */
  {
    path: "/test",
    options: {
      end: false,
    },
    tests: [
      {
        input: "/test",
        expected: { path: "/test", params: {} },
      },
      {
        input: "/test/",
        expected: { path: "/test/", params: {} },
      },
      {
        input: "/test////",
        expected: { path: "/test", params: {} },
      },
      {
        input: "/route/test",
        expected: false,
      },
      {
        input: "/test/route",
        expected: { path: "/test", params: {} },
      },
      {
        input: "/route",
        expected: false,
      },
    ],
  },
  {
    path: "/test/",
    options: {
      end: false,
    },
    tests: [
      {
        input: "/test",
        expected: false,
      },
      {
        input: "/test/",
        expected: { path: "/test/", params: {} },
      },
      {
        input: "/test//",
        expected: { path: "/test//", params: {} },
      },
      {
        input: "/test/route",
        expected: false,
      },
      {
        input: "/route/test/deep",
        expected: false,
      },
    ],
  },
  {
    path: "/:test",
    options: {
      end: false,
    },
    tests: [
      {
        input: "/route",
        expected: { path: "/route", params: { test: "route" } },
      },
      {
        input: "/route/",
        expected: { path: "/route/", params: { test: "route" } },
      },
      {
        input: "/route.json",
        expected: {
          path: "/route.json",
          params: { test: "route.json" },
        },
      },
      {
        input: "/route.json/",
        expected: {
          path: "/route.json/",
          params: { test: "route.json" },
        },
      },
      {
        input: "/route/test",
        expected: { path: "/route", params: { test: "route" } },
      },
      {
        input: "/route.json/test",
        expected: {
          path: "/route.json",
          params: { test: "route.json" },
        },
      },
      {
        input: "/caf%C3%A9",
        expected: {
          path: "/caf%C3%A9",
          params: { test: "café" },
        },
      },
    ],
  },
  {
    path: "/:test/",
    options: {
      end: false,
    },
    tests: [
      {
        input: "/route",
        expected: false,
      },
      {
        input: "/route/",
        expected: { path: "/route/", params: { test: "route" } },
      },
      {
        input: "/route/test",
        expected: false,
      },
      {
        input: "/route/test/",
        expected: false,
      },
      {
        input: "/route//test",
        expected: { path: "/route/", params: { test: "route" } },
      },
    ],
  },
  {
    path: "",
    options: {
      end: false,
    },
    tests: [
      {
        input: "",
        expected: { path: "", params: {} },
      },
      {
        input: "/",
        expected: { path: "/", params: {} },
      },
      {
        input: "route",
        expected: false,
      },
      {
        input: "/route",
        expected: { path: "", params: {} },
      },
      {
        input: "/route/",
        expected: { path: "", params: {} },
      },
    ],
  },

  /**
   * Optional.
   */
  {
    path: "{/route}",
    tests: [
      {
        input: "",
        expected: { path: "", params: {} },
      },
      {
        input: "/",
        expected: { path: "/", params: {} },
      },
      {
        input: "/foo",
        expected: false,
      },
      {
        input: "/route",
        expected: { path: "/route", params: {} },
      },
    ],
  },
  {
    path: "{/:test}",
    tests: [
      {
        input: "/route",
        expected: { path: "/route", params: { test: "route" } },
      },
      {
        input: "",
        expected: { path: "", params: {} },
      },
      {
        input: "/",
        expected: { path: "/", params: {} },
      },
    ],
  },
  {
    path: "{/:test}/bar",
    tests: [
      {
        input: "/bar",
        expected: { path: "/bar", params: {} },
      },
      {
        input: "/foo/bar",
        expected: { path: "/foo/bar", params: { test: "foo" } },
      },
      {
        input: "/foo/bar/",
        expected: { path: "/foo/bar/", params: { test: "foo" } },
      },
    ],
  },
  {
    path: "{/:test}-bar",
    tests: [
      {
        input: "-bar",
        expected: { path: "-bar", params: {} },
      },
      {
        input: "/foo-bar",
        expected: { path: "/foo-bar", params: { test: "foo" } },
      },
      {
        input: "/foo-bar/",
        expected: { path: "/foo-bar/", params: { test: "foo" } },
      },
    ],
  },
  {
    path: "/{:test}-bar",
    tests: [
      {
        input: "/-bar",
        expected: { path: "/-bar", params: {} },
      },
      {
        input: "/foo-bar",
        expected: { path: "/foo-bar", params: { test: "foo" } },
      },
      {
        input: "/foo-bar/",
        expected: { path: "/foo-bar/", params: { test: "foo" } },
      },
    ],
  },

  /**
   * No prefix characters.
   */
  {
    path: "test",
    tests: [
      {
        input: "test",
        expected: { path: "test", params: {} },
      },
      {
        input: "/test",
        expected: false,
      },
    ],
  },
  {
    path: ":test",
    tests: [
      {
        input: "route",
        expected: { path: "route", params: { test: "route" } },
      },
      {
        input: "/route",
        expected: false,
      },
      {
        input: "route/",
        expected: { path: "route/", params: { test: "route" } },
      },
    ],
  },
  {
    path: "{:test}",
    tests: [
      {
        input: "test",
        expected: { path: "test", params: { test: "test" } },
      },
      {
        input: "",
        expected: { path: "", params: {} },
      },
    ],
  },

  /**
   * Formats.
   */
  {
    path: "/test.json",
    tests: [
      {
        input: "/test.json",
        expected: { path: "/test.json", params: {} },
      },
      {
        input: "/test",
        expected: false,
      },
    ],
  },
  {
    path: "/:test.json",
    tests: [
      {
        input: "/.json",
        expected: false,
      },
      {
        input: "/test.json",
        expected: { path: "/test.json", params: { test: "test" } },
      },
      {
        input: "/route.json",
        expected: { path: "/route.json", params: { test: "route" } },
      },
      {
        input: "/route.json.json",
        expected: { path: "/route.json.json", params: { test: "route.json" } },
      },
    ],
  },

  /**
   * Format and path params.
   */
  {
    path: "/:test.:format",
    tests: [
      {
        input: "/route.html",
        expected: {
          path: "/route.html",
          params: { test: "route", format: "html" },
        },
      },
      {
        input: "/route",
        expected: false,
      },
      {
        input: "/route.html.json",
        expected: {
          path: "/route.html.json",
          params: { test: "route.html", format: "json" },
        },
      },
    ],
  },
  {
    path: "/:test{.:format}",
    tests: [
      {
        input: "/route",
        expected: { path: "/route", params: { test: "route" } },
      },
      {
        input: "/route.json",
        expected: {
          path: "/route.json",
          params: { test: "route", format: "json" },
        },
      },
      {
        input: "/route.json.html",
        expected: {
          path: "/route.json.html",
          params: { test: "route.json", format: "html" },
        },
      },
    ],
  },
  {
    path: "/:test.:format\\z",
    tests: [
      {
        input: "/route.htmlz",
        expected: {
          path: "/route.htmlz",
          params: { test: "route", format: "html" },
        },
      },
      {
        input: "/route.html",
        expected: false,
      },
    ],
  },

  /**
   * Escaped characters.
   */
  {
    path: "/\\(testing\\)",
    tests: [
      {
        input: "/testing",
        expected: false,
      },
      {
        input: "/(testing)",
        expected: { path: "/(testing)", params: {} },
      },
    ],
  },
  {
    path: "/.\\+\\*\\?\\{\\}=^\\!\\:$\\[\\]\\|",
    tests: [
      {
        input: "/.+*?{}=^!:$[]|",
        expected: { path: "/.+*?{}=^!:$[]|", params: {} },
      },
    ],
  },

  /**
   * Random examples.
   */
  {
    path: "/:foo/:bar",
    tests: [
      {
        input: "/match/route",
        expected: {
          path: "/match/route",
          params: { foo: "match", bar: "route" },
        },
      },
    ],
  },
  {
    path: "/:foo\\(test\\)/bar",
    tests: [
      {
        input: "/foo(test)/bar",
        expected: { path: "/foo(test)/bar", params: { foo: "foo" } },
      },
      {
        input: "/foo/bar",
        expected: false,
      },
    ],
  },
  {
    path: "/:foo\\?",
    tests: [
      {
        input: "/route?",
        expected: { path: "/route?", params: { foo: "route" } },
      },
      {
        input: "/route",
        expected: false,
      },
    ],
  },
  {
    path: "/{:pre}baz",
    tests: [
      {
        input: "/foobaz",
        expected: { path: "/foobaz", params: { pre: "foo" } },
      },
      {
        input: "/baz",
        expected: { path: "/baz", params: { pre: undefined } },
      },
    ],
  },
  {
    path: "/:foo\\(:bar\\)",
    tests: [
      {
        input: "/hello(world)",
        expected: {
          path: "/hello(world)",
          params: { foo: "hello", bar: "world" },
        },
      },
      {
        input: "/hello()",
        expected: false,
      },
    ],
  },
  {
    path: "/:foo\\({:bar}\\)",
    tests: [
      {
        input: "/hello(world)",
        expected: {
          path: "/hello(world)",
          params: { foo: "hello", bar: "world" },
        },
      },
      {
        input: "/hello()",
        expected: {
          path: "/hello()",
          params: { foo: "hello", bar: undefined },
        },
      },
    ],
  },
  {
    path: "{/:foo}{/:bar}-ext",
    tests: [
      {
        input: "/-ext",
        expected: false,
      },
      {
        input: "-ext",
        expected: {
          path: "-ext",
          params: { foo: undefined, bar: undefined },
        },
      },
      {
        input: "/foo-ext",
        expected: { path: "/foo-ext", params: { foo: "foo" } },
      },
      {
        input: "/foo/bar-ext",
        expected: {
          path: "/foo/bar-ext",
          params: { foo: "foo", bar: "bar" },
        },
      },
      {
        input: "/foo/-ext",
        expected: false,
      },
    ],
  },
  {
    path: "/:required{/:optional}-ext",
    tests: [
      {
        input: "/foo-ext",
        expected: { path: "/foo-ext", params: { required: "foo" } },
      },
      {
        input: "/foo/bar-ext",
        expected: {
          path: "/foo/bar-ext",
          params: { required: "foo", optional: "bar" },
        },
      },
      {
        input: "/foo/-ext",
        expected: false,
      },
    ],
  },

  /**
   * Unicode matches.
   */
  {
    path: "/:foo",
    tests: [
      {
        input: "/café",
        expected: { path: "/café", params: { foo: "café" } },
      },
    ],
  },
  {
    path: "/:foo",
    options: {
      decode: false,
    },
    tests: [
      {
        input: "/caf%C3%A9",
        expected: {
          path: "/caf%C3%A9",
          params: { foo: "caf%C3%A9" },
        },
      },
    ],
  },
  {
    path: "/café",
    tests: [
      {
        input: "/café",
        expected: { path: "/café", params: {} },
      },
    ],
  },
  {
    path: "/café",
    options: {
      encodePath: encodeURI,
    },
    tests: [
      {
        input: "/caf%C3%A9",
        expected: { path: "/caf%C3%A9", params: {} },
      },
    ],
  },

  /**
   * Hostnames.
   */
  {
    path: ":domain.com",
    options: {
      delimiter: ".",
    },
    tests: [
      {
        input: "example.com",
        expected: {
          path: "example.com",
          params: { domain: "example" },
        },
      },
      {
        input: "github.com",
        expected: {
          path: "github.com",
          params: { domain: "github" },
        },
      },
    ],
  },
  {
    path: "mail.:domain.com",
    options: {
      delimiter: ".",
    },
    tests: [
      {
        input: "mail.example.com",
        expected: {
          path: "mail.example.com",
          params: { domain: "example" },
        },
      },
      {
        input: "mail.github.com",
        expected: {
          path: "mail.github.com",
          params: { domain: "github" },
        },
      },
    ],
  },
  {
    path: "mail{.:domain}.com",
    options: {
      delimiter: ".",
    },
    tests: [
      {
        input: "mail.com",
        expected: { path: "mail.com", params: { domain: undefined } },
      },
      {
        input: "mail.example.com",
        expected: {
          path: "mail.example.com",
          params: { domain: "example" },
        },
      },
      {
        input: "mail.github.com",
        expected: {
          path: "mail.github.com",
          params: { domain: "github" },
        },
      },
    ],
  },
  {
    path: "example.:ext",
    options: {
      delimiter: ".",
    },
    tests: [
      {
        input: "example.com",
        expected: { path: "example.com", params: { ext: "com" } },
      },
      {
        input: "example.org",
        expected: { path: "example.org", params: { ext: "org" } },
      },
    ],
  },
  {
    path: "this is",
    options: {
      delimiter: " ",
      end: false,
    },
    tests: [
      {
        input: "this is a test",
        expected: { path: "this is", params: {} },
      },
      {
        input: "this isn't",
        expected: false,
      },
    ],
  },

  /**
   * Prefixes.
   */
  {
    path: "$:foo{$:bar}",
    tests: [
      {
        input: "$x",
        expected: { path: "$x", params: { foo: "x" } },
      },
      {
        input: "$x$y",
        expected: { path: "$x$y", params: { foo: "x", bar: "y" } },
      },
    ],
  },
  {
    path: "name{/:attr1}{-:attr2}{-:attr3}",
    tests: [
      {
        input: "name",
        expected: { path: "name", params: {} },
      },
      {
        input: "name/test",
        expected: {
          path: "name/test",
          params: { attr1: "test" },
        },
      },
      {
        input: "name/1",
        expected: {
          path: "name/1",
          params: { attr1: "1" },
        },
      },
      {
        input: "name/1-2",
        expected: {
          path: "name/1-2",
          params: { attr1: "1", attr2: "2" },
        },
      },
      {
        input: "name/1-2-3",
        expected: {
          path: "name/1-2-3",
          params: { attr1: "1", attr2: "2", attr3: "3" },
        },
      },
      {
        input: "name/foo-bar/route",
        expected: false,
      },
      {
        input: "name/test/route",
        expected: false,
      },
    ],
  },

  /**
   * https://github.com/pillarjs/path-to-regexp/issues/206
   */
  {
    path: "/user{s}/:user",
    tests: [
      {
        input: "/user/123",
        expected: { path: "/user/123", params: { user: "123" } },
      },
      {
        input: "/users/123",
        expected: { path: "/users/123", params: { user: "123" } },
      },
    ],
  },

  /**
   * Wildcard.
   */
  {
    path: "/*path",
    tests: [
      {
        input: "/",
        expected: false,
      },
      {
        input: "/route",
        expected: { path: "/route", params: { path: ["route"] } },
      },
      {
        input: "/route/nested",
        expected: {
          path: "/route/nested",
          params: { path: ["route", "nested"] },
        },
      },
    ],
  },
  {
    path: "*path",
    tests: [
      {
        input: "/",
        expected: { path: "/", params: { path: ["", ""] } },
      },
      {
        input: "/test",
        expected: { path: "/test", params: { path: ["", "test"] } },
      },
    ],
  },
  {
    path: "*path",
    options: { decode: false },
    tests: [
      {
        input: "/",
        expected: { path: "/", params: { path: "/" } },
      },
      {
        input: "/test",
        expected: { path: "/test", params: { path: "/test" } },
      },
    ],
  },
  {
    path: "/*path.:ext",
    tests: [
      {
        input: "/test.html",
        expected: {
          path: "/test.html",
          params: { path: ["test"], ext: "html" },
        },
      },
      {
        input: "/test.html/nested",
        expected: false,
      },
      {
        input: "/test.html/nested.json",
        expected: {
          path: "/test.html/nested.json",
          params: { path: ["test.html", "nested"], ext: "json" },
        },
      },
    ],
  },
  {
    path: "/:path.*ext",
    tests: [
      {
        input: "/test.html",
        expected: {
          path: "/test.html",
          params: { path: "test", ext: ["html"] },
        },
      },
      {
        input: "/test.html/nested",
        expected: {
          path: "/test.html/nested",
          params: { path: "test", ext: ["html", "nested"] },
        },
      },
      {
        input: "/test.html/nested.json",
        expected: {
          path: "/test.html/nested.json",
          params: { path: "test", ext: ["html", "nested.json"] },
        },
      },
    ],
  },
  {
    path: "/*path{.:ext}",
    tests: [
      {
        input: "/test.html",
        expected: {
          path: "/test.html",
          params: { path: ["test"], ext: "html" },
        },
      },
      {
        input: "/test.html/nested",
        expected: {
          params: {
            path: ["test.html", "nested"],
          },
          path: "/test.html/nested",
        },
      },
    ],
  },
  {
    path: "/entity/:id/*path",
    tests: [
      {
        input: "/entity/foo",
        expected: false,
      },
      {
        input: "/entity/foo/path",
        expected: {
          path: "/entity/foo/path",
          params: { id: "foo", path: ["path"] },
        },
      },
    ],
  },
  {
    path: "/*foo/:bar/*baz",
    tests: [
      {
        input: "/x/y/z",
        expected: {
          path: "/x/y/z",
          params: { foo: ["x"], bar: "y", baz: ["z"] },
        },
      },
      {
        input: "/1/2/3/4/5",
        expected: {
          path: "/1/2/3/4/5",
          params: { foo: ["1", "2", "3"], bar: "4", baz: ["5"] },
        },
      },
    ],
  },

  /**
   * Longer prefix.
   */
  {
    path: "/:foo{/test/:bar}",
    tests: [
      {
        input: "/route",
        expected: { path: "/route", params: { foo: "route" } },
      },
      {
        input: "/route/test/again",
        expected: {
          path: "/route/test/again",
          params: { foo: "route", bar: "again" },
        },
      },
    ],
  },

  /**
   * Backtracking tests.
   */
  {
    path: "{:foo/}{:bar.}",
    tests: [
      {
        input: "",
        expected: { path: "", params: {} },
      },
      {
        input: "test/",
        expected: {
          path: "test/",
          params: { foo: "test" },
        },
      },
      {
        input: "a/b.",
        expected: { path: "a/b.", params: { foo: "a", bar: "b" } },
      },
    ],
  },
  {
    path: "/abc{abc:foo}",
    tests: [
      {
        input: "/abc",
        expected: { path: "/abc", params: {} },
      },
      {
        input: "/abcabc",
        expected: false,
      },
      {
        input: "/abcabc123",
        expected: { path: "/abcabc123", params: { foo: "123" } },
      },
      {
        input: "/abcabcabc123",
        expected: {
          path: "/abcabcabc123",
          params: { foo: "abc123" },
        },
      },
      {
        input: "/abcabcabc",
        expected: { path: "/abcabcabc", params: { foo: "abc" } },
      },
    ],
  },
  {
    path: "/:foo{abc:bar}",
    tests: [
      {
        input: "/abc",
        expected: {
          params: { foo: "abc" },
          path: "/abc",
        },
      },
      {
        input: "/abcabc",
        expected: {
          params: { foo: "abcabc" },
          path: "/abcabc",
        },
      },
      {
        input: "/abcabc123",
        expected: {
          params: { foo: "abc", bar: "123" },
          path: "/abcabc123",
        },
      },
      {
        input: "/acb",
        expected: {
          path: "/acb",
          params: { foo: "acb" },
        },
      },
      {
        input: "/123",
        expected: {
          path: "/123",
          params: { foo: "123" },
        },
      },
      {
        input: "/123abcabc",
        expected: {
          path: "/123abcabc",
          params: { foo: "123abcabc" },
        },
      },
    ],
  },
  {
    path: "/:foo\\abc:bar",
    tests: [
      {
        input: "/abc",
        expected: false,
      },
      {
        input: "/abcabc",
        expected: false,
      },
      {
        input: "/abcabc123",
        expected: {
          path: "/abcabc123",
          params: { foo: "abc", bar: "123" },
        },
      },
      {
        input: "/123abcabc",
        expected: false,
      },
    ],
  },
  {
    path: "/route|:param|",
    tests: [
      {
        input: "/route|world|",
        expected: {
          path: "/route|world|",
          params: { param: "world" },
        },
      },
      {
        input: "/route||",
        expected: false,
      },
    ],
  },
  {
    path: "/:foo|:bar|",
    tests: [
      {
        input: "/hello|world|",
        expected: {
          path: "/hello|world|",
          params: { foo: "hello", bar: "world" },
        },
      },
      {
        input: "/hello||",
        expected: false,
      },
    ],
  },
  {
    path: "/:foo{|:bar|}",
    tests: [
      {
        input: "/hello|world|",
        expected: {
          path: "/hello|world|",
          params: { foo: "hello", bar: "world" },
        },
      },
      {
        input: "/hello||",
        expected: { path: "/hello||", params: { foo: "hello||" } },
      },
    ],
  },
  {
    path: ":foo\\@:bar",
    tests: [
      {
        input: "x@y",
        expected: { path: "x@y", params: { foo: "x", bar: "y" } },
      },
      {
        input: "x@",
        expected: false,
      },
    ],
  },

  /**
   * Multi character delimiters.
   */
  {
    path: "%25:foo{%25:bar}",
    options: {
      delimiter: "%25",
    },
    tests: [
      {
        input: "%25hello",
        expected: { path: "%25hello", params: { foo: "hello" } },
      },
      {
        input: "%25hello%25world",
        expected: {
          path: "%25hello%25world",
          params: { foo: "hello", bar: "world" },
        },
      },
      {
        input: "%25555%25222",
        expected: {
          path: "%25555%25222",
          params: { foo: "555", bar: "222" },
        },
      },
    ],
  },

  /**
   * Array input is normalized.
   */
  {
    path: ["/:foo/:bar", "/:foo/:baz"],
    tests: [
      {
        input: "/hello/world",
        expected: {
          path: "/hello/world",
          params: { foo: "hello", bar: "world" },
        },
      },
    ],
  },
];
