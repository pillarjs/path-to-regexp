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
  return str.replace(/[{}()\[\]+?!:*]/g, "\\$&");
}

/**
 * Escape a regular expression string.
 */
function escape(str: string) {
  return str.replace(/[.+*?^${}()[\]|/\\]/g, "\\$&");
}

/**
 * Tokenize input string.
 */
function* lexer(str: string): Generator<LexToken, LexToken> {
  const chars = [...str];
  let i = 0;

  function name() {
    let value = "";

    if (ID_START.test(chars[++i])) {
      value += chars[i];
      while (ID_CONTINUE.test(chars[++i])) {
        value += chars[i];
      }
    } else if (chars[i] === '"') {
      let pos = i;

      while (i < chars.length) {
        if (chars[++i] === '"') {
          i++;
          pos = 0;
          break;
        }

        if (chars[i] === "\\") {
          value += chars[++i];
        } else {
          value += chars[i];
        }
      }

      if (pos) {
        throw new TypeError(`Unterminated quote at ${pos}: ${DEBUG_URL}`);
      }
    }

    if (!value) {
      throw new TypeError(`Missing parameter name at ${i}: ${DEBUG_URL}`);
    }

    return value;
  }

  while (i < chars.length) {
    const value = chars[i];
    const type = SIMPLE_TOKENS[value];

    if (type) {
      yield { type, index: i++, value };
    } else if (value === "\\") {
      yield { type: "ESCAPED", index: i++, value: chars[i++] };
    } else if (value === ":") {
      const value = name();
      yield { type: "PARAM", index: i, value };
    } else if (value === "*") {
      const value = name();
      yield { type: "WILDCARD", index: i, value };
    } else {
      yield { type: "CHAR", index: i, value: chars[i++] };
    }
  }

  return { type: "END", index: i, value: "" };
}

class Iter {
  private _peek?: LexToken;

  constructor(private tokens: Generator<LexToken, LexToken>) {}

  peek(): LexToken {
    if (!this._peek) {
      const next = this.tokens.next();
      this._peek = next.value;
    }
    return this._peek;
  }

  tryConsume(type: TokenType): string | undefined {
    const token = this.peek();
    if (token.type !== type) return;
    this._peek = undefined; // Reset after consumed.
    return token.value;
  }

  consume(type: TokenType): string {
    const value = this.tryConsume(type);
    if (value !== undefined) return value;
    const { type: nextType, index } = this.peek();
    throw new TypeError(
      `Unexpected ${nextType} at ${index}, expected ${type}: ${DEBUG_URL}`,
    );
  }

  text(): string {
    let result = "";
    let value: string | undefined;
    while ((value = this.tryConsume("CHAR") || this.tryConsume("ESCAPED"))) {
      result += value;
    }
    return result;
  }
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
  constructor(public readonly tokens: Token[]) {}
}

/**
 * Parse a string for the raw tokens.
 */
export function parse(str: string, options: ParseOptions = {}): TokenData {
  const { encodePath = NOOP_VALUE } = options;
  const it = new Iter(lexer(str));

  function consume(endType: TokenType): Token[] {
    const tokens: Token[] = [];

    while (true) {
      const path = it.text();
      if (path) tokens.push({ type: "text", value: encodePath(path) });

      const param = it.tryConsume("PARAM");
      if (param) {
        tokens.push({
          type: "param",
          name: param,
        });
        continue;
      }

      const wildcard = it.tryConsume("WILDCARD");
      if (wildcard) {
        tokens.push({
          type: "wildcard",
          name: wildcard,
        });
        continue;
      }

      const open = it.tryConsume("{");
      if (open) {
        tokens.push({
          type: "group",
          tokens: consume("}"),
        });
        continue;
      }

      it.consume(endType);
      return tokens;
    }
  }

  const tokens = consume("END");
  return new TokenData(tokens);
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
  const data = path instanceof TokenData ? path : parse(path, options);
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
  const sources: string[] = [];
  const flags = sensitive ? "" : "i";

  for (const seq of flat(path, options)) {
    sources.push(toRegExp(seq, delimiter, keys));
  }

  let pattern = `^(?:${sources.join("|")})`;
  if (trailing) pattern += `(?:${escape(delimiter)}$)?`;
  pattern += end ? "$" : `(?=${escape(delimiter)}|$)`;

  const regexp = new RegExp(pattern, flags);
  return { regexp, keys };
}

/**
 * Flattened token set.
 */
type Flattened = Text | Parameter | Wildcard;

/**
 * Path or array of paths to normalize.
 */
function* flat(
  path: Path | Path[],
  options: ParseOptions,
): Generator<Flattened[]> {
  if (Array.isArray(path)) {
    for (const p of path) yield* flat(p, options);
    return;
  }

  const data = path instanceof TokenData ? path : parse(path, options);
  yield* flatten(data.tokens, 0, []);
}

/**
 * Generate a flat list of sequence tokens from the given tokens.
 */
function* flatten(
  tokens: Token[],
  index: number,
  init: Flattened[],
): Generator<Flattened[]> {
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
function toRegExp(tokens: Flattened[], delimiter: string, keys: Keys) {
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
        throw new TypeError(`Missing text after "${token.name}": ${DEBUG_URL}`);
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
 * Stringify token data into a path string.
 */
export function stringify(data: TokenData) {
  return data.tokens
    .map(function stringifyToken(token, index, tokens): string {
      if (token.type === "text") return escapeText(token.value);
      if (token.type === "group") {
        return `{${token.tokens.map(stringifyToken).join("")}}`;
      }

      const isSafe =
        isNameSafe(token.name) && isNextNameSafe(tokens[index + 1]);
      const key = isSafe ? token.name : JSON.stringify(token.name);

      if (token.type === "param") return `:${key}`;
      if (token.type === "wildcard") return `*${key}`;
      throw new TypeError(`Unexpected token: ${token}`);
    })
    .join("");
}

/**
 * Validate the parameter name contains valid ID characters.
 */
function isNameSafe(name: string) {
  const [first, ...rest] = name;
  if (!ID_START.test(first)) return false;
  return rest.every((char) => ID_CONTINUE.test(char));
}

/**
 * Validate the next token does not interfere with the current param name.
 */
function isNextNameSafe(token: Token | undefined) {
  if (!token || token.type !== "text") return true;
  return !ID_CONTINUE.test(token.value[0]);
}
