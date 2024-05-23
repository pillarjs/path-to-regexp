import { describe, it, expect } from "vitest";
import * as util from "util";
import * as pathToRegexp from "./index";

type Test = [
  pathToRegexp.Path,
  pathToRegexp.MatchOptions | undefined,
  pathToRegexp.Token[],
  Array<[string, (string | undefined)[] | null, pathToRegexp.Match<any>?]>,
  Array<[any, string | null, pathToRegexp.CompileOptions?]>,
];

/**
 * An array of test cases with expected inputs and outputs.
 */
const TESTS: Test[] = [
  /**
   * Simple paths.
   */
  [
    "/",
    undefined,
    ["/"],
    [
      ["/", ["/"], { path: "/", index: 0, params: {} }],
      ["/route", null, false],
    ],
    [
      [undefined, "/"],
      [{}, "/"],
      [{ id: 123 }, "/"],
    ],
  ],
  [
    "/test",
    undefined,
    ["/test"],
    [
      ["/test", ["/test"], { path: "/test", index: 0, params: {} }],
      ["/route", null, false],
      ["/test/route", null, false],
      ["/test/", ["/test/"], { path: "/test/", index: 0, params: {} }],
    ],
    [
      [undefined, "/test"],
      [{}, "/test"],
    ],
  ],
  [
    "/test/",
    undefined,
    ["/test/"],
    [
      ["/test", null],
      ["/test/", ["/test/"]],
      ["/test//", ["/test//"]],
    ],
    [[undefined, "/test/"]],
  ],

  /**
   * Case-sensitive paths.
   */
  [
    "/test",
    {
      sensitive: true,
    },
    ["/test"],
    [
      ["/test", ["/test"]],
      ["/TEST", null],
    ],
    [[undefined, "/test"]],
  ],
  [
    "/TEST",
    {
      sensitive: true,
    },
    ["/TEST"],
    [
      ["/test", null],
      ["/TEST", ["/TEST"]],
    ],
    [[undefined, "/TEST"]],
  ],

  /**
   * Strict mode.
   */
  [
    "/test",
    {
      trailing: false,
    },
    ["/test"],
    [
      ["/test", ["/test"]],
      ["/test/", null],
      ["/TEST", ["/TEST"]],
    ],
    [[undefined, "/test"]],
  ],
  [
    "/test/",
    {
      trailing: false,
    },
    ["/test/"],
    [
      ["/test", null],
      ["/test/", ["/test/"]],
      ["/test//", ["/test//"]],
      ["/test/route", null],
    ],
    [[undefined, "/test/"]],
  ],

  /**
   * Non-ending mode.
   */
  [
    "/test",
    {
      end: false,
    },
    ["/test"],
    [
      ["/test", ["/test"]],
      ["/test/", ["/test/"]],
      ["/test/route", ["/test"]],
      ["/route", null],
    ],
    [[undefined, "/test"]],
  ],
  [
    "/test/",
    {
      end: false,
    },
    ["/test/"],
    [
      ["/test", null],
      ["/test/route", null],
      ["/test//route", ["/test/"]],
      ["/test//", ["/test//"]],
      ["/foo//bar", null],
    ],
    [[undefined, "/test/"]],
  ],
  [
    "/:test",
    {
      end: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      [
        "/route",
        ["/route", "route"],
        { path: "/route", index: 0, params: { test: "route" } },
      ],
      [
        "/caf%C3%A9",
        ["/caf%C3%A9", "caf%C3%A9"],
        { path: "/caf%C3%A9", index: 0, params: { test: "café" } },
      ],
    ],
    [
      [{}, null],
      [{ test: "abc" }, "/abc"],
      [{ test: "a+b" }, "/a+b", { encode: (x) => x }],
      [{ test: "a+b" }, "/test", { encode: () => "test" }],
      [{ test: "a+b" }, "/a%2Bb", { encode: encodeURIComponent }],
    ],
  ],
  [
    "/:test/",
    {
      end: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      "/",
    ],
    [
      ["/route", null],
      ["/route/", ["/route/", "route"]],
    ],
    [[{ test: "abc" }, "/abc/"]],
  ],
  [
    "",
    {
      end: false,
    },
    [],
    [
      ["", [""]],
      ["/", ["/"]],
      ["route", null],
      ["/route", [""]],
      ["/route/", [""]],
    ],
    [[undefined, ""]],
  ],

  /**
   * Non-starting mode.
   */
  [
    "/test",
    {
      start: false,
    },
    ["/test"],
    [
      ["/test", ["/test"]],
      ["/test/", ["/test/"]],
      ["/route/test", ["/test"]],
      ["/test/route", null],
      ["/route/test/deep", null],
      ["/route", null],
    ],
    [[undefined, "/test"]],
  ],
  [
    "/test/",
    {
      start: false,
    },
    ["/test/"],
    [
      ["/test", null],
      ["/test/route", null],
      ["/test//route", null],
      ["/test//", ["/test//"]],
      ["/route/test/", ["/test/"]],
    ],
    [[undefined, "/test/"]],
  ],
  [
    "/:test",
    {
      start: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [["/route", ["/route", "route"]]],
    [
      [{}, null],
      [{ test: "abc" }, "/abc"],
      [{ test: "a+b" }, "/a+b", { encode: (x) => x }],
      [{ test: "a+b" }, "/test", { encode: () => "test" }],
      [{ test: "a+b" }, "/a%2Bb", { encode: encodeURIComponent }],
    ],
  ],
  [
    "/:test/",
    {
      start: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      "/",
    ],
    [
      ["/route", null],
      ["/route/", ["/route/", "route"]],
    ],
    [[{ test: "abc" }, "/abc/"]],
  ],
  [
    "",
    {
      start: false,
    },
    [],
    [
      ["", [""]],
      ["/", ["/"]],
      ["route", [""]],
      ["/route", [""]],
      ["/route/", ["/"]],
    ],
    [[undefined, ""]],
  ],

  /**
   * Combine modes.
   */
  [
    "/test",
    {
      end: false,
      trailing: false,
    },
    ["/test"],
    [
      ["/test", ["/test"]],
      ["/test/", ["/test"]],
      ["/test/route", ["/test"]],
    ],
    [[undefined, "/test"]],
  ],
  [
    "/test/",
    {
      end: false,
      trailing: false,
    },
    ["/test/"],
    [
      ["/test", null],
      ["/test/", ["/test/"]],
      ["/test//", ["/test//"]],
      ["/test/route", null],
      ["/test//route", ["/test/"]],
    ],
    [[undefined, "/test/"]],
  ],
  [
    "/test.json",
    {
      end: false,
      trailing: false,
    },
    ["/test.json"],
    [
      ["/test.json", ["/test.json"]],
      ["/test.json.hbs", null],
      ["/test.json/route", ["/test.json"]],
    ],
    [[undefined, "/test.json"]],
  ],
  [
    "/:test",
    {
      end: false,
      trailing: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route", ["/route", "route"]],
      ["/route/", ["/route", "route"]],
    ],
    [
      [{}, null],
      [{ test: "abc" }, "/abc"],
    ],
  ],
  [
    "/:test/",
    {
      end: false,
      trailing: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      "/",
    ],
    [
      ["/route", null],
      ["/route/", ["/route/", "route"]],
    ],
    [[{ test: "foobar" }, "/foobar/"]],
  ],
  [
    "/test",
    {
      start: false,
      end: false,
    },
    ["/test"],
    [
      ["/test", ["/test"]],
      ["/test/", ["/test/"]],
      ["/test/route", ["/test"]],
      ["/route/test/deep", ["/test"]],
    ],
    [[undefined, "/test"]],
  ],
  [
    "/test/",
    {
      start: false,
      end: false,
    },
    ["/test/"],
    [
      ["/test", null],
      ["/test/", ["/test/"]],
      ["/test//", ["/test//"]],
      ["/test/route", null],
      ["/route/test/deep", null],
    ],
    [[undefined, "/test/"]],
  ],
  [
    "/test.json",
    {
      start: false,
      end: false,
    },
    ["/test.json"],
    [
      ["/test.json", ["/test.json"]],
      ["/test.json.hbs", null],
      ["/test.json/route", ["/test.json"]],
      ["/route/test.json/deep", ["/test.json"]],
    ],
    [[undefined, "/test.json"]],
  ],
  [
    "/:test",
    {
      start: false,
      end: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route", ["/route", "route"]],
      ["/route/", ["/route/", "route"]],
    ],
    [
      [{}, null],
      [{ test: "abc" }, "/abc"],
    ],
  ],
  [
    "/:test/",
    {
      end: false,
      trailing: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      "/",
    ],
    [
      ["/route", null],
      ["/route/", ["/route/", "route"]],
    ],
    [[{ test: "foobar" }, "/foobar/"]],
  ],

  /**
   * Arrays of simple paths.
   */
  [
    ["/one", "/two"],
    undefined,
    [],
    [
      ["/one", ["/one"]],
      ["/two", ["/two"]],
      ["/three", null],
      ["/one/two", null],
    ],
    [],
  ],

  /**
   * Non-ending simple path.
   */
  [
    "/test",
    {
      end: false,
    },
    ["/test"],
    [["/test/route", ["/test"]]],
    [[undefined, "/test"]],
  ],

  /**
   * Single named parameter.
   */
  [
    "/:test",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route", ["/route", "route"]],
      ["/another", ["/another", "another"]],
      ["/something/else", null],
      ["/route.json", ["/route.json", "route.json"]],
      ["/something%2Felse", ["/something%2Felse", "something%2Felse"]],
      [
        "/something%2Felse%2Fmore",
        ["/something%2Felse%2Fmore", "something%2Felse%2Fmore"],
      ],
      ["/;,:@&=+$-_.!~*()", ["/;,:@&=+$-_.!~*()", ";,:@&=+$-_.!~*()"]],
    ],
    [
      [{ test: "route" }, "/route"],
      [
        { test: "something/else" },
        "/something%2Felse",
        { encode: encodeURIComponent },
      ],
      [
        { test: "something/else/more" },
        "/something%2Felse%2Fmore",
        { encode: encodeURIComponent },
      ],
    ],
  ],
  [
    "/:test",
    {
      trailing: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route", ["/route", "route"]],
      ["/route/", null],
    ],
    [[{ test: "route" }, "/route"]],
  ],
  [
    "/:test/",
    {
      trailing: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      "/",
    ],
    [
      ["/route/", ["/route/", "route"]],
      ["/route//", ["/route//", "route"]],
    ],
    [[{ test: "route" }, "/route/"]],
  ],
  [
    "/:test",
    {
      end: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route.json", ["/route.json", "route.json"]],
      ["/route//", ["/route//", "route"]],
      ["/foo/bar", ["/foo", "foo"]],
      ["/foo//bar", ["/foo/", "foo"]],
    ],
    [[{ test: "route" }, "/route"]],
  ],

  /**
   * Optional named parameter.
   */
  [
    "/:test?",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
    ],
    [
      [
        "/route",
        ["/route", "route"],
        { path: "/route", index: 0, params: { test: "route" } },
      ],
      ["/route/nested", null, false],
      ["/", ["/", undefined], { path: "/", index: 0, params: {} }],
      ["//", ["//", undefined], { path: "//", index: 0, params: {} }],
    ],
    [
      [undefined, ""],
      [{ test: "foobar" }, "/foobar"],
    ],
  ],
  [
    "/:test?",
    {
      trailing: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route", ["/route", "route"]],
      ["/", null], // Questionable behaviour.
      ["//", null],
    ],
    [
      [undefined, ""],
      [{ test: "foobar" }, "/foobar"],
    ],
  ],
  [
    "/:test?/",
    {
      trailing: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
      "/",
    ],
    [
      ["/route", null],
      ["/route/", ["/route/", "route"]],
      ["/", ["/", undefined]],
      ["//", ["//", undefined]],
    ],
    [
      [undefined, "/"],
      [{ test: "foobar" }, "/foobar/"],
    ],
  ],
  [
    "/:test?/bar",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
      "/bar",
    ],
    [
      ["/bar", ["/bar", undefined]],
      ["/foo/bar", ["/foo/bar", "foo"]],
    ],
    [
      [undefined, "/bar"],
      [{ test: "foo" }, "/foo/bar"],
    ],
  ],
  [
    "/:test?-bar",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
      "-bar",
    ],
    [
      ["-bar", ["-bar", undefined]],
      ["/-bar", null],
      ["/foo-bar", ["/foo-bar", "foo"]],
    ],
    [
      [undefined, "-bar"],
      [{ test: "foo" }, "/foo-bar"],
    ],
  ],
  [
    "/:test*-bar",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "*",
        pattern: "[^\\/]+?",
        separator: "/",
      },
      "-bar",
    ],
    [
      ["-bar", ["-bar", undefined]],
      ["/-bar", null],
      ["/foo-bar", ["/foo-bar", "foo"]],
      ["/foo/baz-bar", ["/foo/baz-bar", "foo/baz"]],
    ],
    [
      [{}, "-bar"],
      [{ test: [] }, "-bar"],
      [{ test: ["foo"] }, "/foo-bar"],
    ],
  ],

  /**
   * Repeated one or more times parameters.
   */
  [
    "/:test+",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "+",
        pattern: "[^\\/]+?",
        separator: "/",
      },
    ],
    [
      ["/", null, false],
      [
        "/route",
        ["/route", "route"],
        { path: "/route", index: 0, params: { test: ["route"] } },
      ],
      [
        "/some/basic/route",
        ["/some/basic/route", "some/basic/route"],
        {
          path: "/some/basic/route",
          index: 0,
          params: { test: ["some", "basic", "route"] },
        },
      ],
      ["//", null, false],
    ],
    [
      [{}, null],
      [{ test: ["foobar"] }, "/foobar"],
      [{ test: ["a", "b", "c"] }, "/a/b/c"],
    ],
  ],
  [
    "/:test(\\d+)+",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "+",
        pattern: "\\d+",
        separator: "/",
      },
    ],
    [
      ["/abc/456/789", null],
      ["/123/456/789", ["/123/456/789", "123/456/789"]],
    ],
    [
      [{ test: ["abc"] }, null],
      [{ test: ["123"] }, "/123"],
      [{ test: ["1", "2", "3"] }, "/1/2/3"],
    ],
  ],
  [
    "/route.:ext(json|xml)+",
    undefined,
    [
      "/route",
      {
        name: "ext",
        prefix: ".",
        suffix: "",
        modifier: "+",
        pattern: "json|xml",
        separator: ".",
      },
    ],
    [
      ["/route", null],
      ["/route.json", ["/route.json", "json"]],
      ["/route.xml.json", ["/route.xml.json", "xml.json"]],
      ["/route.html", null],
    ],
    [
      [{ ext: ["foobar"] }, null],
      [{ ext: ["xml"] }, "/route.xml"],
      [{ ext: ["xml", "json"] }, "/route.xml.json"],
    ],
  ],
  [
    "/route.:ext(\\w+)/test",
    undefined,
    [
      "/route",
      {
        name: "ext",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "\\w+",
      },
      "/test",
    ],
    [
      ["/route", null],
      ["/route.json", null],
      ["/route.xml/test", ["/route.xml/test", "xml"]],
      ["/route.json.gz/test", null],
    ],
    [[{ ext: "xml" }, "/route.xml/test"]],
  ],

  /**
   * Repeated zero or more times parameters.
   */
  [
    "/:test*",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "*",
        pattern: "[^\\/]+?",
        separator: "/",
      },
    ],
    [
      ["/", ["/", undefined], { path: "/", index: 0, params: {} }],
      ["//", ["//", undefined], { path: "//", index: 0, params: {} }],
      [
        "/route",
        ["/route", "route"],
        { path: "/route", index: 0, params: { test: ["route"] } },
      ],
      [
        "/some/basic/route",
        ["/some/basic/route", "some/basic/route"],
        {
          path: "/some/basic/route",
          index: 0,
          params: { test: ["some", "basic", "route"] },
        },
      ],
    ],
    [
      [{}, ""],
      [{ test: [] }, ""],
      [{ test: ["foobar"] }, "/foobar"],
      [{ test: ["foo", "bar"] }, "/foo/bar"],
    ],
  ],
  [
    "/route.:ext([a-z]+)*",
    undefined,
    [
      "/route",
      {
        name: "ext",
        prefix: ".",
        suffix: "",
        modifier: "*",
        pattern: "[a-z]+",
        separator: ".",
      },
    ],
    [
      ["/route", ["/route", undefined]],
      ["/route.json", ["/route.json", "json"]],
      ["/route.json.xml", ["/route.json.xml", "json.xml"]],
      ["/route.123", null],
    ],
    [
      [{}, "/route"],
      [{ ext: [] }, "/route"],
      [{ ext: ["123"] }, null],
      [{ ext: ["foobar"] }, "/route.foobar"],
      [{ ext: ["foo", "bar"] }, "/route.foo.bar"],
    ],
  ],

  /**
   * Custom named parameters.
   */
  [
    "/:test(\\d+)",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "\\d+",
      },
    ],
    [
      ["/123", ["/123", "123"]],
      ["/abc", null],
      ["/123/abc", null],
    ],
    [
      [{ test: "abc" }, null],
      [{ test: "abc" }, "/abc", { validate: false }],
      [{ test: "123" }, "/123"],
    ],
  ],
  [
    "/:test(\\d+)",
    {
      end: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "\\d+",
      },
    ],
    [
      ["/123", ["/123", "123"]],
      ["/abc", null],
      ["/123/abc", ["/123", "123"]],
    ],
    [[{ test: "123" }, "/123"]],
  ],
  [
    "/:test(.*)",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: ".*",
      },
    ],
    [
      ["/anything/goes/here", ["/anything/goes/here", "anything/goes/here"]],
      ["/;,:@&=/+$-_.!/~*()", ["/;,:@&=/+$-_.!/~*()", ";,:@&=/+$-_.!/~*()"]],
    ],
    [
      [{ test: "" }, "/"],
      [{ test: "abc" }, "/abc"],
      [{ test: "abc/123" }, "/abc%2F123"],
      [{ test: "abc/123/456" }, "/abc%2F123%2F456"],
    ],
  ],
  [
    "/:route([a-z]+)",
    undefined,
    [
      {
        name: "route",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[a-z]+",
      },
    ],
    [
      ["/abcde", ["/abcde", "abcde"]],
      ["/12345", null],
    ],
    [
      [{ route: "" }, null],
      [{ route: "" }, "/", { validate: false }],
      [{ route: "123" }, null],
      [{ route: "123" }, "/123", { validate: false }],
      [{ route: "abc" }, "/abc"],
    ],
  ],
  [
    "/:route(this|that)",
    undefined,
    [
      {
        name: "route",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "this|that",
      },
    ],
    [
      ["/this", ["/this", "this"]],
      ["/that", ["/that", "that"]],
      ["/foo", null],
    ],
    [
      [{ route: "this" }, "/this"],
      [{ route: "foo" }, null],
      [{ route: "foo" }, "/foo", { validate: false }],
      [{ route: "that" }, "/that"],
    ],
  ],
  [
    "/:path(abc|xyz)*",
    undefined,
    [
      {
        name: "path",
        prefix: "/",
        suffix: "",
        modifier: "*",
        pattern: "abc|xyz",
        separator: "/",
      },
    ],
    [
      ["/abc", ["/abc", "abc"]],
      ["/abc/abc", ["/abc/abc", "abc/abc"]],
      ["/xyz/xyz", ["/xyz/xyz", "xyz/xyz"]],
      ["/abc/xyz", ["/abc/xyz", "abc/xyz"]],
      ["/abc/xyz/abc/xyz", ["/abc/xyz/abc/xyz", "abc/xyz/abc/xyz"]],
      ["/xyzxyz", null],
    ],
    [
      [{ path: ["abc"] }, "/abc"],
      [{ path: ["abc", "xyz"] }, "/abc/xyz"],
      [{ path: ["xyz", "abc", "xyz"] }, "/xyz/abc/xyz"],
      [{ path: ["abc123"] }, null],
      [{ path: ["abc123"] }, "/abc123", { validate: false }],
      [{ path: ["abcxyz"] }, null],
      [{ path: ["abcxyz"] }, "/abcxyz", { validate: false }],
    ],
  ],

  /**
   * Prefixed slashes could be omitted.
   */
  [
    "test",
    undefined,
    ["test"],
    [
      ["test", ["test"]],
      ["/test", null],
    ],
    [[undefined, "test"]],
  ],
  [
    ":test",
    undefined,
    [
      {
        name: "test",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["route", ["route", "route"]],
      ["/route", null],
      ["route/", ["route/", "route"]],
    ],
    [
      [{ test: "" }, null],
      [{}, null],
      [{ test: null }, null],
      [{ test: "route" }, "route"],
    ],
  ],
  [
    ":test",
    {
      trailing: false,
    },
    [
      {
        name: "test",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["route", ["route", "route"]],
      ["/route", null],
      ["route/", null],
    ],
    [[{ test: "route" }, "route"]],
  ],
  [
    ":test",
    {
      end: false,
    },
    [
      {
        name: "test",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["route", ["route", "route"]],
      ["/route", null],
      ["route/", ["route/", "route"]],
      ["route/foobar", ["route", "route"]],
    ],
    [[{ test: "route" }, "route"]],
  ],
  [
    ":test?",
    undefined,
    [
      {
        name: "test",
        prefix: "",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["route", ["route", "route"]],
      ["/route", null],
      ["", ["", undefined]],
      ["route/foobar", null],
    ],
    [
      [{}, ""],
      [{ test: "" }, ""],
      [{ test: "route" }, "route"],
    ],
  ],
  [
    "{:test/}+",
    undefined,
    [
      {
        name: "test",
        prefix: "",
        suffix: "/",
        modifier: "+",
        pattern: "[^\\/]+?",
        separator: "/",
      },
    ],
    [
      ["route/", ["route/", "route"]],
      ["/route", null],
      ["", null],
      ["foo/bar/", ["foo/bar/", "foo/bar"]],
    ],
    [
      [{}, null],
      [{ test: "" }, null],
      [{ test: ["route"] }, "route/"],
      [{ test: ["foo", "bar"] }, "foo/bar/"],
    ],
  ],

  /**
   * Formats.
   */
  [
    "/test.json",
    undefined,
    ["/test.json"],
    [
      ["/test.json", ["/test.json"]],
      ["/route.json", null],
    ],
    [[{}, "/test.json"]],
  ],
  [
    "/:test.json",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      ".json",
    ],
    [
      ["/.json", null],
      ["/test.json", ["/test.json", "test"]],
      ["/route.json", ["/route.json", "route"]],
      ["/route.json.json", ["/route.json.json", "route.json"]],
    ],
    [
      [{ test: "" }, null],
      [{ test: "foo" }, "/foo.json"],
    ],
  ],

  /**
   * Format params.
   */
  [
    "/test.:format(\\w+)",
    undefined,
    [
      "/test",
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "\\w+",
      },
    ],
    [
      ["/test.html", ["/test.html", "html"]],
      ["/test.hbs.html", null],
    ],
    [
      [{}, null],
      [{ format: "" }, null],
      [{ format: "foo" }, "/test.foo"],
    ],
  ],
  [
    "/test.:format(\\w+).:format(\\w+)",
    undefined,
    [
      "/test",
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "\\w+",
      },
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "\\w+",
      },
    ],
    [
      ["/test.html", null],
      ["/test.hbs.html", ["/test.hbs.html", "hbs", "html"]],
    ],
    [
      [{ format: "foo.bar" }, null],
      [{ format: "foo" }, "/test.foo.foo"],
    ],
  ],
  [
    "/test{.:format}+",
    undefined,
    [
      "/test",
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "+",
        pattern: "[^\\/]+?",
        separator: ".",
      },
    ],
    [
      ["/test.html", ["/test.html", "html"]],
      ["/test.hbs.html", ["/test.hbs.html", "hbs.html"]],
    ],
    [
      [{ format: [] }, null],
      [{ format: ["foo"] }, "/test.foo"],
      [{ format: ["foo", "bar"] }, "/test.foo.bar"],
    ],
  ],
  [
    "/test.:format(\\w+)",
    {
      end: false,
    },
    [
      "/test",
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "\\w+",
      },
    ],
    [
      ["/test.html", ["/test.html", "html"]],
      ["/test.hbs.html", null],
    ],
    [[{ format: "foo" }, "/test.foo"]],
  ],
  [
    "/test.:format.",
    undefined,
    [
      "/test",
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      ".",
    ],
    [
      ["/test.html.", ["/test.html.", "html"]],
      ["/test.hbs.html", null],
    ],
    [
      [{ format: "" }, null],
      [{ format: "foo" }, "/test.foo."],
    ],
  ],

  /**
   * Format and path params.
   */
  [
    "/:test.:format",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route.html", ["/route.html", "route", "html"]],
      ["/route", null],
      ["/route.html.json", ["/route.html.json", "route", "html.json"]],
    ],
    [
      [{}, null],
      [{ test: "route", format: "foo" }, "/route.foo"],
    ],
  ],
  [
    "/:test{.:format}?",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route", ["/route", "route", undefined]],
      ["/route.json", ["/route.json", "route", "json"]],
      ["/route.json.html", ["/route.json.html", "route", "json.html"]],
    ],
    [
      [{ test: "route" }, "/route"],
      [{ test: "route", format: "" }, null],
      [{ test: "route", format: "foo" }, "/route.foo"],
    ],
  ],
  [
    "/:test.:format?",
    {
      end: false,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/route", ["/route", "route", undefined]],
      ["/route.json", ["/route.json", "route", "json"]],
      ["/route.json.html", ["/route.json.html", "route", "json.html"]],
    ],
    [
      [{ test: "route" }, "/route"],
      [{ test: "route", format: undefined }, "/route"],
      [{ test: "route", format: "" }, null],
      [{ test: "route", format: "foo" }, "/route.foo"],
    ],
  ],
  [
    "/test.:format(.*)z",
    {
      end: false,
    },
    [
      "/test",
      {
        name: "format",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: ".*",
      },
      "z",
    ],
    [
      ["/test.abc", null],
      ["/test.z", ["/test.z", ""]],
      ["/test.abcz", ["/test.abcz", "abc"]],
    ],
    [
      [{}, null],
      [{ format: "" }, "/test.z"],
      [{ format: "foo" }, "/test.fooz"],
    ],
  ],

  /**
   * Unnamed params.
   */
  [
    "/(\\d+)",
    undefined,
    [
      {
        name: 0,
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "\\d+",
      },
    ],
    [
      ["/123", ["/123", "123"]],
      ["/abc", null],
      ["/123/abc", null],
    ],
    [
      [{}, null],
      [{ "0": "123" }, "/123"],
    ],
  ],
  [
    "/(\\d+)",
    {
      end: false,
    },
    [
      {
        name: 0,
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "\\d+",
      },
    ],
    [
      ["/123", ["/123", "123"]],
      ["/abc", null],
      ["/123/abc", ["/123", "123"]],
      ["/123/", ["/123/", "123"]],
    ],
    [[{ "0": "123" }, "/123"]],
  ],
  [
    "/(\\d+)?",
    undefined,
    [
      {
        name: 0,
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "\\d+",
      },
    ],
    [
      ["/", ["/", undefined]],
      ["/123", ["/123", "123"]],
    ],
    [
      [{}, ""],
      [{ "0": "123" }, "/123"],
    ],
  ],
  [
    "/(.*)",
    undefined,
    [
      {
        name: 0,
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: ".*",
      },
    ],
    [
      ["/", ["/", ""]],
      ["/route", ["/route", "route"]],
      ["/route/nested", ["/route/nested", "route/nested"]],
    ],
    [
      [{ "0": "" }, "/"],
      [{ "0": "123" }, "/123"],
    ],
  ],
  [
    "/route\\(\\\\(\\d+\\\\)\\)",
    undefined,
    [
      "/route(\\",
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "\\d+\\\\",
      },
      ")",
    ],
    [["/route(\\123\\)", ["/route(\\123\\)", "123\\"]]],
    [[["123\\"], "/route(\\123\\)", { encode: (x) => x }]],
  ],
  [
    "{/login}?",
    undefined,
    [
      {
        name: "",
        prefix: "/login",
        suffix: "",
        modifier: "?",
        pattern: "",
      },
    ],
    [
      ["/", ["/"]],
      ["/login", ["/login"]],
    ],
    [
      [undefined, ""],
      [{ "": "" }, "/login"],
    ],
  ],
  [
    "{/login}",
    undefined,
    [
      {
        name: "",
        prefix: "/login",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [
      ["/", null],
      ["/login", ["/login"]],
    ],
    [[{ "": "" }, "/login"]],
  ],
  [
    "{/(.*)}",
    undefined,
    [
      {
        name: 0,
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: ".*",
      },
    ],
    [
      ["/", ["/", ""]],
      ["/login", ["/login", "login"]],
    ],
    [[{ 0: "test" }, "/test"]],
  ],
  /**
   * Standalone modifiers.
   */
  [
    "/*",
    undefined,
    [
      {
        name: 0,
        prefix: "/",
        suffix: "",
        modifier: "*",
        pattern: "[^\\/]+?",
        separator: "/",
      },
    ],
    [
      ["/", ["/", undefined]],
      ["/route", ["/route", "route"]],
      ["/route/nested", ["/route/nested", "route/nested"]],
    ],
    [
      [{ 0: null }, ""],
      [{ 0: ["x"] }, "/x"],
      [{ 0: ["a", "b", "c"] }, "/a/b/c"],
    ],
  ],
  [
    "/+",
    undefined,
    [
      {
        name: 0,
        prefix: "/",
        suffix: "",
        modifier: "+",
        pattern: "[^\\/]+?",
        separator: "/",
      },
    ],
    [
      ["/", null],
      ["/x", ["/x", "x"]],
      ["/route", ["/route", "route"]],
      ["/a/b/c", ["/a/b/c", "a/b/c"]],
    ],
    [
      [{ 0: "" }, null],
      [{ 0: ["x"] }, "/x"],
      [{ 0: ["route"] }, "/route"],
      [{ 0: ["a", "b", "c"] }, "/a/b/c"],
    ],
  ],
  [
    "/?",
    undefined,
    [
      {
        name: 0,
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/", ["/", undefined]],
      ["/x", ["/x", "x"]],
      ["/route", ["/route", "route"]],
    ],
    [
      [{ 0: undefined }, ""],
      [{ 0: "x" }, "/x"],
    ],
  ],

  /**
   * Regexps.
   */
  [/.*/, undefined, [], [["/match/anything", ["/match/anything"]]], []],
  [
    /(.*)/,
    undefined,
    [
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [["/match/anything", ["/match/anything", "/match/anything"]]],
    [],
  ],
  [
    /\/(\d+)/,
    undefined,
    [
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [
      ["/abc", null],
      ["/123", ["/123", "123"]],
    ],
    [],
  ],

  /**
   * Mixed arrays.
   */
  [
    ["/test", /\/(\d+)/],
    undefined,
    [
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [["/test", ["/test", undefined]]],
    [],
  ],
  [
    ["/:test(\\d+)", /(.*)/],
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "\\d+",
      },
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [
      ["/123", ["/123", "123", undefined]],
      ["/abc", ["/abc", undefined, "/abc"]],
    ],
    [],
  ],

  /**
   * Correct names and indexes.
   */
  [
    ["/:test", "/route/:test"],
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/test", ["/test", "test", undefined]],
      ["/route/test", ["/route/test", undefined, "test"]],
    ],
    [],
  ],
  [
    [/^\/([^/]+)$/, /^\/route\/([^/]+)$/],
    undefined,
    [
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [
      ["/test", ["/test", "test", undefined]],
      ["/route/test", ["/route/test", undefined, "test"]],
    ],
    [],
  ],

  /**
   * Ignore non-matching groups in regexps.
   */
  [
    /(?:.*)/,
    undefined,
    [],
    [["/anything/you/want", ["/anything/you/want"]]],
    [],
  ],

  /**
   * Respect escaped characters.
   */
  [
    "/\\(testing\\)",
    undefined,
    ["/(testing)"],
    [
      ["/testing", null],
      ["/(testing)", ["/(testing)"]],
    ],
    [[undefined, "/(testing)"]],
  ],
  [
    "/.\\+\\*\\?\\{\\}=^\\!\\:$[]\\|",
    undefined,
    ["/.+*?{}=^!:$[]|"],
    [["/.+*?{}=^!:$[]|", ["/.+*?{}=^!:$[]|"]]],
    [[undefined, "/.+*?{}=^!:$[]|"]],
  ],
  [
    "/test\\/:uid(u\\d+)?:cid(c\\d+)?",
    undefined,
    [
      "/test/",
      {
        name: "uid",
        prefix: "",
        suffix: "",
        modifier: "?",
        pattern: "u\\d+",
      },
      {
        name: "cid",
        prefix: "",
        suffix: "",
        modifier: "?",
        pattern: "c\\d+",
      },
    ],
    [
      ["/test", null],
      ["/test/", ["/test/", undefined, undefined]],
      ["/test/u123", ["/test/u123", "u123", undefined]],
      ["/test/c123", ["/test/c123", undefined, "c123"]],
    ],
    [
      [{ uid: "u123" }, "/test/u123"],
      [{ cid: "c123" }, "/test/c123"],
      [{ cid: "u123" }, null],
    ],
  ],

  /**
   * Unnamed group prefix.
   */
  [
    "/{apple-}?icon-:res(\\d+).png",
    undefined,
    [
      "/",
      {
        name: "",
        prefix: "apple-",
        suffix: "",
        modifier: "?",
        pattern: "",
      },
      "icon-",
      {
        name: "res",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "\\d+",
      },
      ".png",
    ],
    [
      ["/icon-240.png", ["/icon-240.png", "240"]],
      ["/apple-icon-240.png", ["/apple-icon-240.png", "240"]],
    ],
    [[{ res: "240" }, "/icon-240.png"]],
  ],

  /**
   * Random examples.
   */
  [
    "/:foo/:bar",
    undefined,
    [
      {
        name: "foo",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      {
        name: "bar",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [["/match/route", ["/match/route", "match", "route"]]],
    [[{ foo: "a", bar: "b" }, "/a/b"]],
  ],
  [
    "/:foo\\(test\\)/bar",
    undefined,
    [
      {
        name: "foo",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      "(test)/bar",
    ],
    [
      ["/foo(test)/bar", ["/foo(test)/bar", "foo"]],
      ["/another/bar", null],
    ],
    [[{ foo: "foo" }, "/foo(test)/bar"]],
  ],
  [
    "/:remote([\\w-.]+)/:user([\\w-]+)",
    undefined,
    [
      {
        name: "remote",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[\\w-.]+",
      },
      {
        name: "user",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[\\w-]+",
      },
    ],
    [
      ["/endpoint/user", ["/endpoint/user", "endpoint", "user"]],
      ["/endpoint/user-name", ["/endpoint/user-name", "endpoint", "user-name"]],
      ["/foo.bar/user-name", ["/foo.bar/user-name", "foo.bar", "user-name"]],
    ],
    [
      [{ remote: "foo", user: "bar" }, "/foo/bar"],
      [{ remote: "foo.bar", user: "uno" }, "/foo.bar/uno"],
    ],
  ],
  [
    "/:foo\\?",
    undefined,
    [
      {
        name: "foo",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      "?",
    ],
    [["/route?", ["/route?", "route"]]],
    [[{ foo: "bar" }, "/bar?"]],
  ],
  [
    "/:foo+baz",
    undefined,
    [
      {
        name: "foo",
        prefix: "/",
        suffix: "",
        modifier: "+",
        pattern: "[^\\/]+?",
        separator: "/",
      },
      "baz",
    ],
    [
      ["/foobaz", ["/foobaz", "foo"]],
      ["/foo/barbaz", ["/foo/barbaz", "foo/bar"]],
      ["/baz", null],
    ],
    [
      [{ foo: [] }, null],
      [{ foo: ["foo"] }, "/foobaz"],
      [{ foo: ["foo", "bar"] }, "/foo/barbaz"],
    ],
  ],
  [
    "\\/:pre?baz",
    undefined,
    [
      "/",
      {
        name: "pre",
        prefix: "",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
      "baz",
    ],
    [
      ["/foobaz", ["/foobaz", "foo"]],
      ["/baz", ["/baz", undefined]],
    ],
    [
      [{}, "/baz"],
      [{ pre: "foo" }, "/foobaz"],
    ],
  ],
  [
    "/:foo\\(:bar?\\)",
    undefined,
    [
      {
        name: "foo",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      "(",
      {
        name: "bar",
        prefix: "",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
      ")",
    ],
    [
      ["/hello(world)", ["/hello(world)", "hello", "world"]],
      ["/hello()", ["/hello()", "hello", undefined]],
    ],
    [
      [{ foo: "hello", bar: "world" }, "/hello(world)"],
      [{ foo: "hello" }, "/hello()"],
    ],
  ],
  [
    "/:postType(video|audio|text)(\\+.+)?",
    undefined,
    [
      {
        name: "postType",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "video|audio|text",
      },
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "?",
        pattern: "\\+.+",
      },
    ],
    [
      ["/video", ["/video", "video", undefined]],
      ["/video+test", ["/video+test", "video", "+test"]],
      ["/video+", null],
    ],
    [
      [{ postType: "video" }, "/video"],
      [{ postType: "random" }, null],
    ],
  ],
  [
    "/:foo?/:bar?-ext",
    undefined,
    [
      {
        name: "foo",
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
      {
        name: "bar",
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
      "-ext",
    ],
    [
      ["/-ext", null],
      ["-ext", ["-ext", undefined, undefined]],
      ["/foo-ext", ["/foo-ext", "foo", undefined]],
      ["/foo/bar-ext", ["/foo/bar-ext", "foo", "bar"]],
      ["/foo/-ext", null],
    ],
    [
      [{}, "-ext"],
      [{ foo: "foo" }, "/foo-ext"],
      [{ bar: "bar" }, "/bar-ext"],
      [{ foo: "foo", bar: "bar" }, "/foo/bar-ext"],
    ],
  ],
  [
    "/:required/:optional?-ext",
    undefined,
    [
      {
        name: "required",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
      {
        name: "optional",
        prefix: "/",
        suffix: "",
        modifier: "?",
        pattern: "[^\\/]+?",
      },
      "-ext",
    ],
    [
      ["/foo-ext", ["/foo-ext", "foo", undefined]],
      ["/foo/bar-ext", ["/foo/bar-ext", "foo", "bar"]],
      ["/foo/-ext", null],
    ],
    [[{ required: "foo" }, "/foo-ext"]],
  ],

  /**
   * Unicode characters.
   */
  [
    "/:foo",
    undefined,
    [
      {
        name: "foo",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [["/café", ["/café", "café"]]],
    [
      [{ foo: "café" }, "/café", { encode: (x) => x }],
      [{ foo: "café" }, "/caf%C3%A9"],
    ],
  ],
  [
    "/café",
    undefined,
    ["/café"],
    [["/café", ["/café"]]],
    [[undefined, "/café"]],
  ],
  [
    "/café",
    { encodePath: encodeURI },
    ["/caf%C3%A9"],
    [["/caf%C3%A9", ["/caf%C3%A9"]]],
    [[undefined, "/caf%C3%A9"]],
  ],
  [
    "packages/",
    undefined,
    ["packages/"],
    [
      ["packages", null],
      ["packages/", ["packages/"]],
    ],
    [[undefined, "packages/"]],
  ],

  /**
   * Hostnames.
   */
  [
    ":domain.com",
    {
      delimiter: ".",
    },
    [
      {
        name: "domain",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "[^\\.]+?",
      },
      ".com",
    ],
    [
      ["example.com", ["example.com", "example"]],
      ["github.com", ["github.com", "github"]],
    ],
    [
      [{ domain: "example" }, "example.com"],
      [{ domain: "github" }, "github.com"],
    ],
  ],
  [
    "mail.:domain.com",
    {
      delimiter: ".",
    },
    [
      "mail",
      {
        name: "domain",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "[^\\.]+?",
      },
      ".com",
    ],
    [
      ["mail.example.com", ["mail.example.com", "example"]],
      ["mail.github.com", ["mail.github.com", "github"]],
    ],
    [
      [{ domain: "example" }, "mail.example.com"],
      [{ domain: "github" }, "mail.github.com"],
    ],
  ],
  [
    "example.:ext",
    {},
    [
      "example",
      {
        name: "ext",
        prefix: ".",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["example.com", ["example.com", "com"]],
      ["example.org", ["example.org", "org"]],
    ],
    [
      [{ ext: "com" }, "example.com"],
      [{ ext: "org" }, "example.org"],
    ],
  ],
  [
    "this is",
    {
      delimiter: " ",
      end: false,
    },
    ["this is"],
    [
      ["this is a test", ["this is"]],
      ["this isn't", null],
    ],
    [[undefined, "this is"]],
  ],

  /**
   * Custom prefixes.
   */
  [
    "{$:foo}{$:bar}?",
    {},
    [
      {
        name: "foo",
        pattern: "[^\\/]+?",
        prefix: "$",
        suffix: "",
        modifier: "",
      },
      {
        name: "bar",
        pattern: "[^\\/]+?",
        prefix: "$",
        suffix: "",
        modifier: "?",
      },
    ],
    [
      ["$x", ["$x", "x", undefined]],
      ["$x$y", ["$x$y", "x", "y"]],
    ],
    [
      [{ foo: "foo" }, "$foo"],
      [{ foo: "foo", bar: "bar" }, "$foo$bar"],
    ],
  ],
  [
    "name/:attr1?{-:attr2}?{-:attr3}?",
    {},
    [
      "name",
      {
        name: "attr1",
        pattern: "[^\\/]+?",
        prefix: "/",
        suffix: "",
        modifier: "?",
      },
      {
        name: "attr2",
        pattern: "[^\\/]+?",
        prefix: "-",
        suffix: "",
        modifier: "?",
      },
      {
        name: "attr3",
        pattern: "[^\\/]+?",
        prefix: "-",
        suffix: "",
        modifier: "?",
      },
    ],
    [
      ["name/test", ["name/test", "test", undefined, undefined]],
      ["name/1", ["name/1", "1", undefined, undefined]],
      ["name/1-2", ["name/1-2", "1", "2", undefined]],
      ["name/1-2-3", ["name/1-2-3", "1", "2", "3"]],
      ["name/foo-bar/route", null],
      ["name/test/route", null],
    ],
    [
      [{}, "name"],
      [{ attr1: "test" }, "name/test"],
      [{ attr2: "attr" }, "name-attr"],
    ],
  ],

  /**
   * Case-sensitive compile tokensToFunction params.
   */
  [
    "/:test(abc)",
    {
      sensitive: true,
    },
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "abc",
      },
    ],
    [
      ["/abc", ["/abc", "abc"]],
      ["/ABC", null],
    ],
    [
      [{ test: "abc" }, "/abc"],
      [{ test: "ABC" }, null],
    ],
  ],
  [
    "/:test(abc)",
    {},
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "abc",
      },
    ],
    [
      ["/abc", ["/abc", "abc"]],
      ["/ABC", ["/ABC", "ABC"]],
    ],
    [
      [{ test: "abc" }, "/abc"],
      [{ test: "ABC" }, "/ABC"],
    ],
  ],

  /**
   * Nested parentheses.
   */
  [
    "/:test(\\d+(?:\\.\\d+)?)",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "\\d+(?:\\.\\d+)?",
      },
    ],
    [
      ["/123", ["/123", "123"]],
      ["/abc", null],
      ["/123/abc", null],
      ["/123.123", ["/123.123", "123.123"]],
      ["/123.abc", null],
    ],
    [
      [{ test: "abc" }, null],
      [{ test: "123" }, "/123"],
      [{ test: "123.123" }, "/123.123"],
      [{ test: "123.abc" }, null],
    ],
  ],
  [
    "/:test((?!login)[^/]+)",
    undefined,
    [
      {
        name: "test",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "(?!login)[^/]+",
      },
    ],
    [
      ["/route", ["/route", "route"]],
      ["/login", null],
    ],
    [
      [{ test: "route" }, "/route"],
      [{ test: "login" }, null],
    ],
  ],

  /**
   * https://github.com/pillarjs/path-to-regexp/issues/206
   */
  [
    "/user(s)?/:user",
    undefined,
    [
      "/user",
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "?",
        pattern: "s",
      },
      {
        name: "user",
        prefix: "/",
        suffix: "",
        modifier: "",
        pattern: "[^\\/]+?",
      },
    ],
    [
      ["/user/123", ["/user/123", undefined, "123"]],
      ["/users/123", ["/users/123", "s", "123"]],
    ],
    [[{ user: "123" }, "/user/123"]],
  ],

  /**
   * https://github.com/pillarjs/path-to-regexp/issues/260
   */
  [
    ":name*",
    undefined,
    [
      {
        name: "name",
        prefix: "",
        suffix: "",
        modifier: "*",
        pattern: "[^\\/]+?",
        separator: "/",
      },
    ],
    [
      ["foobar", ["foobar", "foobar"]],
      ["foo/bar", ["foo/bar", "foo/bar"]],
    ],
    [
      [{ name: ["foobar"] }, "foobar"],
      [{ name: ["foo", "bar"] }, "foo/bar"],
    ],
  ],
  [
    ":name+",
    undefined,
    [
      {
        name: "name",
        prefix: "",
        suffix: "",
        modifier: "+",
        pattern: "[^\\/]+?",
        separator: "/",
      },
    ],
    [["foobar", ["foobar", "foobar"]]],
    [[{ name: ["foobar"] }, "foobar"]],
  ],

  /**
   * Named capturing groups (available from 1812 version 10)
   */
  [
    /\/(?<groupname>.+)/,
    undefined,
    [
      {
        name: "groupname",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [
      ["/", null],
      ["/foo", ["/foo", "foo"]],
    ],
    [],
  ],
  [
    /\/(?<test>.*).(?<format>html|json)/,
    undefined,
    [
      {
        name: "test",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
      {
        name: "format",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [
      ["/route", null],
      ["/route.txt", null],
      ["/route.html", ["/route.html", "route", "html"]],
      ["/route.json", ["/route.json", "route", "json"]],
    ],
    [],
  ],
  [
    /\/(.+)\/(?<groupname>.+)\/(.+)/,
    undefined,
    [
      {
        name: 0,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
      {
        name: "groupname",
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
      {
        name: 1,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: "",
      },
    ],
    [
      ["/test", null],
      ["/test/testData", null],
      [
        "/test/testData/extraStuff",
        ["/test/testData/extraStuff", "test", "testData", "extraStuff"],
      ],
    ],
    [],
  ],
];

/**
 * Dynamically generate the entire test suite.
 */
describe("path-to-regexp", () => {
  describe("arguments", () => {
    it("should work without different call combinations", () => {
      pathToRegexp.pathToRegexp("/test");
      pathToRegexp.pathToRegexp("/test", []);
      pathToRegexp.pathToRegexp("/test", undefined, {});

      pathToRegexp.pathToRegexp(/^\/test/);
      pathToRegexp.pathToRegexp(/^\/test/, []);
      pathToRegexp.pathToRegexp(/^\/test/, undefined, {});

      pathToRegexp.pathToRegexp(["/a", "/b"]);
      pathToRegexp.pathToRegexp(["/a", "/b"], []);
      pathToRegexp.pathToRegexp(["/a", "/b"], undefined, {});
    });

    it("should accept an array of keys as the second argument", () => {
      const keys: pathToRegexp.Key[] = [];
      const re = pathToRegexp.pathToRegexp("/user/:id", keys, { end: false });

      const expectedKeys = [
        {
          name: "id",
          prefix: "/",
          suffix: "",
          modifier: "",
          pattern: "[^\\/]+?",
        },
      ];

      expect(keys).toEqual(expectedKeys);
      expect(exec(re, "/user/123/show")).toEqual(["/user/123", "123"]);
    });

    it("should throw on non-capturing pattern", () => {
      expect(() => {
        pathToRegexp.pathToRegexp("/:foo(?:\\d+(\\.\\d+)?)");
      }).toThrow(new TypeError('Pattern cannot start with "?" at 6'));
    });

    it("should throw on nested capturing group", () => {
      expect(() => {
        pathToRegexp.pathToRegexp("/:foo(\\d+(\\.\\d+)?)");
      }).toThrow(new TypeError("Capturing groups are not allowed at 9"));
    });

    it("should throw on unbalanced pattern", () => {
      expect(() => {
        pathToRegexp.pathToRegexp("/:foo(abc");
      }).toThrow(new TypeError("Unbalanced pattern at 5"));
    });

    it("should throw on missing pattern", () => {
      expect(() => {
        pathToRegexp.pathToRegexp("/:foo()");
      }).toThrow(new TypeError("Missing pattern at 5"));
    });

    it("should throw on missing name", () => {
      expect(() => {
        pathToRegexp.pathToRegexp("/:(test)");
      }).toThrow(new TypeError("Missing parameter name at 1"));
    });

    it("should throw on nested groups", () => {
      expect(() => {
        pathToRegexp.pathToRegexp("/{a{b:foo}}");
      }).toThrow(new TypeError("Unexpected OPEN at 3, expected CLOSE"));
    });
  });

  describe("rules", () => {
    TESTS.forEach(([path, opts, tokens, matchCases, compileCases]) => {
      describe(util.inspect(path), () => {
        const keys: pathToRegexp.Key[] = [];
        const re = pathToRegexp.pathToRegexp(path, keys, opts);

        // Parsing and compiling is only supported with string input.
        if (typeof path === "string") {
          it("should parse", () => {
            expect(pathToRegexp.parse(path, opts).tokens).toEqual(tokens);
          });

          describe("compile", () => {
            compileCases.forEach(([params, result, options]) => {
              const toPath = pathToRegexp.compile(path, {
                ...opts,
                ...options,
              });

              if (result !== null) {
                it("should compile using " + util.inspect(params), () => {
                  expect(toPath(params)).toEqual(result);
                });
              } else {
                it("should not compile using " + util.inspect(params), () => {
                  expect(() => {
                    toPath(params);
                  }).toThrow(TypeError);
                });
              }
            });
          });
        } else {
          it("should parse keys", () => {
            expect(keys).toEqual(
              tokens.filter((token) => typeof token !== "string"),
            );
          });
        }

        describe("match" + (opts ? " using " + util.inspect(opts) : ""), () => {
          matchCases.forEach(([pathname, matches, params]) => {
            const message = `should ${
              matches ? "" : "not "
            }match ${util.inspect(pathname)}`;

            it(message, () => {
              expect(exec(re, pathname)).toEqual(matches);
            });

            if (typeof path === "string" && params !== undefined) {
              const match = pathToRegexp.match(path, opts);

              it(message + " params", () => {
                expect(match(pathname)).toEqual(params);
              });
            }
          });
        });
      });
    });
  });

  describe("compile errors", () => {
    it("should throw when a required param is undefined", () => {
      const toPath = pathToRegexp.compile("/a/:b/c");

      expect(() => {
        toPath();
      }).toThrow(new TypeError('Expected "b" to be a string'));
    });

    it("should throw when it does not match the pattern", () => {
      const toPath = pathToRegexp.compile("/:foo(\\d+)");

      expect(() => {
        toPath({ foo: "abc" });
      }).toThrow(new TypeError('Invalid value for "foo": "/abc"'));
    });

    it("should throw when expecting a repeated value", () => {
      const toPath = pathToRegexp.compile("/:foo+");

      expect(() => {
        toPath({ foo: [] });
      }).toThrow(new TypeError('Invalid value for "foo": ""'));
    });

    it("should throw when not expecting a repeated value", () => {
      const toPath = pathToRegexp.compile("/:foo");

      expect(() => {
        toPath({ foo: [] });
      }).toThrow(new TypeError('Expected "foo" to be a string'));
    });

    it("should throw when a repeated param is not an array", () => {
      const toPath = pathToRegexp.compile("/:foo+");

      expect(() => {
        toPath({ foo: "a" });
      }).toThrow(new TypeError('Expected "foo" to be an array'));
    });

    it("should throw when an array value is not a string", () => {
      const toPath = pathToRegexp.compile("/:foo+");

      expect(() => {
        toPath({ foo: [1, "a"] });
      }).toThrow(new TypeError('Expected "foo/0" to be a string'));
    });

    it("should throw when repeated value does not match", () => {
      const toPath = pathToRegexp.compile("/:foo(\\d+)+");

      expect(() => {
        toPath({ foo: ["1", "2", "3", "a"] });
      }).toThrow(new TypeError('Invalid value for "foo": "/1/2/3/a"'));
    });
  });
});

/**
 * Execute a regular expression and return a flat array for comparison.
 *
 * @param  {RegExp} re
 * @param  {String} str
 * @return {Array}
 */
function exec(re: RegExp, str: string) {
  const match = re.exec(str);

  return match && Array.prototype.slice.call(match);
}
