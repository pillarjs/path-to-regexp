const DEFAULT_DELIMITER = "/";
const NOOP_VALUE = (value: string) => value;
const ID_START = /^[$_\p{ID_Start}]$/u;
const ID_CONTINUE = /^[$\u200c\u200d\p{ID_Continue}]$/u;
const DEBUG_URL = "https://git.new/pathToRegexpError";

/**
 * Encode a string into another string.
 */
export type Encode = (value: string) => string;

/**
 * Decode a string into another string.
 */
export type Decode = (value: string) => string;

export interface ParseOptions {
  /**
   * A function for encoding input strings.
   */
  encodePath?: Encode;
}

export interface PathToRegexpOptions {
  /**
   * Matches the path completely without trailing characters. (default: `true`)
   */
  end?: boolean;
  /**
   * Allows optional trailing delimiter to match. (default: `true`)
   */
  trailing?: boolean;
  /**
   * Match will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * The default delimiter for segments. (default: `'/'`)
   */
  delimiter?: string;
}

export interface MatchOptions extends PathToRegexpOptions {
  /**
   * Function for decoding strings for params, or `false` to disable entirely. (default: `decodeURIComponent`)
   */
  decode?: Decode | false;
}

export interface CompileOptions {
  /**
   * Function for encoding input strings for output into the path, or `false` to disable entirely. (default: `encodeURIComponent`)
   */
  encode?: Encode | false;
  /**
   * The default delimiter for segments. (default: `'/'`)
   */
  delimiter?: string;
}

type TokenType =
  | "{"
  | "}"
  | "WILDCARD"
  | "PARAM"
  | "CHAR"
  | "ESCAPED"
  | "END"
  // Reserved for use or ambiguous due to past use.
  | "("
  | ")"
  | "["
  | "]"
  | "+"
  | "?"
  | "!";

/**
 * Tokenizer results.
 */
interface LexToken {
  type: TokenType;
  index: number;
  value: string;
}

const SIMPLE_TOKENS: Record<string, TokenType> = {
  // Groups.
  "{": "{",
  "}": "}",
  // Reserved.
  "(": "(",
  ")": ")",
  "[": "[",
  "]": "]",
  "+": "+",
  "?": "?",
  "!": "!",
};

/**
 * Escape text for stringify to path.
 */
function escapeText(str: string) {
  return str.replace(/[{}()\[\]+?!:*\\]/g, "\\$&");
}

/**
 * Escape a regular expression string.
 */
function escape(str: string) {
  return str.replace(/[.+*?^${}()[\]|/\\]/g, "\\$&");
}

/**
 * Format error so it's easier to debug.
 */
function errorMessage(text: string, originalPath: string | undefined) {
  let message = text;
  if (originalPath !== undefined) message += `: ${originalPath}`;
  message += `; visit ${DEBUG_URL} for info`;
  return message;
}

/**
 * Plain text.
 */
export interface Text {
  type: "text";
  value: string;
}

/**
 * A parameter designed to match arbitrary text within a segment.
 */
export interface Parameter {
  type: "param";
  name: string;
}

/**
 * A wildcard parameter designed to match multiple segments.
 */
export interface Wildcard {
  type: "wildcard";
  name: string;
}

/**
 * A set of possible tokens to expand when matching.
 */
export interface Group {
  type: "group";
  tokens: Token[];
}

/**
 * A token that corresponds with a regexp capture.
 */
export type Key = Parameter | Wildcard;

/**
 * A sequence of `path-to-regexp` keys that match capturing groups.
 */
export type Keys = Array<Key>;

/**
 * A sequence of path match characters.
 */
export type Token = Text | Parameter | Wildcard | Group;

/**
 * Tokenized path instance.
 */
export class TokenData {
  constructor(
    public readonly tokens: Token[],
    public readonly originalPath?: string,
  ) {}
}

/**
 * Parse a string for the raw tokens.
 */
export function parse(str: string, options: ParseOptions = {}): TokenData {
  const { encodePath = NOOP_VALUE } = options;
  const chars = [...str];
  const tokens: Array<LexToken> = [];
  let index = 0;
  let pos = 0;

  function name() {
    let value = "";

    if (ID_START.test(chars[index])) {
      value += chars[index];
      while (ID_CONTINUE.test(chars[++index])) {
        value += chars[index];
      }
    } else if (chars[index] === '"') {
      let pos = index;

      while (index < chars.length) {
        if (chars[++index] === '"') {
          index++;
          pos = 0;
          break;
        }

        if (chars[index] === "\\") {
          value += chars[++index];
        } else {
          value += chars[index];
        }
      }

      if (pos) {
        throw new TypeError(
          errorMessage(`Unterminated quote at index ${pos}`, str),
        );
      }
    }

    if (!value) {
      throw new TypeError(
        errorMessage(`Missing parameter name at index ${index}`, str),
      );
    }

    return value;
  }

  while (index < chars.length) {
    const value = chars[index];
    const type = SIMPLE_TOKENS[value];

    if (type) {
      tokens.push({ type, index: index++, value });
    } else if (value === "\\") {
      tokens.push({ type: "ESCAPED", index: index++, value: chars[index++] });
    } else if (value === ":") {
      tokens.push({ type: "PARAM", index: index++, value: name() });
    } else if (value === "*") {
      tokens.push({ type: "WILDCARD", index: index++, value: name() });
    } else {
      tokens.push({ type: "CHAR", index: index++, value });
    }
  }

  tokens.push({ type: "END", index, value: "" });

  function consumeUntil(endType: TokenType): Token[] {
    const output: Token[] = [];

    while (true) {
      const { type, value, index } = tokens[pos++];
      if (type === endType) break;

      if (type === "CHAR" || type === "ESCAPED") {
        let path = value;
        while (true) {
          const next = tokens[pos];
          if (next.type !== "CHAR" && next.type !== "ESCAPED") break;
          pos++;
          path += next.value;
        }
        output.push({ type: "text", value: encodePath(path) });
        continue;
      }

      if (type === "PARAM") {
        output.push({
          type: "param",
          name: value,
        });
        continue;
      }

      if (type === "WILDCARD") {
        output.push({
          type: "wildcard",
          name: value,
        });
        continue;
      }

      if (type === "{") {
        output.push({
          type: "group",
          tokens: consumeUntil("}"),
        });
        continue;
      }

      throw new TypeError(
        errorMessage(
          `Unexpected ${type} at index ${index}, expected ${endType}`,
          str,
        ),
      );
    }

    return output;
  }

  return new TokenData(consumeUntil("END"), str);
}

/**
 * Compile a string to a template function for the path.
 */
export function compile<P extends ParamData = ParamData>(
  path: Path,
  options: CompileOptions & ParseOptions = {},
) {
  const { encode = encodeURIComponent, delimiter = DEFAULT_DELIMITER } =
    options;
  const data = typeof path === "object" ? path : parse(path, options);
  const fn = tokensToFunction(data.tokens, delimiter, encode);

  return function path(params: P = {} as P) {
    const [path, ...missing] = fn(params);
    if (missing.length) {
      throw new TypeError(`Missing parameters: ${missing.join(", ")}`);
    }
    return path;
  };
}

export type ParamData = Partial<Record<string, string | string[]>>;
export type PathFunction<P extends ParamData> = (data?: P) => string;

function tokensToFunction(
  tokens: Token[],
  delimiter: string,
  encode: Encode | false,
) {
  const encoders = tokens.map((token) =>
    tokenToFunction(token, delimiter, encode),
  );

  return (data: ParamData) => {
    const result: string[] = [""];

    for (const encoder of encoders) {
      const [value, ...extras] = encoder(data);
      result[0] += value;
      result.push(...extras);
    }

    return result;
  };
}

/**
 * Convert a single token into a path building function.
 */
function tokenToFunction(
  token: Token,
  delimiter: string,
  encode: Encode | false,
): (data: ParamData) => string[] {
  if (token.type === "text") return () => [token.value];

  if (token.type === "group") {
    const fn = tokensToFunction(token.tokens, delimiter, encode);

    return (data) => {
      const [value, ...missing] = fn(data);
      if (!missing.length) return [value];
      return [""];
    };
  }

  const encodeValue = encode || NOOP_VALUE;

  if (token.type === "wildcard" && encode !== false) {
    return (data) => {
      const value = data[token.name];
      if (value == null) return ["", token.name];

      if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError(`Expected "${token.name}" to be a non-empty array`);
      }

      return [
        value
          .map((value, index) => {
            if (typeof value !== "string") {
              throw new TypeError(
                `Expected "${token.name}/${index}" to be a string`,
              );
            }

            return encodeValue(value);
          })
          .join(delimiter),
      ];
    };
  }

  return (data) => {
    const value = data[token.name];
    if (value == null) return ["", token.name];

    if (typeof value !== "string") {
      throw new TypeError(`Expected "${token.name}" to be a string`);
    }

    return [encodeValue(value)];
  };
}

/**
 * A match result contains data about the path match.
 */
export interface MatchResult<P extends ParamData> {
  path: string;
  params: P;
}

/**
 * A match is either `false` (no match) or a match result.
 */
export type Match<P extends ParamData> = false | MatchResult<P>;

/**
 * The match function takes a string and returns whether it matched the path.
 */
export type MatchFunction<P extends ParamData> = (path: string) => Match<P>;

/**
 * Supported path types.
 */
export type Path = string | TokenData;

/**
 * Transform a path into a match function.
 */
export function match<P extends ParamData>(
  path: Path | Path[],
  options: MatchOptions & ParseOptions = {},
): MatchFunction<P> {
  const { decode = decodeURIComponent, delimiter = DEFAULT_DELIMITER } =
    options;
  const { regexp, keys } = pathToRegexp(path, options);

  const decoders = keys.map((key) => {
    if (decode === false) return NOOP_VALUE;
    if (key.type === "param") return decode;
    return (value: string) => value.split(delimiter).map(decode);
  });

  return function match(input: string) {
    const m = regexp.exec(input);
    if (!m) return false;

    const path = m[0];
    const params = Object.create(null);

    for (let i = 1; i < m.length; i++) {
      if (m[i] === undefined) continue;

      const key = keys[i - 1];
      const decoder = decoders[i - 1];
      params[key.name] = decoder(m[i]);
    }

    return { path, params };
  };
}

export function pathToRegexp(
  path: Path | Path[],
  options: PathToRegexpOptions & ParseOptions = {},
) {
  const {
    delimiter = DEFAULT_DELIMITER,
    end = true,
    sensitive = false,
    trailing = true,
  } = options;
  const keys: Keys = [];
  const flags = sensitive ? "" : "i";
  const sources: string[] = [];

  for (const input of pathsToArray(path, [])) {
    const data = typeof input === "object" ? input : parse(input, options);
    for (const tokens of flatten(data.tokens, 0, [])) {
      sources.push(toRegExp(tokens, delimiter, keys, data.originalPath));
    }
  }

  let pattern = `^(?:${sources.join("|")})`;
  if (trailing) pattern += `(?:${escape(delimiter)}$)?`;
  pattern += end ? "$" : `(?=${escape(delimiter)}|$)`;

  const regexp = new RegExp(pattern, flags);
  return { regexp, keys };
}

/**
 * Convert a path or array of paths into a flat array.
 */
function pathsToArray(paths: Path | Path[], init: Path[]): Path[] {
  if (Array.isArray(paths)) {
    for (const p of paths) pathsToArray(p, init);
  } else {
    init.push(paths);
  }
  return init;
}

/**
 * Flattened token set.
 */
type FlatToken = Text | Parameter | Wildcard;

/**
 * Generate a flat list of sequence tokens from the given tokens.
 */
function* flatten(
  tokens: Token[],
  index: number,
  init: FlatToken[],
): Generator<FlatToken[]> {
  if (index === tokens.length) {
    return yield init;
  }

  const token = tokens[index];

  if (token.type === "group") {
    for (const seq of flatten(token.tokens, 0, init.slice())) {
      yield* flatten(tokens, index + 1, seq);
    }
  } else {
    init.push(token);
  }

  yield* flatten(tokens, index + 1, init);
}

/**
 * Transform a flat sequence of tokens into a regular expression.
 */
function toRegExp(
  tokens: FlatToken[],
  delimiter: string,
  keys: Keys,
  originalPath: string | undefined,
) {
  let result = "";
  let backtrack = "";
  let isSafeSegmentParam = true;

  for (const token of tokens) {
    if (token.type === "text") {
      result += escape(token.value);
      backtrack += token.value;
      isSafeSegmentParam ||= token.value.includes(delimiter);
      continue;
    }

    if (token.type === "param" || token.type === "wildcard") {
      if (!isSafeSegmentParam && !backtrack) {
        throw new TypeError(
          errorMessage(`Missing text before "${token.name}"`, originalPath),
        );
      }

      if (token.type === "param") {
        result += `(${negate(delimiter, isSafeSegmentParam ? "" : backtrack)}+)`;
      } else {
        result += `([\\s\\S]+)`;
      }

      keys.push(token);
      backtrack = "";
      isSafeSegmentParam = false;
      continue;
    }
  }

  return result;
}

/**
 * Block backtracking on previous text and ignore delimiter string.
 */
function negate(delimiter: string, backtrack: string) {
  if (backtrack.length < 2) {
    if (delimiter.length < 2) return `[^${escape(delimiter + backtrack)}]`;
    return `(?:(?!${escape(delimiter)})[^${escape(backtrack)}])`;
  }
  if (delimiter.length < 2) {
    return `(?:(?!${escape(backtrack)})[^${escape(delimiter)}])`;
  }
  return `(?:(?!${escape(backtrack)}|${escape(delimiter)})[\\s\\S])`;
}

/**
 * Stringify an array of tokens into a path string.
 */
function stringifyTokens(tokens: Token[]): string {
  let value = "";
  let i = 0;

  function name(value: string) {
    const isSafe = isNameSafe(value) && isNextNameSafe(tokens[i]);
    return isSafe ? value : JSON.stringify(value);
  }

  while (i < tokens.length) {
    const token = tokens[i++];

    if (token.type === "text") {
      value += escapeText(token.value);
      continue;
    }

    if (token.type === "group") {
      value += `{${stringifyTokens(token.tokens)}}`;
      continue;
    }

    if (token.type === "param") {
      value += `:${name(token.name)}`;
      continue;
    }

    if (token.type === "wildcard") {
      value += `*${name(token.name)}`;
      continue;
    }

    throw new TypeError(`Unknown token type: ${(token as any).type}`);
  }

  return value;
}

/**
 * Stringify token data into a path string.
 */
export function stringify(data: TokenData) {
  return stringifyTokens(data.tokens);
}

/**
 * Validate the parameter name contains valid ID characters.
 */
function isNameSafe(name: string) {
  const [first, ...rest] = name;
  return ID_START.test(first) && rest.every((char) => ID_CONTINUE.test(char));
}

/**
 * Validate the next token does not interfere with the current param name.
 */
function isNextNameSafe(token: Token | undefined) {
  if (token && token.type === "text") return !ID_CONTINUE.test(token.value[0]);
  return true;
}
