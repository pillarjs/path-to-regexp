import { describe, it, expect } from "vitest";
import { parse, compile, match } from "./index.js";
import { PARSER_TESTS, COMPILE_TESTS, MATCH_TESTS } from "./cases.spec.js";

/**
 * Dynamically generate the entire test suite.
 */
describe("path-to-regexp", () => {
  describe("arguments", () => {
    it("should throw on non-capturing pattern", () => {
      expect(() => match("/:foo(?:\\d+(\\.\\d+)?)")).toThrow(
        new TypeError(
          'Pattern cannot start with "?" at 6: https://git.new/pathToRegexpError',
        ),
      );
    });

    it("should throw on nested capturing group", () => {
      expect(() => match("/:foo(\\d+(\\.\\d+)?)")).toThrow(
        new TypeError(
          "Capturing groups are not allowed at 9: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on unbalanced pattern", () => {
      expect(() => match("/:foo(abc")).toThrow(
        new TypeError(
          "Unbalanced pattern at 5: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on unmatched )", function () {
      expect(() => match("/:fooab)c")).toThrow(
        new TypeError("Unmatched ) at 7: https://git.new/pathToRegexpError"),
      );
    });

    it("should throw on unmatched ) after other patterns", function () {
      expect(() => match("/:test(\\w+)/:foo(\\d+))")).toThrow(
        new TypeError("Unmatched ) at 21: https://git.new/pathToRegexpError"),
      );
    });

    it("should throw on missing pattern", () => {
      expect(() => match("/:foo()")).toThrow(
        new TypeError(
          "Missing pattern at 5: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on missing name", () => {
      expect(() => match("/:(test)")).toThrow(
        new TypeError(
          "Missing parameter name at 2: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on nested groups", () => {
      expect(() => match("/{a{b:foo}}")).toThrow(
        new TypeError(
          "Unexpected { at 3, expected }: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on repeat parameters without a separator", () => {
      expect(() => match("{:x}*")).toThrow(
        new TypeError(
          `Missing separator for "x": https://git.new/pathToRegexpError`,
        ),
      );
    });

    it("should throw on unterminated quote", () => {
      expect(() => match('/:"foo')).toThrow(
        new TypeError(
          "Unterminated quote at 2: https://git.new/pathToRegexpError",
        ),
      );
    });

    it("should throw on invalid *", () => {
      expect(() => match("/:foo*")).toThrow(
        new TypeError(
          "Unexpected * at 5, you probably want `/*` or `{/:foo}*`: https://git.new/pathToRegexpError",
        ),
      );
    });
  });

  describe.each(PARSER_TESTS)(
    "parse $path with $options",
    ({ path, options, expected }) => {
      it("should parse the path", () => {
        const data = parse(path, options);
        expect(data.tokens).toEqual(expected);
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
      it.each(tests)("should match $input", ({ input, matches, expected }) => {
        const fn = match(path, options);

        expect(exec(fn.re, input)).toEqual(matches);
        expect(fn(input)).toEqual(expected);
      });
    },
  );

  describe("compile errors", () => {
    it("should throw when a required param is undefined", () => {
      const toPath = compile("/a/:b/c");

      expect(() => {
        toPath();
      }).toThrow(new TypeError('Expected "b" to be a string'));
    });

    it("should throw when it does not match the pattern", () => {
      const toPath = compile("/:foo(\\d+)");

      expect(() => {
        toPath({ foo: "abc" });
      }).toThrow(new TypeError('Invalid value for "foo": "abc"'));
    });

    it("should throw when expecting a repeated value", () => {
      const toPath = compile("{/:foo}+");

      expect(() => {
        toPath({ foo: [] });
      }).toThrow(new TypeError('Invalid value for "foo": ""'));
    });

    it("should throw when not expecting a repeated value", () => {
      const toPath = compile("/:foo");

      expect(() => {
        toPath({ foo: [] });
      }).toThrow(new TypeError('Expected "foo" to be a string'));
    });

    it("should throw when a repeated param is not an array", () => {
      const toPath = compile("{/:foo}+");

      expect(() => {
        toPath({ foo: "a" });
      }).toThrow(new TypeError('Expected "foo" to be an array'));
    });

    it("should throw when an array value is not a string", () => {
      const toPath = compile("{/:foo}+");

      expect(() => {
        toPath({ foo: [1, "a"] as any });
      }).toThrow(new TypeError('Expected "foo/0" to be a string'));
    });

    it("should throw when repeated value does not match", () => {
      const toPath = compile("{/:foo(\\d+)}+");

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
