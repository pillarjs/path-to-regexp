import type {
  MatchOptions,
  Match,
  ParseOptions,
  Token,
  CompileOptions,
  ParamData,
} from "./index.js";

export interface ParserTestSet {
  path: string;
  options?: ParseOptions;
  expected: Token[];
}

export interface CompileTestSet {
  path: string;
  options?: CompileOptions & ParseOptions;
  tests: Array<{
    input: ParamData | undefined;
    expected: string | null;
  }>;
}

export interface MatchTestSet {
  path: string;
  options?: MatchOptions & ParseOptions;
  tests: Array<{
    input: string;
    expected: Match<any>;
  }>;
}

export const PARSER_TESTS: ParserTestSet[] = [
  {
    path: "/",
    expected: ["/"],
  },
  {
    path: "/:test",
    expected: ["/", { name: "test" }],
  },
  {
    path: '/:"0"',
    expected: ["/", { name: "0" }],
  },
  {
    path: "/:_",
    expected: ["/", { name: "_" }],
  },
  {
    path: "/:café",
    expected: ["/", { name: "café" }],
  },
  {
    path: '/:"123"',
    expected: ["/", { name: "123" }],
  },
  {
    path: '/:"1\\"\\2\\"3"',
    expected: ["/", { name: '1"2"3' }],
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
    options: { validate: false },
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123%2Fxyz" },
    ],
  },
  {
    path: "/:test",
    options: { validate: false, encode: false },
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123/xyz" },
    ],
  },
  {
    path: "/:test",
    options: { encode: encodeURIComponent },
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123%2Fxyz" },
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
    path: "{/:test}?",
    options: { encode: false },
    tests: [
      { input: undefined, expected: "" },
      { input: {}, expected: "" },
      { input: { test: undefined }, expected: "" },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: null },
    ],
  },
  {
    path: "/:test(.*)",
    options: { encode: false },
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "" }, expected: "/" },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123/xyz" },
    ],
  },
  {
    path: "{/:test}*",
    tests: [
      { input: undefined, expected: "" },
      { input: {}, expected: "" },
      { input: { test: [] }, expected: "" },
      { input: { test: [""] }, expected: null },
      { input: { test: ["123"] }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: null },
      { input: { test: ["123", "xyz"] }, expected: "/123/xyz" },
    ],
  },
  {
    path: "{/:test}*",
    options: { encode: false },
    tests: [
      { input: undefined, expected: "" },
      { input: {}, expected: "" },
      { input: { test: "" }, expected: null },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123/xyz" },
      { input: { test: ["123", "xyz"] }, expected: null },
    ],
  },
  {
    path: "/{<:foo>}+",
    tests: [
      { input: undefined, expected: null },
      { input: { foo: ["x", "y", "z"] }, expected: "/<x><y><z>" },
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
        expected: false,
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
        expected: false,
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
        expected: false,
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
        expected: false,
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
      {
        input: "/TEST",
        expected: { path: "/TEST", params: {} },
      },
      { input: "/test", expected: false },
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
        expected: { path: "/test", params: {} },
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
        expected: { path: "/test/", params: {} },
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
        expected: { path: "/route", params: { test: "route" } },
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
          path: "/route.json",
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
        expected: { path: "", params: {} },
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
    path: "{/:test}?",
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
        expected: false,
      },
    ],
  },
  {
    path: "{/:test}?/bar",
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
        expected: false,
      },
    ],
  },
  {
    path: "{/:test}?-bar",
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
        expected: false,
      },
    ],
  },
  {
    path: "/{:test}?-bar",
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
        expected: false,
      },
    ],
  },

  /**
   * Zero or more times.
   */
  {
    path: "{/:test}*",
    tests: [
      {
        input: "/",
        expected: false,
      },
      {
        input: "//",
        expected: false,
      },
      {
        input: "/route",
        expected: { path: "/route", params: { test: ["route"] } },
      },
      {
        input: "/some/basic/route",
        expected: {
          path: "/some/basic/route",
          params: { test: ["some", "basic", "route"] },
        },
      },
    ],
  },
  {
    path: "{/:test}*-bar",
    tests: [
      {
        input: "-bar",
        expected: { path: "-bar", params: {} },
      },
      {
        input: "/-bar",
        expected: false,
      },
      {
        input: "/foo-bar",
        expected: { path: "/foo-bar", params: { test: ["foo"] } },
      },
      {
        input: "/foo/baz-bar",
        expected: {
          path: "/foo/baz-bar",
          params: { test: ["foo", "baz"] },
        },
      },
    ],
  },

  /**
   * One or more times.
   */
  {
    path: "{/:test}+",
    tests: [
      {
        input: "/",
        expected: false,
      },
      {
        input: "//",
        expected: false,
      },
      {
        input: "/route",
        expected: { path: "/route", params: { test: ["route"] } },
      },
      {
        input: "/some/basic/route",
        expected: {
          path: "/some/basic/route",
          params: { test: ["some", "basic", "route"] },
        },
      },
    ],
  },
  {
    path: "{/:test}+-bar",
    tests: [
      {
        input: "-bar",
        expected: false,
      },
      {
        input: "/-bar",
        expected: false,
      },
      {
        input: "/foo-bar",
        expected: { path: "/foo-bar", params: { test: ["foo"] } },
      },
      {
        input: "/foo/baz-bar",
        expected: {
          path: "/foo/baz-bar",
          params: { test: ["foo", "baz"] },
        },
      },
    ],
  },

  /**
   * Custom parameters.
   */
  {
    path: String.raw`/:test(\d+)`,
    tests: [
      {
        input: "/123",
        expected: { path: "/123", params: { test: "123" } },
      },
      {
        input: "/abc",
        expected: false,
      },
      {
        input: "/123/abc",
        expected: false,
      },
    ],
  },
  {
    path: String.raw`/:test(\d+)-bar`,
    tests: [
      {
        input: "-bar",
        expected: false,
      },
      {
        input: "/-bar",
        expected: false,
      },
      {
        input: "/abc-bar",
        expected: false,
      },
      {
        input: "/123-bar",
        expected: { path: "/123-bar", params: { test: "123" } },
      },
      {
        input: "/123/456-bar",
        expected: false,
      },
    ],
  },
  {
    path: "/:test(.*)",
    tests: [
      {
        input: "/",
        expected: { path: "/", params: { test: "" } },
      },
      {
        input: "/route",
        expected: { path: "/route", params: { test: "route" } },
      },
      {
        input: "/route/123",
        expected: {
          path: "/route/123",
          params: { test: "route/123" },
        },
      },
      {
        input: "/;,:@&=/+$-_.!/~*()",
        expected: {
          path: "/;,:@&=/+$-_.!/~*()",
          params: { test: ";,:@&=/+$-_.!/~*()" },
        },
      },
    ],
  },
  {
    path: "/:test([a-z]+)",
    tests: [
      {
        input: "/abc",
        expected: { path: "/abc", params: { test: "abc" } },
      },
      {
        input: "/123",
        expected: false,
      },
      {
        input: "/abc/123",
        expected: false,
      },
    ],
  },
  {
    path: "/:test(this|that)",
    tests: [
      {
        input: "/this",
        expected: { path: "/this", params: { test: "this" } },
      },
      {
        input: "/that",
        expected: { path: "/that", params: { test: "that" } },
      },
      {
        input: "/foo",
        expected: false,
      },
    ],
  },
  {
    path: "{/:test(abc|xyz)}*",
    tests: [
      {
        input: "/",
        expected: false,
      },
      {
        input: "/abc",
        expected: { path: "/abc", params: { test: ["abc"] } },
      },
      {
        input: "/abc/abc",
        expected: {
          path: "/abc/abc",
          params: { test: ["abc", "abc"] },
        },
      },
      {
        input: "/xyz/xyz",
        expected: {
          path: "/xyz/xyz",
          params: { test: ["xyz", "xyz"] },
        },
      },
      {
        input: "/abc/xyz",
        expected: {
          path: "/abc/xyz",
          params: { test: ["abc", "xyz"] },
        },
      },
      {
        input: "/abc/xyz/abc/xyz",
        expected: {
          path: "/abc/xyz/abc/xyz",
          params: { test: ["abc", "xyz", "abc", "xyz"] },
        },
      },
      {
        input: "/xyzxyz",
        expected: false,
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
        expected: false,
      },
    ],
  },
  {
    path: "{:test}?",
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
  {
    path: "{:test/}+",
    tests: [
      {
        input: "route/",
        expected: { path: "route/", params: { test: ["route"] } },
      },
      {
        input: "/route",
        expected: false,
      },
      {
        input: "",
        expected: false,
      },
      {
        input: "foo/bar/",
        expected: {
          path: "foo/bar/",
          params: { test: ["foo", "bar"] },
        },
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
        expected: false,
      },
    ],
  },
  {
    path: "/:test([^/]+).json",
    tests: [
      {
        input: "/route.json.json",
        expected: {
          path: "/route.json.json",
          params: { test: "route.json" },
        },
      },
    ],
  },

  /**
   * Format params.
   */
  {
    path: "/test.:format(\\w+)",
    tests: [
      {
        input: "/test.html",
        expected: { path: "/test.html", params: { format: "html" } },
      },
      {
        input: "/test",
        expected: false,
      },
    ],
  },
  {
    path: "/test.:format(\\w+).:format(\\w+)",
    tests: [
      {
        input: "/test.html.json",
        expected: {
          path: "/test.html.json",
          params: { format: "json" },
        },
      },
      {
        input: "/test.html",
        expected: false,
      },
    ],
  },
  {
    path: "/test{.:format(\\w+)}?",
    tests: [
      {
        input: "/test",
        expected: { path: "/test", params: { format: undefined } },
      },
      {
        input: "/test.html",
        expected: { path: "/test.html", params: { format: "html" } },
      },
    ],
  },
  {
    path: "/test{.:format(\\w+)}+",
    tests: [
      {
        input: "/test",
        expected: false,
      },
      {
        input: "/test.html",
        expected: {
          path: "/test.html",
          params: { format: ["html"] },
        },
      },
      {
        input: "/test.html.json",
        expected: {
          path: "/test.html.json",
          params: { format: ["html", "json"] },
        },
      },
    ],
  },
  {
    path: "/test{.:format}+",
    tests: [
      {
        input: "/test",
        expected: false,
      },
      {
        input: "/test.html",
        expected: {
          path: "/test.html",
          params: { format: ["html"] },
        },
      },
      {
        input: "/test.hbs.html",
        expected: {
          path: "/test.hbs.html",
          params: { format: ["hbs", "html"] },
        },
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
          params: { test: "route", format: "html.json" },
        },
      },
    ],
  },
  {
    path: "/:test{.:format}?",
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
          params: { test: "route", format: "json.html" },
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
   * Unnamed params.
   */
  {
    path: "/(\\d+)",
    tests: [
      {
        input: "/123",
        expected: { path: "/123", params: { "0": "123" } },
      },
      {
        input: "/abc",
        expected: false,
      },
      {
        input: "/123/abc",
        expected: false,
      },
    ],
  },
  {
    path: "{/(\\d+)}?",
    tests: [
      {
        input: "/",
        expected: false,
      },
      {
        input: "/123",
        expected: { path: "/123", params: { "0": "123" } },
      },
    ],
  },
  {
    path: "/route\\(\\\\(\\d+\\\\)\\)",
    tests: [
      {
        input: "/route(\\123\\)",
        expected: {
          path: "/route(\\123\\)",
          params: { "0": "123\\" },
        },
      },
      {
        input: "/route(\\123)",
        expected: false,
      },
    ],
  },
  {
    path: "{/route}?",
    tests: [
      {
        input: "",
        expected: { path: "", params: {} },
      },
      {
        input: "/",
        expected: false,
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
    path: "{/(.*)}",
    tests: [
      {
        input: "/",
        expected: { path: "/", params: { "0": "" } },
      },
      {
        input: "/login",
        expected: { path: "/login", params: { "0": "login" } },
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
    path: "/.\\+\\*\\?\\{\\}=^\\!\\:$[]\\|",
    tests: [
      {
        input: "/.+*?{}=^!:$[]|",
        expected: { path: "/.+*?{}=^!:$[]|", params: {} },
      },
    ],
  },
  {
    path: "/test/{:uid(u\\d+)}?{:cid(c\\d+)}?",
    tests: [
      {
        input: "/test/u123",
        expected: { path: "/test/u123", params: { uid: "u123" } },
      },
      {
        input: "/test/c123",
        expected: { path: "/test/c123", params: { cid: "c123" } },
      },
    ],
  },

  /**
   * Unnamed group prefix.
   */
  {
    path: "/{apple-}?icon-:res(\\d+).png",
    tests: [
      {
        input: "/icon-240.png",
        expected: { path: "/icon-240.png", params: { res: "240" } },
      },
      {
        input: "/apple-icon-240.png",
        expected: {
          path: "/apple-icon-240.png",
          params: { res: "240" },
        },
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
    path: "/:remote([\\w\\-\\.]+)/:user([\\w-]+)",
    tests: [
      {
        input: "/endpoint/user",
        expected: {
          path: "/endpoint/user",
          params: { remote: "endpoint", user: "user" },
        },
      },
      {
        input: "/endpoint/user-name",
        expected: {
          path: "/endpoint/user-name",
          params: { remote: "endpoint", user: "user-name" },
        },
      },
      {
        input: "/foo.bar/user-name",
        expected: {
          path: "/foo.bar/user-name",
          params: { remote: "foo.bar", user: "user-name" },
        },
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
    path: "{/:foo}+bar",
    tests: [
      {
        input: "/foobar",
        expected: { path: "/foobar", params: { foo: ["foo"] } },
      },
      {
        input: "/foo/bar",
        expected: false,
      },
      {
        input: "/foo/barbar",
        expected: false,
      },
    ],
  },
  {
    path: "/{:pre}?baz",
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
    path: "/:foo\\({:bar}?\\)",
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
    path: "/:postType(video|audio|text){(\\+.+)}?",
    tests: [
      {
        input: "/video",
        expected: { path: "/video", params: { postType: "video" } },
      },
      {
        input: "/video+test",
        expected: {
          path: "/video+test",
          params: { 0: "+test", postType: "video" },
        },
      },
      {
        input: "/video+",
        expected: false,
      },
    ],
  },
  {
    path: "{/:foo}?{/:bar}?-ext",
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
    path: "/:required{/:optional}?-ext",
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
    path: "mail{.:domain}?.com",
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
    path: "{$:foo}{$:bar}?",
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
    path: "{$:foo}+",
    tests: [
      {
        input: "$x",
        expected: { path: "$x", params: { foo: ["x"] } },
      },
      {
        input: "$x$y",
        expected: { path: "$x$y", params: { foo: ["x", "y"] } },
      },
    ],
  },
  {
    path: "name{/:attr1}?{-:attr2}?{-:attr3}?",
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
  {
    path: "name{/:attrs;-}*",
    tests: [
      {
        input: "name",
        expected: { path: "name", params: {} },
      },
      {
        input: "name/1",
        expected: {
          path: "name/1",
          params: { attrs: ["1"] },
        },
      },
      {
        input: "name/1-2",
        expected: {
          path: "name/1-2",
          params: { attrs: ["1", "2"] },
        },
      },
      {
        input: "name/1-2-3",
        expected: {
          path: "name/1-2-3",
          params: { attrs: ["1", "2", "3"] },
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
   * Nested parentheses.
   */
  {
    path: "/:test(\\d+(?:\\.\\d+)?)",
    tests: [
      {
        input: "/123",
        expected: { path: "/123", params: { test: "123" } },
      },
      {
        input: "/abc",
        expected: false,
      },
      {
        input: "/123/abc",
        expected: false,
      },
      {
        input: "/123.123",
        expected: { path: "/123.123", params: { test: "123.123" } },
      },
      {
        input: "/123.abc",
        expected: false,
      },
    ],
  },
  {
    path: "/:test((?!login)[^/]+)",
    tests: [
      {
        input: "/route",
        expected: { path: "/route", params: { test: "route" } },
      },
      {
        input: "/login",
        expected: false,
      },
    ],
  },

  /**
   * https://github.com/pillarjs/path-to-regexp/issues/206
   */
  {
    path: "/user{(s)}?/:user",
    tests: [
      {
        input: "/user/123",
        expected: { path: "/user/123", params: { user: "123" } },
      },
      {
        input: "/users/123",
        expected: {
          path: "/users/123",
          params: { 0: "s", user: "123" },
        },
      },
    ],
  },
  {
    path: "/user{s}?/:user",
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
   * https://github.com/pillarjs/path-to-regexp/pull/270
   */
  {
    path: "/files{/:path}*{.:ext}*",
    tests: [
      {
        input: "/files/hello/world.txt",
        expected: {
          path: "/files/hello/world.txt",
          params: { path: ["hello", "world"], ext: ["txt"] },
        },
      },
      {
        input: "/files/hello/world.txt.png",
        expected: {
          path: "/files/hello/world.txt.png",
          params: { path: ["hello", "world"], ext: ["txt", "png"] },
        },
      },
      {
        input: "/files/my/photo.jpg/gif",
        expected: false,
      },
    ],
  },
  {
    path: "/files{/:path}*{.:ext}?",
    tests: [
      {
        input: "/files/hello/world.txt",
        expected: {
          path: "/files/hello/world.txt",
          params: { path: ["hello", "world"], ext: "txt" },
        },
      },
      {
        input: "/files/my/photo.jpg/gif",
        expected: false,
      },
    ],
  },
  {
    path: "#/*",
    tests: [
      {
        input: "#/",
        expected: { path: "#/", params: {} },
      },
    ],
  },
  {
    path: "/foo{/:bar}*",
    tests: [
      {
        input: "/foo/test1/test2",
        expected: {
          path: "/foo/test1/test2",
          params: { bar: ["test1", "test2"] },
        },
      },
    ],
  },
  {
    path: "/entity/:id/*",
    tests: [
      {
        input: "/entity/foo",
        expected: false,
      },
      {
        input: "/entity/foo/",
        expected: { path: "/entity/foo/", params: { id: "foo" } },
      },
    ],
  },
  {
    path: "/test/*",
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
        input: "/test/route",
        expected: { path: "/test/route", params: { "0": ["route"] } },
      },
      {
        input: "/test/route/nested",
        expected: {
          path: "/test/route/nested",
          params: { "0": ["route", "nested"] },
        },
      },
    ],
  },

  /**
   * Asterisk wildcard.
   */
  {
    path: "/*",
    tests: [
      {
        input: "/",
        expected: { path: "/", params: { "0": undefined } },
      },
      {
        input: "/route",
        expected: { path: "/route", params: { "0": ["route"] } },
      },
      {
        input: "/route/nested",
        expected: {
          path: "/route/nested",
          params: { "0": ["route", "nested"] },
        },
      },
    ],
  },
  {
    path: "*",
    tests: [
      {
        input: "/",
        expected: { path: "/", params: { "0": ["", ""] } },
      },
      {
        input: "/test",
        expected: { path: "/test", params: { "0": ["", "test"] } },
      },
    ],
  },
  {
    path: "*",
    options: { decode: false },
    tests: [
      {
        input: "/",
        expected: { path: "/", params: { "0": "/" } },
      },
      {
        input: "/test",
        expected: { path: "/test", params: { "0": "/test" } },
      },
    ],
  },
  {
    path: "/*.:ext",
    tests: [
      {
        input: "/test.html",
        expected: {
          path: "/test.html",
          params: { "0": ["test"], ext: "html" },
        },
      },
      {
        input: "/test.html/nested",
        expected: false,
      },
    ],
  },
  {
    path: "/*{.:ext}?",
    tests: [
      {
        input: "/test.html",
        expected: {
          path: "/test.html",
          params: { "0": ["test.html"], ext: undefined },
        },
      },
      {
        input: "/test.html/nested",
        expected: {
          params: {
            "0": ["test.html", "nested"],
          },
          path: "/test.html/nested",
        },
      },
    ],
  },
  {
    path: "/*{.:ext}*",
    tests: [
      {
        input: "/test.html",
        expected: {
          path: "/test.html",
          params: { "0": ["test.html"], ext: undefined },
        },
      },
      {
        input: "/test.html/nested",
        expected: {
          params: {
            "0": ["test.html", "nested"],
          },
          path: "/test.html/nested",
        },
      },
    ],
  },

  /**
   * Longer prefix.
   */
  {
    path: "/:foo{/test/:bar}?",
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
   * Prefix and suffix as separator.
   */
  {
    path: "/{<:foo>}+",
    tests: [
      {
        input: "/<test>",
        expected: { path: "/<test>", params: { foo: ["test"] } },
      },
      {
        input: "/<test><again>",
        expected: {
          path: "/<test><again>",
          params: { foo: ["test", "again"] },
        },
      },
    ],
  },

  /**
   * Backtracking tests.
   */
  {
    path: "{:foo/}?{:bar.}?",
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
    path: "/abc{abc:foo}?",
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
    path: "/:foo{abc:bar}?",
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
        expected: false,
      },
      {
        input: "/acb",
        expected: {
          path: "/acb",
          params: { foo: "acb" },
        },
      },
      {
        input: "/acbabc123",
        expected: {
          path: "/acbabc123",
          params: { foo: "acb", bar: "123" },
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
        expected: false,
      },
    ],
  },
  {
    path: "/:foo(.*){.:ext}?",
    tests: [
      {
        input: "/abc",
        expected: { path: "/abc", params: { foo: "abc" } },
      },
      {
        input: "/abc.txt",
        expected: { path: "/abc.txt", params: { foo: "abc.txt" } },
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
    path: "%25:foo{%25:bar}?",
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
];
