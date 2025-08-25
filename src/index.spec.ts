import { describe, it, expect } from "vitest";
import {
  parse,
  compile,
  match,
  stringify,
  pathToRegexp,
  TokenData,
  PathError,
} from "./index.js";
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
  describe("ParseError", () => {
    it("should contain original path and debug url", () => {
      const error = new PathError(
        "Unexpected end at index 7, expected }",
        "/{:foo,",
      );

      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toBe(
        "Unexpected end at index 7, expected }: /{:foo,; visit https://git.new/pathToRegexpError for info",
      );
      expect(error.originalPath).toBe("/{:foo,");
    });

    it("should omit original url when undefined", () => {
      const error = new PathError(
        "Unexpected end at index 7, expected }",
        undefined,
      );

      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toBe(
        "Unexpected end at index 7, expected }; visit https://git.new/pathToRegexpError for info",
      );
      expect(error.originalPath).toBeUndefined();
    });
  });

  describe("parse errors", () => {
    it("should throw on unbalanced group", () => {
      expect(() => parse("/{:foo,")).toThrow(
        new PathError("Unexpected end at index 7, expected }", "/{:foo,"),
      );
    });

    it("should throw on nested unbalanced group", () => {
      expect(() => parse("/{:foo/{x,y}")).toThrow(
        new PathError("Unexpected end at index 12, expected }", "/{:foo/{x,y}"),
      );
    });

    it("should throw on missing param name", () => {
      expect(() => parse("/:/")).toThrow(
        new PathError("Missing parameter name at index 2", "/:/"),
      );
    });

    it("should throw on missing wildcard name", () => {
      expect(() => parse("/*/")).toThrow(
        new PathError("Missing parameter name at index 2", "/*/"),
      );
    });

    it("should throw on unterminated quote", () => {
      expect(() => parse('/:"foo')).toThrow(
        new PathError("Unterminated quote at index 2", '/:"foo'),
      );
    });
  });

  describe("compile errors", () => {
    it("should throw when a param is missing", () => {
      const toPath = compile("/a/:b/c");

      expect(() => {
        toPath();
      }).toThrow(new TypeError("Missing parameters: b"));
    });

    it("should throw when expecting a repeated value", () => {
      const toPath = compile("/*foo");

      expect(() => {
        toPath({ foo: [] });
      }).toThrow(new TypeError('Expected "foo" to be a non-empty array'));
    });

    it("should throw when param gets an array", () => {
      const toPath = compile("/:foo");

      expect(() => {
        toPath({ foo: [] });
      }).toThrow(new TypeError('Expected "foo" to be a string'));
    });

    it("should throw when a wildcard is not an array", () => {
      const toPath = compile("/*foo");

      expect(() => {
        toPath({ foo: "a" });
      }).toThrow(new TypeError('Expected "foo" to be a non-empty array'));
    });

    it("should throw when a wildcard array value is not a string", () => {
      const toPath = compile("/*foo");

      expect(() => {
        toPath({ foo: [1, "a"] as any });
      }).toThrow(new TypeError('Expected "foo/0" to be a string'));
    });
  });

  describe("pathToRegexp errors", () => {
    it("should throw when missing text between params", () => {
      expect(() => pathToRegexp("/:foo:bar")).toThrow(
        new PathError('Missing text before "bar" param', "/:foo:bar"),
      );
    });

    it("should throw when missing text between params using TokenData", () => {
      expect(() =>
        pathToRegexp(
          new TokenData([
            { type: "param", name: "a" },
            { type: "param", name: "b" },
          ]),
        ),
      ).toThrow(new PathError('Missing text before "b" param', undefined));
    });

    it("should throw with `originalPath` when missing text between params using TokenData", () => {
      expect(() =>
        pathToRegexp(
          new TokenData(
            [
              { type: "param", name: "a" },
              { type: "param", name: "b" },
            ],
            "/[a][b]",
          ),
        ),
      ).toThrow(new PathError('Missing text before "b" param', "/[a][b]"));
    });

    it("should contain the error line", () => {
      expect.hasAssertions();

      try {
        pathToRegexp("/:");
      } catch (error) {
        const stack = (error as Error).stack
          ?.split("\n")
          .slice(0, 5)
          .join("\n");
        expect(stack).toContain("index.spec.ts");
      }
    });
  });

  describe("stringify errors", () => {
    it("should error on unknown token", () => {
      expect(() =>
        stringify({ tokens: [{ type: "unknown", value: "test" } as any] }),
      ).toThrow(new TypeError("Unknown token type: unknown"));
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
