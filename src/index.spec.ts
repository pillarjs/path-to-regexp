import { describe, it, expect } from "vitest";
import { parse, compile, match, stringify } from "./index.js";
import {
  PARSER_TESTS,
  COMPILE_TESTS,
  MATCH_TESTS,
  STRINGIFY_TESTS,
} from "./cases.spec.js";

/**
 * Dynamically generate the entire test suite.
 */
describe("path-to-regexp", () => {
  describe("parse errors", () => {
    it("should throw on unbalanced group", () => {
      expect(() => parse("/{:foo,")).toThrow(
        new TypeError(
          "'/{:foo,': Unexpected END at 7, expected }: https://git.new/pathToRegexpError",
        ),
      );
    });
    it("should throw on nested unbalanced group", () => {
      expect(() => parse("/{:foo/{x,y}")).toThrow(
        new TypeError(
          "'/{:foo/{x,y}': Unexpected END at 12, expected }: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on missing param name", () => {
      expect(() => parse("/:/")).toThrow(
        new TypeError(
          "'/:/': Missing parameter name at 2: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on missing wildcard name", () => {
      expect(() => parse("/*/")).toThrow(
        new TypeError(
          "'/*/': Missing parameter name at 2: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on unterminated quote", () => {
      expect(() => parse('/:"foo')).toThrow(
        new TypeError(
          `'/:"foo': Unterminated quote at 2: https://git.new/pathToRegexpError`,
        ),
      );
    });
  });

  describe("compile errors", () => {
    it("should throw when a param is missing", () => {
      const toPath = compile("/a/:b/c");

      expect(() => {
        toPath();
      }).toThrow(new TypeError("'/a/:b/c': Missing parameters: b"));
    });

    it("should throw when expecting a repeated value", () => {
      const toPath = compile("/*foo");

      expect(() => {
        toPath({ foo: [] });
      }).toThrow(
        new TypeError(`'/*foo': Expected "foo" to be a non-empty array`),
      );
    });

    it("should throw when param gets an array", () => {
      const toPath = compile("/:foo");

      expect(() => {
        toPath({ foo: [] });
      }).toThrow(new TypeError(`'/:foo': Expected "foo" to be a string`));
    });

    it("should throw when a wildcard is not an array", () => {
      const toPath = compile("/*foo");

      expect(() => {
        toPath({ foo: "a" });
      }).toThrow(
        new TypeError(`'/*foo': Expected "foo" to be a non-empty array`),
      );
    });

    it("should throw when a wildcard array value is not a string", () => {
      const toPath = compile("/*foo");

      expect(() => {
        toPath({ foo: [1, "a"] as any });
      }).toThrow(new TypeError(`'/*foo': Expected "foo/0" to be a string`));
    });
  });

  describe.each(PARSER_TESTS)(
    "parse $path with $options",
    ({ path, options, expected }) => {
      it("should parse the path", () => {
        const data = parse(path, options);
        expect(data).toEqual(expected);
      });
    },
  );

  describe.each(STRINGIFY_TESTS)(
    "stringify $tokens with $options",
    ({ data, expected }) => {
      it("should stringify the path", () => {
        const path = stringify(data);
        expect(path).toEqual(expected);
      });
    },
  );

  describe.each(COMPILE_TESTS)(
    "compile $path with $options",
    ({ path, options, tests }) => {
      it.each(tests)("should compile $input", ({ input, expected }) => {
        const toPath = compile(path, options);

        if (expected === null) {
          expect(() => toPath(input)).toThrow();
        } else {
          expect(toPath(input)).toEqual(expected);
        }
      });
    },
  );

  describe.each(MATCH_TESTS)(
    "match $path with $options",
    ({ path, options, tests }) => {
      it.each(tests)("should match $input", ({ input, expected }) => {
        const fn = match(path, options);
        expect(fn(input)).toEqual(expected);
      });
    },
  );
});
