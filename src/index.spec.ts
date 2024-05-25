import { describe, it, expect } from "vitest";
import * as pathToRegexp from "./index";

interface ParserTestSet {
  path: string;
  options?: pathToRegexp.ParseOptions;
  expected: pathToRegexp.Token[];
}

interface CompileTestSet {
  path: string;
  options?: pathToRegexp.CompileOptions;
  tests: Array<{
    input: pathToRegexp.ParamData | undefined;
    expected: string | null;
  }>;
}

interface MatchTestSet {
  path: pathToRegexp.Path;
  options?: pathToRegexp.MatchOptions;
  tests: Array<{
    input: string;
    matches: (string | undefined)[] | null;
    expected: pathToRegexp.Match<any>;
  }>;
}

const PARSER_TESTS: ParserTestSet[] = [
  {
    path: "/",
    expected: ["/"],
  },
];

const COMPILE_TESTS: CompileTestSet[] = [
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
    path: "/:test",
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: null }, // Requires encoding.
    ],
  },
  {
    path: "/:test",
    options: { validate: false },
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
    path: "/:test?",
    tests: [
      { input: undefined, expected: "" },
      { input: {}, expected: "" },
      { input: { test: undefined }, expected: "" },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: null }, // Requires encoding.
    ],
  },
  {
    path: "/:test(.*)",
    tests: [
      { input: undefined, expected: null },
      { input: {}, expected: null },
      { input: { test: "" }, expected: "/" },
      { input: { test: "123" }, expected: "/123" },
      { input: { test: "123/xyz" }, expected: "/123/xyz" },
    ],
  },
];

/**
 * An array of test cases with expected inputs and outputs.
 */
const MATCH_TESTS: MatchTestSet[] = [
  /**
   * Simple paths.
   */
  {
    path: "/",
    tests: [
      {
        input: "/",
        matches: ["/"],
        expected: { path: "/", index: 0, params: {} },
      },
      { input: "/route", matches: null, expected: false },
    ],
  },
  {
    path: "/test",
    tests: [
      {
        input: "/test",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      { input: "/route", matches: null, expected: false },
      { input: "/test/route", matches: null, expected: false },
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
    ],
  },
  {
    path: "/test/",
    tests: [
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      { input: "/route", matches: null, expected: false },
      { input: "/test", matches: null, expected: false },
      {
        input: "/test//",
        matches: ["/test//"],
        expected: { path: "/test//", index: 0, params: {} },
      },
    ],
  },
  {
    path: "/:test",
    tests: [
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route.json",
        matches: ["/route.json", "route.json"],
        expected: {
          path: "/route.json",
          index: 0,
          params: { test: "route.json" },
        },
      },
      {
        input: "/route.json/",
        matches: ["/route.json/", "route.json"],
        expected: {
          path: "/route.json/",
          index: 0,
          params: { test: "route.json" },
        },
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "///route",
        matches: ["///route", "route"],
        expected: { path: "///route", index: 0, params: { test: "route" } },
      },
      {
        input: "/caf%C3%A9",
        matches: ["/caf%C3%A9", "caf%C3%A9"],
        expected: {
          path: "/caf%C3%A9",
          index: 0,
          params: { test: "caf%C3%A9" },
        },
      },
      {
        input: "/;,:@&=+$-_.!~*()",
        matches: ["/;,:@&=+$-_.!~*()", ";,:@&=+$-_.!~*()"],
        expected: {
          path: "/;,:@&=+$-_.!~*()",
          index: 0,
          params: { test: ";,:@&=+$-_.!~*()" },
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
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      { input: "/TEST", matches: null, expected: false },
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
        matches: ["/TEST"],
        expected: { path: "/TEST", index: 0, params: {} },
      },
      { input: "/test", matches: null, expected: false },
    ],
  },

  /**
   * Non-trailing mode.
   */
  {
    path: "/test",
    options: {
      trailing: false,
    },
    tests: [
      {
        input: "/test",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      {
        input: "/test/",
        matches: null,
        expected: false,
      },
      {
        input: "/test/route",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/test/",
    options: {
      trailing: false,
    },
    tests: [
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      {
        input: "/test",
        matches: null,
        expected: false,
      },
      {
        input: "/test//",
        matches: ["/test//"],
        expected: { path: "/test//", index: 0, params: {} },
      },
    ],
  },
  {
    path: "/:test",
    options: {
      trailing: false,
    },
    tests: [
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/",
        matches: null,
        expected: false,
      },
      {
        input: "///route",
        matches: ["///route", "route"],
        expected: { path: "///route", index: 0, params: { test: "route" } },
      },
    ],
  },
  {
    path: "/:test/",
    options: {
      trailing: false,
    },
    tests: [
      {
        input: "/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/",
        matches: null,
        expected: false,
      },
      {
        input: "/route//",
        matches: ["/route//", "route"],
        expected: { path: "/route//", index: 0, params: { test: "route" } },
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
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      {
        input: "/test////",
        matches: ["/test////"],
        expected: { path: "/test////", index: 0, params: {} },
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "/test/route",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      {
        input: "/route",
        matches: null,
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
        matches: null,
        expected: false,
      },
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      {
        input: "/test//",
        matches: ["/test//"],
        expected: { path: "/test//", index: 0, params: {} },
      },
      {
        input: "/test/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/deep",
        matches: null,
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
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route.json",
        matches: ["/route.json", "route.json"],
        expected: {
          path: "/route.json",
          index: 0,
          params: { test: "route.json" },
        },
      },
      {
        input: "/route.json/",
        matches: ["/route.json/", "route.json"],
        expected: {
          path: "/route.json/",
          index: 0,
          params: { test: "route.json" },
        },
      },
      {
        input: "/route/test",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route.json/test",
        matches: ["/route.json", "route.json"],
        expected: {
          path: "/route.json",
          index: 0,
          params: { test: "route.json" },
        },
      },
      {
        input: "///route///test",
        matches: ["///route//", "route"],
        expected: { path: "///route//", index: 0, params: { test: "route" } },
      },
      {
        input: "/caf%C3%A9",
        matches: ["/caf%C3%A9", "caf%C3%A9"],
        expected: {
          path: "/caf%C3%A9",
          index: 0,
          params: { test: "caf%C3%A9" },
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
        matches: null,
        expected: false,
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/",
        matches: null,
        expected: false,
      },
      {
        input: "/route//test",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
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
        matches: [""],
        expected: { path: "", index: 0, params: {} },
      },
      {
        input: "/",
        matches: ["/"],
        expected: { path: "/", index: 0, params: {} },
      },
      {
        input: "route",
        matches: null,
        expected: false,
      },
      {
        input: "/route",
        matches: [""],
        expected: { path: "", index: 0, params: {} },
      },
      {
        input: "/route/",
        matches: [""],
        expected: { path: "", index: 0, params: {} },
      },
    ],
  },

  /**
   * Non-starting mode.
   */
  {
    path: "/test",
    options: {
      start: false,
    },
    tests: [
      {
        input: "/test",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      {
        input: "/route/test",
        matches: ["/test"],
        expected: { path: "/test", index: 6, params: {} },
      },
      {
        input: "/route/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 6, params: {} },
      },
      {
        input: "/test/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/deep",
        matches: null,
        expected: false,
      },
      {
        input: "/route",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/test/",
    options: {
      start: false,
    },
    tests: [
      {
        input: "/test",
        matches: null,
        expected: false,
      },
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      {
        input: "/test//",
        matches: ["/test//"],
        expected: { path: "/test//", index: 0, params: {} },
      },
      {
        input: "/test/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 6, params: {} },
      },
      {
        input: "/route/test//",
        matches: ["/test//"],
        expected: { path: "/test//", index: 6, params: {} },
      },
      {
        input: "/route/test/deep",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:test",
    options: {
      start: false,
    },
    tests: [
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test",
        matches: ["/test", "test"],
        expected: { path: "/test", index: 6, params: { test: "test" } },
      },
      {
        input: "/route/test/",
        matches: ["/test/", "test"],
        expected: { path: "/test/", index: 6, params: { test: "test" } },
      },
    ],
  },
  {
    path: "/:test/",
    options: {
      start: false,
    },
    tests: [
      {
        input: "/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/",
        matches: ["/test/", "test"],
        expected: { path: "/test/", index: 6, params: { test: "test" } },
      },
      {
        input: "/route/test//",
        matches: ["/test//", "test"],
        expected: { path: "/test//", index: 6, params: { test: "test" } },
      },
    ],
  },
  {
    path: "",
    options: {
      start: false,
    },
    tests: [
      {
        input: "",
        matches: [""],
        expected: { path: "", index: 0, params: {} },
      },
      {
        input: "/",
        matches: ["/"],
        expected: { path: "/", index: 0, params: {} },
      },
      {
        input: "route",
        matches: [""],
        expected: { path: "", index: 5, params: {} },
      },
      {
        input: "/route",
        matches: [""],
        expected: { path: "", index: 6, params: {} },
      },
      {
        input: "/route/",
        matches: ["/"],
        expected: { path: "/", index: 6, params: {} },
      },
    ],
  },

  /**
   * Non-ending and non-trailing modes.
   */
  {
    path: "/test",
    options: {
      end: false,
      trailing: false,
    },
    tests: [
      {
        input: "/test",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      {
        input: "/test",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      {
        input: "/test/route",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
    ],
  },
  {
    path: "/test/",
    options: {
      end: false,
      trailing: false,
    },
    tests: [
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      {
        input: "/test",
        matches: null,
        expected: false,
      },
      {
        input: "/test//",
        matches: ["/test//"],
        expected: { path: "/test//", index: 0, params: {} },
      },
      {
        input: "/test/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/deep",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:test",
    options: {
      end: false,
      trailing: false,
    },
    tests: [
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test/",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
    ],
  },
  {
    path: "/:test/",
    options: {
      end: false,
      trailing: false,
    },
    tests: [
      {
        input: "/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test//",
        matches: null,
        expected: false,
      },
      {
        input: "/route//test",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
    ],
  },

  /**
   * Non-starting and non-ending modes.
   */
  {
    path: "/test",
    options: {
      start: false,
      end: false,
    },
    tests: [
      {
        input: "/test",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      {
        input: "/test/route",
        matches: ["/test"],
        expected: { path: "/test", index: 0, params: {} },
      },
      {
        input: "/route/test",
        matches: ["/test"],
        expected: { path: "/test", index: 6, params: {} },
      },
    ],
  },
  {
    path: "/test/",
    options: {
      start: false,
      end: false,
    },
    tests: [
      {
        input: "/test/",
        matches: ["/test/"],
        expected: { path: "/test/", index: 0, params: {} },
      },
      {
        input: "/test",
        matches: null,
        expected: false,
      },
      {
        input: "/test//",
        matches: ["/test//"],
        expected: { path: "/test//", index: 0, params: {} },
      },
      {
        input: "/test/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/deep",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test//deep",
        matches: ["/test/"],
        expected: { path: "/test/", index: 6, params: {} },
      },
    ],
  },
  {
    path: "/:test",
    options: {
      start: false,
      end: false,
    },
    tests: [
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test/",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
    ],
  },
  {
    path: "/:test/",
    options: {
      start: false,
      end: false,
    },
    tests: [
      {
        input: "/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/test",
        matches: null,
        expected: false,
      },
      {
        input: "/route/test/",
        matches: ["/test/", "test"],
        expected: { path: "/test/", index: 6, params: { test: "test" } },
      },
      {
        input: "/route/test//",
        matches: ["/test//", "test"],
        expected: { path: "/test//", index: 6, params: { test: "test" } },
      },
    ],
  },

  /**
   * Arrays of simple paths.
   */
  {
    path: ["/one", "/two"],
    tests: [
      {
        input: "/one",
        matches: ["/one"],
        expected: { path: "/one", index: 0, params: {} },
      },
      {
        input: "/two",
        matches: ["/two"],
        expected: { path: "/two", index: 0, params: {} },
      },
      {
        input: "/three",
        matches: null,
        expected: false,
      },
      {
        input: "/one/two",
        matches: null,
        expected: false,
      },
    ],
  },

  /**
   * Optional.
   */
  {
    path: "/:test?",
    tests: [
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "///route",
        matches: ["///route", "route"],
        expected: { path: "///route", index: 0, params: { test: "route" } },
      },
      {
        input: "///route///",
        matches: ["///route///", "route"],
        expected: { path: "///route///", index: 0, params: { test: "route" } },
      },
      {
        input: "/",
        matches: ["/", undefined],
        expected: { path: "/", index: 0, params: {} },
      },
      {
        input: "///",
        matches: ["///", undefined],
        expected: { path: "///", index: 0, params: {} },
      },
    ],
  },
  {
    path: "/:test?",
    options: {
      trailing: false,
    },
    tests: [
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/",
        matches: null,
        expected: false,
      },
      { input: "/", matches: null, expected: false },
      { input: "///", matches: null, expected: false },
    ],
  },
  {
    path: "/:test?/bar",
    tests: [
      {
        input: "/bar",
        matches: ["/bar", undefined],
        expected: { path: "/bar", index: 0, params: {} },
      },
      {
        input: "/foo/bar",
        matches: ["/foo/bar", "foo"],
        expected: { path: "/foo/bar", index: 0, params: { test: "foo" } },
      },
      {
        input: "///foo///bar",
        matches: ["///foo///bar", "foo"],
        expected: { path: "///foo///bar", index: 0, params: { test: "foo" } },
      },
      {
        input: "/foo/bar/",
        matches: ["/foo/bar/", "foo"],
        expected: { path: "/foo/bar/", index: 0, params: { test: "foo" } },
      },
    ],
  },
  {
    path: "/:test?-bar",
    tests: [
      {
        input: "-bar",
        matches: ["-bar", undefined],
        expected: { path: "-bar", index: 0, params: {} },
      },
      {
        input: "/foo-bar",
        matches: ["/foo-bar", "foo"],
        expected: { path: "/foo-bar", index: 0, params: { test: "foo" } },
      },
      {
        input: "/foo-bar/",
        matches: ["/foo-bar/", "foo"],
        expected: { path: "/foo-bar/", index: 0, params: { test: "foo" } },
      },
    ],
  },

  /**
   * Zero or more times.
   */
  {
    path: "/:test*",
    tests: [
      {
        input: "/",
        matches: ["/", undefined],
        expected: { path: "/", index: 0, params: {} },
      },
      {
        input: "//",
        matches: ["//", undefined],
        expected: { path: "//", index: 0, params: {} },
      },
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: ["route"] } },
      },
      {
        input: "/some/basic/route",
        matches: ["/some/basic/route", "some/basic/route"],
        expected: {
          path: "/some/basic/route",
          index: 0,
          params: { test: ["some", "basic", "route"] },
        },
      },
      {
        input: "///some///basic///route",
        matches: ["///some///basic///route", "some///basic///route"],
        expected: {
          path: "///some///basic///route",
          index: 0,
          params: { test: ["some", "basic", "route"] },
        },
      },
    ],
  },
  {
    path: "/:test*-bar",
    tests: [
      {
        input: "-bar",
        matches: ["-bar", undefined],
        expected: { path: "-bar", index: 0, params: {} },
      },
      {
        input: "/-bar",
        matches: null,
        expected: false,
      },
      {
        input: "/foo-bar",
        matches: ["/foo-bar", "foo"],
        expected: { path: "/foo-bar", index: 0, params: { test: ["foo"] } },
      },
      {
        input: "/foo/baz-bar",
        matches: ["/foo/baz-bar", "foo/baz"],
        expected: {
          path: "/foo/baz-bar",
          index: 0,
          params: { test: ["foo", "baz"] },
        },
      },
    ],
  },

  /**
   * One or more times.
   */
  {
    path: "/:test+",
    tests: [
      {
        input: "/",
        matches: null,
        expected: false,
      },
      {
        input: "//",
        matches: null,
        expected: false,
      },
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: ["route"] } },
      },
      {
        input: "/some/basic/route",
        matches: ["/some/basic/route", "some/basic/route"],
        expected: {
          path: "/some/basic/route",
          index: 0,
          params: { test: ["some", "basic", "route"] },
        },
      },
      {
        input: "///some///basic///route",
        matches: ["///some///basic///route", "some///basic///route"],
        expected: {
          path: "///some///basic///route",
          index: 0,
          params: { test: ["some", "basic", "route"] },
        },
      },
    ],
  },
  {
    path: "/:test+-bar",
    tests: [
      {
        input: "-bar",
        matches: null,
        expected: false,
      },
      {
        input: "/-bar",
        matches: null,
        expected: false,
      },
      {
        input: "/foo-bar",
        matches: ["/foo-bar", "foo"],
        expected: { path: "/foo-bar", index: 0, params: { test: ["foo"] } },
      },
      {
        input: "/foo/baz-bar",
        matches: ["/foo/baz-bar", "foo/baz"],
        expected: {
          path: "/foo/baz-bar",
          index: 0,
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
        matches: ["/123", "123"],
        expected: { path: "/123", index: 0, params: { test: "123" } },
      },
      {
        input: "/abc",
        matches: null,
        expected: false,
      },
      {
        input: "/123/abc",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: String.raw`/:test(\d+)-bar`,
    tests: [
      {
        input: "-bar",
        matches: null,
        expected: false,
      },
      {
        input: "/-bar",
        matches: null,
        expected: false,
      },
      {
        input: "/abc-bar",
        matches: null,
        expected: false,
      },
      {
        input: "/123-bar",
        matches: ["/123-bar", "123"],
        expected: { path: "/123-bar", index: 0, params: { test: "123" } },
      },
      {
        input: "/123/456-bar",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: String.raw`/:test(.*)`,
    tests: [
      {
        input: "/",
        matches: ["/", ""],
        expected: { path: "/", index: 0, params: { test: "" } },
      },
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route/123",
        matches: ["/route/123", "route/123"],
        expected: {
          path: "/route/123",
          index: 0,
          params: { test: "route/123" },
        },
      },
      {
        input: "/;,:@&=/+$-_.!/~*()",
        matches: ["/;,:@&=/+$-_.!/~*()", ";,:@&=/+$-_.!/~*()"],
        expected: {
          path: "/;,:@&=/+$-_.!/~*()",
          index: 0,
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
        matches: ["/abc", "abc"],
        expected: { path: "/abc", index: 0, params: { test: "abc" } },
      },
      {
        input: "/123",
        matches: null,
        expected: false,
      },
      {
        input: "/abc/123",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:test(this|that)",
    tests: [
      {
        input: "/this",
        matches: ["/this", "this"],
        expected: { path: "/this", index: 0, params: { test: "this" } },
      },
      {
        input: "/that",
        matches: ["/that", "that"],
        expected: { path: "/that", index: 0, params: { test: "that" } },
      },
      {
        input: "/foo",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:test(abc|xyz)*",
    tests: [
      {
        input: "/",
        matches: ["/", undefined],
        expected: { path: "/", index: 0, params: { test: undefined } },
      },
      {
        input: "/abc",
        matches: ["/abc", "abc"],
        expected: { path: "/abc", index: 0, params: { test: ["abc"] } },
      },
      {
        input: "/abc/abc",
        matches: ["/abc/abc", "abc/abc"],
        expected: {
          path: "/abc/abc",
          index: 0,
          params: { test: ["abc", "abc"] },
        },
      },
      {
        input: "/xyz/xyz",
        matches: ["/xyz/xyz", "xyz/xyz"],
        expected: {
          path: "/xyz/xyz",
          index: 0,
          params: { test: ["xyz", "xyz"] },
        },
      },
      {
        input: "/abc/xyz",
        matches: ["/abc/xyz", "abc/xyz"],
        expected: {
          path: "/abc/xyz",
          index: 0,
          params: { test: ["abc", "xyz"] },
        },
      },
      {
        input: "/abc/xyz/abc/xyz",
        matches: ["/abc/xyz/abc/xyz", "abc/xyz/abc/xyz"],
        expected: {
          path: "/abc/xyz/abc/xyz",
          index: 0,
          params: { test: ["abc", "xyz", "abc", "xyz"] },
        },
      },
      {
        input: "/xyzxyz",
        matches: null,
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
        matches: ["test"],
        expected: { path: "test", index: 0, params: {} },
      },
      {
        input: "/test",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: ":test",
    tests: [
      {
        input: "route",
        matches: ["route", "route"],
        expected: { path: "route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route",
        matches: null,
        expected: false,
      },
      {
        input: "route/",
        matches: ["route/", "route"],
        expected: { path: "route/", index: 0, params: { test: "route" } },
      },
    ],
  },
  {
    path: ":test?",
    tests: [
      {
        input: "test",
        matches: ["test", "test"],
        expected: { path: "test", index: 0, params: { test: "test" } },
      },
      {
        input: "",
        matches: ["", undefined],
        expected: { path: "", index: 0, params: {} },
      },
    ],
  },
  {
    path: ":test*",
    tests: [
      {
        input: "test",
        matches: ["test", "test"],
        expected: { path: "test", index: 0, params: { test: ["test"] } },
      },
      {
        input: "test/test",
        matches: ["test/test", "test/test"],
        expected: {
          path: "test/test",
          index: 0,
          params: { test: ["test", "test"] },
        },
      },
      {
        input: "",
        matches: ["", undefined],
        expected: { path: "", index: 0, params: { test: undefined } },
      },
    ],
  },
  {
    path: ":test+",
    tests: [
      {
        input: "test",
        matches: ["test", "test"],
        expected: { path: "test", index: 0, params: { test: ["test"] } },
      },
      {
        input: "test/test",
        matches: ["test/test", "test/test"],
        expected: {
          path: "test/test",
          index: 0,
          params: { test: ["test", "test"] },
        },
      },
      {
        input: "",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "{:test/}+",
    tests: [
      {
        input: "route/",
        matches: ["route/", "route"],
        expected: { path: "route/", index: 0, params: { test: ["route"] } },
      },
      {
        input: "/route",
        matches: null,
        expected: false,
      },
      {
        input: "",
        matches: null,
        expected: false,
      },
      {
        input: "foo/bar/",
        matches: ["foo/bar/", "foo/bar"],
        expected: {
          path: "foo/bar/",
          index: 0,
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
        matches: ["/test.json"],
        expected: { path: "/test.json", index: 0, params: {} },
      },
      {
        input: "/test",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:test.json",
    tests: [
      {
        input: "/.json",
        matches: null,
        expected: false,
      },
      {
        input: "/test.json",
        matches: ["/test.json", "test"],
        expected: { path: "/test.json", index: 0, params: { test: "test" } },
      },
      {
        input: "/route.json",
        matches: ["/route.json", "route"],
        expected: { path: "/route.json", index: 0, params: { test: "route" } },
      },
      {
        input: "/route.json.json",
        matches: ["/route.json.json", "route.json"],
        expected: {
          path: "/route.json.json",
          index: 0,
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
        matches: ["/test.html", "html"],
        expected: { path: "/test.html", index: 0, params: { format: "html" } },
      },
      {
        input: "/test",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/test.:format(\\w+).:format(\\w+)",
    tests: [
      {
        input: "/test.html.json",
        matches: ["/test.html.json", "html", "json"],
        expected: {
          path: "/test.html.json",
          index: 0,
          params: { format: "json" },
        },
      },
      {
        input: "/test.html",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/test.:format(\\w+)?",
    tests: [
      {
        input: "/test",
        matches: ["/test", undefined],
        expected: { path: "/test", index: 0, params: { format: undefined } },
      },
      {
        input: "/test.html",
        matches: ["/test.html", "html"],
        expected: { path: "/test.html", index: 0, params: { format: "html" } },
      },
    ],
  },
  {
    path: "/test.:format(\\w+)+",
    tests: [
      {
        input: "/test",
        matches: null,
        expected: false,
      },
      {
        input: "/test.html",
        matches: ["/test.html", "html"],
        expected: {
          path: "/test.html",
          index: 0,
          params: { format: ["html"] },
        },
      },
      {
        input: "/test.html.json",
        matches: ["/test.html.json", "html.json"],
        expected: {
          path: "/test.html.json",
          index: 0,
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
        matches: null,
        expected: false,
      },
      {
        input: "/test.html",
        matches: ["/test.html", "html"],
        expected: {
          path: "/test.html",
          index: 0,
          params: { format: ["html"] },
        },
      },
      {
        input: "/test.hbs.html",
        matches: ["/test.hbs.html", "hbs.html"],
        expected: {
          path: "/test.hbs.html",
          index: 0,
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
        matches: ["/route.html", "route", "html"],
        expected: {
          path: "/route.html",
          index: 0,
          params: { test: "route", format: "html" },
        },
      },
      {
        input: "/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route.html.json",
        matches: ["/route.html.json", "route", "html.json"],
        expected: {
          path: "/route.html.json",
          index: 0,
          params: { test: "route", format: "html.json" },
        },
      },
    ],
  },
  {
    path: "/:test.:format?",
    tests: [
      {
        input: "/route",
        matches: ["/route", "route", undefined],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/route.json",
        matches: ["/route.json", "route", "json"],
        expected: {
          path: "/route.json",
          index: 0,
          params: { test: "route", format: "json" },
        },
      },
      {
        input: "/route.json.html",
        matches: ["/route.json.html", "route", "json.html"],
        expected: {
          path: "/route.json.html",
          index: 0,
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
        matches: ["/route.htmlz", "route", "html"],
        expected: {
          path: "/route.htmlz",
          index: 0,
          params: { test: "route", format: "html" },
        },
      },
      {
        input: "/route.html",
        matches: null,
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
        matches: ["/123", "123"],
        expected: { path: "/123", index: 0, params: { "0": "123" } },
      },
      {
        input: "/abc",
        matches: null,
        expected: false,
      },
      {
        input: "/123/abc",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/(\\d+)?",
    tests: [
      {
        input: "/",
        matches: ["/", undefined],
        expected: { path: "/", index: 0, params: { "0": undefined } },
      },
      {
        input: "/123",
        matches: ["/123", "123"],
        expected: { path: "/123", index: 0, params: { "0": "123" } },
      },
    ],
  },
  {
    path: "/route\\(\\\\(\\d+\\\\)\\)",
    tests: [
      {
        input: "/route(\\123\\)",
        matches: ["/route(\\123\\)", "123\\"],
        expected: {
          path: "/route(\\123\\)",
          index: 0,
          params: { "0": "123\\" },
        },
      },
      {
        input: "/route(\\123)",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "{/route}?",
    tests: [
      {
        input: "",
        matches: [""],
        expected: { path: "", index: 0, params: {} },
      },
      {
        input: "/",
        matches: ["/"],
        expected: { path: "/", index: 0, params: {} },
      },
      {
        input: "/foo",
        matches: null,
        expected: false,
      },
      {
        input: "/route",
        matches: ["/route"],
        expected: { path: "/route", index: 0, params: {} },
      },
    ],
  },
  {
    path: "{/(.*)}",
    tests: [
      {
        input: "/",
        matches: ["/", ""],
        expected: { path: "/", index: 0, params: { "0": "" } },
      },
      {
        input: "/login",
        matches: ["/login", "login"],
        expected: { path: "/login", index: 0, params: { "0": "login" } },
      },
    ],
  },

  /**
   * Standalone modifiers.
   */
  {
    path: "/?",
    tests: [
      {
        input: "/",
        matches: ["/", undefined],
        expected: { path: "/", index: 0, params: {} },
      },
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { "0": "route" } },
      },
    ],
  },
  {
    path: "/+",
    tests: [
      {
        input: "/",
        matches: null,
        expected: false,
      },
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { "0": ["route"] } },
      },
      {
        input: "/route/",
        matches: ["/route/", "route"],
        expected: { path: "/route/", index: 0, params: { "0": ["route"] } },
      },
      {
        input: "/route/route",
        matches: ["/route/route", "route/route"],
        expected: {
          path: "/route/route",
          index: 0,
          params: { "0": ["route", "route"] },
        },
      },
    ],
  },
  {
    path: "/*",
    tests: [
      {
        input: "/",
        matches: ["/", undefined],
        expected: { path: "/", index: 0, params: { "0": undefined } },
      },
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { "0": ["route"] } },
      },
      {
        input: "/route/nested",
        matches: ["/route/nested", "route/nested"],
        expected: {
          path: "/route/nested",
          index: 0,
          params: { "0": ["route", "nested"] },
        },
      },
    ],
  },

  /**
   * Regexps.
   */
  {
    path: /.*/,
    tests: [
      {
        input: "/match/anything",
        matches: ["/match/anything"],
        expected: { path: "/match/anything", index: 0, params: {} },
      },
    ],
  },
  {
    path: /(.*)/,
    tests: [
      {
        input: "/match/anything",
        matches: ["/match/anything", "/match/anything"],
        expected: {
          path: "/match/anything",
          index: 0,
          params: { "0": "/match/anything" },
        },
      },
    ],
  },
  {
    path: /\/(\d+)/,
    tests: [
      {
        input: "/abc",
        matches: null,
        expected: false,
      },
      {
        input: "/123",
        matches: ["/123", "123"],
        expected: { path: "/123", index: 0, params: { "0": "123" } },
      },
    ],
  },

  /**
   * Mixed inputs.
   */
  {
    path: ["/one", /\/two/],
    tests: [
      {
        input: "/one",
        matches: ["/one"],
        expected: { path: "/one", index: 0, params: {} },
      },
      {
        input: "/two",
        matches: ["/two"],
        expected: { path: "/two", index: 0, params: {} },
      },
      {
        input: "/three",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: ["/:test(\\d+)", /(.*)/],
    tests: [
      {
        input: "/123",
        matches: ["/123", "123", undefined],
        expected: { path: "/123", index: 0, params: { test: "123" } },
      },
      {
        input: "/abc",
        matches: ["/abc", undefined, "/abc"],
        expected: { path: "/abc", index: 0, params: { "0": "/abc" } },
      },
    ],
  },

  /**
   * Correct names and indexes.
   */
  {
    path: ["/:test", "/route/:test2"],
    tests: [
      {
        input: "/test",
        matches: ["/test", "test", undefined],
        expected: { path: "/test", index: 0, params: { test: "test" } },
      },
      {
        input: "/route/test",
        matches: ["/route/test", undefined, "test"],
        expected: { path: "/route/test", index: 0, params: { test2: "test" } },
      },
    ],
  },
  {
    path: [/^\/([^/]+)$/, /^\/route\/([^/]+)$/],
    tests: [
      {
        input: "/test",
        matches: ["/test", "test", undefined],
        expected: { path: "/test", index: 0, params: { 0: "test" } },
      },
      {
        input: "/route/test",
        matches: ["/route/test", undefined, "test"],
        expected: { path: "/route/test", index: 0, params: { 0: "test" } },
      },
    ],
  },
  {
    path: /(?:.*)/,
    tests: [
      {
        input: "/anything/you/want",
        matches: ["/anything/you/want"],
        expected: { path: "/anything/you/want", index: 0, params: {} },
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
        matches: null,
        expected: false,
      },
      {
        input: "/(testing)",
        matches: ["/(testing)"],
        expected: { path: "/(testing)", index: 0, params: {} },
      },
    ],
  },
  {
    path: "/.\\+\\*\\?\\{\\}=^\\!\\:$[]\\|",
    tests: [
      {
        input: "/.+*?{}=^!:$[]|",
        matches: ["/.+*?{}=^!:$[]|"],
        expected: { path: "/.+*?{}=^!:$[]|", index: 0, params: {} },
      },
    ],
  },
  {
    path: "/test\\/:uid(u\\d+)?:cid(c\\d+)?",
    tests: [
      {
        input: "/test/u123",
        matches: ["/test/u123", "u123", undefined],
        expected: { path: "/test/u123", index: 0, params: { uid: "u123" } },
      },
      {
        input: "/test/c123",
        matches: ["/test/c123", undefined, "c123"],
        expected: { path: "/test/c123", index: 0, params: { cid: "c123" } },
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
        matches: ["/icon-240.png", "240"],
        expected: { path: "/icon-240.png", index: 0, params: { res: "240" } },
      },
      {
        input: "/apple-icon-240.png",
        matches: ["/apple-icon-240.png", "240"],
        expected: {
          path: "/apple-icon-240.png",
          index: 0,
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
        matches: ["/match/route", "match", "route"],
        expected: {
          path: "/match/route",
          index: 0,
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
        matches: ["/foo(test)/bar", "foo"],
        expected: { path: "/foo(test)/bar", index: 0, params: { foo: "foo" } },
      },
      {
        input: "/foo/bar",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:remote([\\w-.]+)/:user([\\w-]+)",
    tests: [
      {
        input: "/endpoint/user",
        matches: ["/endpoint/user", "endpoint", "user"],
        expected: {
          path: "/endpoint/user",
          index: 0,
          params: { remote: "endpoint", user: "user" },
        },
      },
      {
        input: "/endpoint/user-name",
        matches: ["/endpoint/user-name", "endpoint", "user-name"],
        expected: {
          path: "/endpoint/user-name",
          index: 0,
          params: { remote: "endpoint", user: "user-name" },
        },
      },
      {
        input: "/foo.bar/user-name",
        matches: ["/foo.bar/user-name", "foo.bar", "user-name"],
        expected: {
          path: "/foo.bar/user-name",
          index: 0,
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
        matches: ["/route?", "route"],
        expected: { path: "/route?", index: 0, params: { foo: "route" } },
      },
      {
        input: "/route",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:foo+bar",
    tests: [
      {
        input: "/foobar",
        matches: ["/foobar", "foo"],
        expected: { path: "/foobar", index: 0, params: { foo: ["foo"] } },
      },
      {
        input: "/foo/bar",
        matches: null,
        expected: false,
      },
      {
        input: "/foo/barbar",
        matches: ["/foo/barbar", "foo/bar"],
        expected: {
          path: "/foo/barbar",
          index: 0,
          params: { foo: ["foo", "bar"] },
        },
      },
    ],
  },
  {
    path: "\\/:pre?baz",
    tests: [
      {
        input: "/foobaz",
        matches: ["/foobaz", "foo"],
        expected: { path: "/foobaz", index: 0, params: { pre: "foo" } },
      },
      {
        input: "/baz",
        matches: ["/baz", undefined],
        expected: { path: "/baz", index: 0, params: { pre: undefined } },
      },
    ],
  },
  {
    path: "/:foo\\(:bar?\\)",
    tests: [
      {
        input: "/hello(world)",
        matches: ["/hello(world)", "hello", "world"],
        expected: {
          path: "/hello(world)",
          index: 0,
          params: { foo: "hello", bar: "world" },
        },
      },
      {
        input: "/hello()",
        matches: ["/hello()", "hello", undefined],
        expected: {
          path: "/hello()",
          index: 0,
          params: { foo: "hello", bar: undefined },
        },
      },
    ],
  },
  {
    path: "/:postType(video|audio|text)(\\+.+)?",
    tests: [
      {
        input: "/video",
        matches: ["/video", "video", undefined],
        expected: { path: "/video", index: 0, params: { postType: "video" } },
      },
      {
        input: "/video+test",
        matches: ["/video+test", "video", "+test"],
        expected: {
          path: "/video+test",
          index: 0,
          params: { 0: "+test", postType: "video" },
        },
      },
      {
        input: "/video+",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:foo?/:bar?-ext",
    tests: [
      {
        input: "/-ext",
        matches: null,
        expected: false,
      },
      {
        input: "-ext",
        matches: ["-ext", undefined, undefined],
        expected: {
          path: "-ext",
          index: 0,
          params: { foo: undefined, bar: undefined },
        },
      },
      {
        input: "/foo-ext",
        matches: ["/foo-ext", "foo", undefined],
        expected: { path: "/foo-ext", index: 0, params: { foo: "foo" } },
      },
      {
        input: "/foo/bar-ext",
        matches: ["/foo/bar-ext", "foo", "bar"],
        expected: {
          path: "/foo/bar-ext",
          index: 0,
          params: { foo: "foo", bar: "bar" },
        },
      },
      {
        input: "/foo/-ext",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:required/:optional?-ext",
    tests: [
      {
        input: "/foo-ext",
        matches: ["/foo-ext", "foo", undefined],
        expected: { path: "/foo-ext", index: 0, params: { required: "foo" } },
      },
      {
        input: "/foo/bar-ext",
        matches: ["/foo/bar-ext", "foo", "bar"],
        expected: {
          path: "/foo/bar-ext",
          index: 0,
          params: { required: "foo", optional: "bar" },
        },
      },
      {
        input: "/foo/-ext",
        matches: null,
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
        matches: ["/café", "café"],
        expected: { path: "/café", index: 0, params: { foo: "café" } },
      },
    ],
  },
  {
    path: "/:foo",
    options: {
      decode: encodeURIComponent,
    },
    tests: [
      {
        input: "/café",
        matches: ["/café", "café"],
        expected: { path: "/café", index: 0, params: { foo: "caf%C3%A9" } },
      },
    ],
  },
  {
    path: "/café",
    tests: [
      {
        input: "/café",
        matches: ["/café"],
        expected: { path: "/café", index: 0, params: {} },
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
        matches: ["/caf%C3%A9"],
        expected: { path: "/caf%C3%A9", index: 0, params: {} },
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
        matches: ["example.com", "example"],
        expected: {
          path: "example.com",
          index: 0,
          params: { domain: "example" },
        },
      },
      {
        input: "github.com",
        matches: ["github.com", "github"],
        expected: {
          path: "github.com",
          index: 0,
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
        matches: ["mail.example.com", "example"],
        expected: {
          path: "mail.example.com",
          index: 0,
          params: { domain: "example" },
        },
      },
      {
        input: "mail.github.com",
        matches: ["mail.github.com", "github"],
        expected: {
          path: "mail.github.com",
          index: 0,
          params: { domain: "github" },
        },
      },
    ],
  },
  {
    path: "mail.:domain?.com",
    options: {
      delimiter: ".",
    },
    tests: [
      {
        input: "mail.com",
        matches: ["mail.com", undefined],
        expected: { path: "mail.com", index: 0, params: { domain: undefined } },
      },
      {
        input: "mail.example.com",
        matches: ["mail.example.com", "example"],
        expected: {
          path: "mail.example.com",
          index: 0,
          params: { domain: "example" },
        },
      },
      {
        input: "mail.github.com",
        matches: ["mail.github.com", "github"],
        expected: {
          path: "mail.github.com",
          index: 0,
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
        matches: ["example.com", "com"],
        expected: { path: "example.com", index: 0, params: { ext: "com" } },
      },
      {
        input: "example.org",
        matches: ["example.org", "org"],
        expected: { path: "example.org", index: 0, params: { ext: "org" } },
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
        matches: ["this is"],
        expected: { path: "this is", index: 0, params: {} },
      },
      {
        input: "this isn't",
        matches: null,
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
        matches: ["$x", "x", undefined],
        expected: { path: "$x", index: 0, params: { foo: "x" } },
      },
      {
        input: "$x$y",
        matches: ["$x$y", "x", "y"],
        expected: { path: "$x$y", index: 0, params: { foo: "x", bar: "y" } },
      },
    ],
  },
  {
    path: "{$:foo}+",
    tests: [
      {
        input: "$x",
        matches: ["$x", "x"],
        expected: { path: "$x", index: 0, params: { foo: ["x"] } },
      },
      {
        input: "$x$y",
        matches: ["$x$y", "x$y"],
        expected: { path: "$x$y", index: 0, params: { foo: ["x", "y"] } },
      },
    ],
  },
  {
    path: "name/:attr1?{-:attr2}?{-:attr3}?",
    tests: [
      {
        input: "name/test",
        matches: ["name/test", "test", undefined, undefined],
        expected: {
          path: "name/test",
          index: 0,
          params: { attr1: "test" },
        },
      },
      {
        input: "name/1",
        matches: ["name/1", "1", undefined, undefined],
        expected: {
          path: "name/1",
          index: 0,
          params: { attr1: "1" },
        },
      },
      {
        input: "name/1-2",
        matches: ["name/1-2", "1", "2", undefined],
        expected: {
          path: "name/1-2",
          index: 0,
          params: { attr1: "1", attr2: "2" },
        },
      },
      {
        input: "name/1-2-3",
        matches: ["name/1-2-3", "1", "2", "3"],
        expected: {
          path: "name/1-2-3",
          index: 0,
          params: { attr1: "1", attr2: "2", attr3: "3" },
        },
      },
      {
        input: "name/foo-bar/route",
        matches: null,
        expected: false,
      },
      {
        input: "name/test/route",
        matches: null,
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
        matches: ["/123", "123"],
        expected: { path: "/123", index: 0, params: { test: "123" } },
      },
      {
        input: "/abc",
        matches: null,
        expected: false,
      },
      {
        input: "/123/abc",
        matches: null,
        expected: false,
      },
      {
        input: "/123.123",
        matches: ["/123.123", "123.123"],
        expected: { path: "/123.123", index: 0, params: { test: "123.123" } },
      },
      {
        input: "/123.abc",
        matches: null,
        expected: false,
      },
    ],
  },
  {
    path: "/:test((?!login)[^/]+)",
    tests: [
      {
        input: "/route",
        matches: ["/route", "route"],
        expected: { path: "/route", index: 0, params: { test: "route" } },
      },
      {
        input: "/login",
        matches: null,
        expected: false,
      },
    ],
  },

  /**
   * https://github.com/pillarjs/path-to-regexp/issues/206
   */
  {
    path: "/user(s)?/:user",
    tests: [
      {
        input: "/user/123",
        matches: ["/user/123", undefined, "123"],
        expected: { path: "/user/123", index: 0, params: { user: "123" } },
      },
      {
        input: "/users/123",
        matches: ["/users/123", "s", "123"],
        expected: {
          path: "/users/123",
          index: 0,
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
        matches: ["/user/123", "123"],
        expected: { path: "/user/123", index: 0, params: { user: "123" } },
      },
      {
        input: "/users/123",
        matches: ["/users/123", "123"],
        expected: { path: "/users/123", index: 0, params: { user: "123" } },
      },
    ],
  },

  /**
   * https://github.com/pillarjs/path-to-regexp/issues/260
   */
  {
    path: ":name*",
    tests: [
      {
        input: "foobar",
        matches: ["foobar", "foobar"],
        expected: { path: "foobar", index: 0, params: { name: ["foobar"] } },
      },
      {
        input: "foo/bar",
        matches: ["foo/bar", "foo/bar"],
        expected: {
          path: "foo/bar",
          index: 0,
          params: { name: ["foo", "bar"] },
        },
      },
    ],
  },
  {
    path: ":name+",
    tests: [
      {
        input: "",
        matches: null,
        expected: false,
      },
      {
        input: "foobar",
        matches: ["foobar", "foobar"],
        expected: { path: "foobar", index: 0, params: { name: ["foobar"] } },
      },
      {
        input: "foo/bar",
        matches: ["foo/bar", "foo/bar"],
        expected: {
          path: "foo/bar",
          index: 0,
          params: { name: ["foo", "bar"] },
        },
      },
    ],
  },

  /**
   * Named capturing groups.
   */
  {
    path: /\/(?<groupname>.+)/,
    tests: [
      {
        input: "/foo",
        matches: ["/foo", "foo"],
        expected: { path: "/foo", index: 0, params: { groupname: "foo" } },
      },
    ],
  },
  {
    path: /\/(?<test>.*).(?<format>html|json)/,
    tests: [
      {
        input: "/route",
        matches: null,
        expected: false,
      },
      {
        input: "/route.txt",
        matches: null,
        expected: false,
      },
      {
        input: "/route.html",
        matches: ["/route.html", "route", "html"],
        expected: {
          path: "/route.html",
          index: 0,
          params: { test: "route", format: "html" },
        },
      },
      {
        input: "/route.json",
        matches: ["/route.json", "route", "json"],
        expected: {
          path: "/route.json",
          index: 0,
          params: { test: "route", format: "json" },
        },
      },
    ],
  },
  {
    path: /\/(.+)\/(?<groupname>.+)\/(.+)/,
    tests: [
      {
        input: "/test",
        matches: null,
        expected: false,
      },
      {
        input: "/test/testData",
        matches: null,
        expected: false,
      },
      {
        input: "/test/testData/extraStuff",
        matches: [
          "/test/testData/extraStuff",
          "test",
          "testData",
          "extraStuff",
        ],
        expected: {
          path: "/test/testData/extraStuff",
          index: 0,
          params: { 0: "test", 1: "extraStuff", groupname: "testData" },
        },
      },
    ],
  },
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

    it("should accept parse result as input", () => {
      const tokens = pathToRegexp.parse("/user/:id");
      const re = pathToRegexp.pathToRegexp(tokens);
      expect(exec(re, "/user/123")).toEqual(["/user/123", "123"]);
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
      }).toThrow(new TypeError("Missing parameter name at 2"));
    });

    it("should throw on nested groups", () => {
      expect(() => {
        pathToRegexp.pathToRegexp("/{a{b:foo}}");
      }).toThrow(new TypeError("Unexpected OPEN at 3, expected CLOSE"));
    });
  });

  describe.each(PARSER_TESTS)(
    "parse $path with $options",
    ({ path, options, expected }) => {
      it("should parse the path", () => {
        const data = pathToRegexp.parse(path, options);
        expect(data.tokens).toEqual(expected);
      });
    },
  );

  describe.each(COMPILE_TESTS)(
    "compile $path with $options",
    ({ path, options, tests }) => {
      const toPath = pathToRegexp.compile(path, options);

      it.each(tests)("should compile $input", ({ input, expected }) => {
        if (expected === null) {
          expect(() => {
            toPath(input);
          }).toThrow();
        } else {
          expect(toPath(input)).toEqual(expected);
        }
      });
    },
  );

  describe.each(MATCH_TESTS)(
    "match $path with $options",
    ({ path, options, tests }) => {
      const keys: pathToRegexp.Key[] = [];
      const re = pathToRegexp.pathToRegexp(path, keys, options);
      const match = pathToRegexp.match(path, options);

      it.each(tests)("should match $input", ({ input, matches, expected }) => {
        expect(exec(re, input)).toEqual(matches);
        expect(match(input)).toEqual(expected);
      });
    },
  );

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
