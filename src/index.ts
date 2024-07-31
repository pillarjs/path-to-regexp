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
   * The default delimiter for segments. (default: `'/'`)
   */
  delimiter?: string;
  /**
   * A function for encoding input strings.
   */
  encodePath?: Encode;
}

export interface PathOptions {
  /**
   * Regexp will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
}

export interface MatchOptions extends PathOptions {
  /**
   * Function for decoding strings for params, or `false` to disable entirely. (default: `decodeURIComponent`)
   */
  decode?: Decode | false;
  /**
   * Matches the path completely without trailing characters. (default: `true`)
   */
  end?: boolean;
}

export interface CompileOptions extends PathOptions {
  /**
   * Verifies the function is producing a valid path. (default: `true`)
   */
  validate?: boolean;
  /**
   * Function for encoding input strings for output into the path, or `false` to disable entirely. (default: `encodeURIComponent`)
   */
  encode?: Encode | false;
}

type TokenType =
  | "{"
  | "}"
  | ";"
  | "*"
  | "+"
  | "?"
  | "NAME"
  | "PATTERN"
  | "CHAR"
  | "ESCAPED"
  | "END"
  // Reserved for use.
  | "!"
  | "@"
  | ",";

/**
 * Tokenizer results.
 */
interface LexToken {
  type: TokenType;
  index: number;
  value: string;
}

const SIMPLE_TOKENS: Record<string, TokenType> = {
  "!": "!",
  "@": "@",
  ";": ";",
  ",": ",",
  "*": "*",
  "+": "+",
  "?": "?",
  "{": "{",
  "}": "}",
};

/**
 * Tokenize input string.
 */
function lexer(str: string) {
  const chars = [...str];
  const tokens: LexToken[] = [];
  let i = 0;

  while (i < chars.length) {
    const value = chars[i];
    const type = SIMPLE_TOKENS[value];

    if (type) {
      tokens.push({ type, index: i++, value });
      continue;
    }

    if (value === "\\") {
      tokens.push({ type: "ESCAPED", index: i++, value: chars[i++] });
      continue;
    }

    if (value === ":") {
      let name = "";

      if (ID_START.test(chars[++i])) {
        name += chars[i];
        while (ID_CONTINUE.test(chars[++i])) {
          name += chars[i];
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
            name += chars[++i];
          } else {
            name += chars[i];
          }
        }

        if (pos) {
          throw new TypeError(`Unterminated quote at ${pos}: ${DEBUG_URL}`);
        }
      }

      if (!name) {
        throw new TypeError(`Missing parameter name at ${i}: ${DEBUG_URL}`);
      }

      tokens.push({ type: "NAME", index: i, value: name });
      continue;
    }

    if (value === "(") {
      const pos = i++;
      let count = 1;
      let pattern = "";

      if (chars[i] === "?") {
        throw new TypeError(
          `Pattern cannot start with "?" at ${i}: ${DEBUG_URL}`,
        );
      }

      while (i < chars.length) {
        if (chars[i] === "\\") {
          pattern += chars[i++] + chars[i++];
          continue;
        }

        if (chars[i] === ")") {
          count--;
          if (count === 0) {
            i++;
            break;
          }
        } else if (chars[i] === "(") {
          count++;
          if (chars[i + 1] !== "?") {
            throw new TypeError(
              `Capturing groups are not allowed at ${i}: ${DEBUG_URL}`,
            );
          }
        }

        pattern += chars[i++];
      }

      if (count) {
        throw new TypeError(`Unbalanced pattern at ${pos}: ${DEBUG_URL}`);
      }

      if (!pattern) {
        throw new TypeError(`Missing pattern at ${pos}: ${DEBUG_URL}`);
      }

      tokens.push({ type: "PATTERN", index: i, value: pattern });
      continue;
    }

    if (value === ")") {
      throw new TypeError(`Unmatched ) at ${i}: ${DEBUG_URL}`);
    }

    tokens.push({ type: "CHAR", index: i, value: chars[i++] });
  }

  tokens.push({ type: "END", index: i, value: "" });

  return new Iter(tokens);
}

class Iter {
  index = 0;

  constructor(private tokens: LexToken[]) {}

  peek(): LexToken {
    return this.tokens[this.index];
  }

  tryConsume(type: LexToken["type"]): string | undefined {
    const token = this.peek();
    if (token.type !== type) return;
    this.index++;
    return token.value;
  }

  consume(type: LexToken["type"]): string {
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

  modifier(): string | undefined {
    return this.tryConsume("?") || this.tryConsume("*") || this.tryConsume("+");
  }
}

/**
 * Tokenized path instance. Can we passed around instead of string.
 */
export class TokenData {
  constructor(
    public readonly tokens: Token[],
    public readonly delimiter: string,
  ) {}
}

/**
 * Parse a string for the raw tokens.
 */
export function parse(str: string, options: ParseOptions = {}): TokenData {
  const { encodePath = NOOP_VALUE, delimiter = encodePath(DEFAULT_DELIMITER) } =
    options;
  const tokens: Token[] = [];
  const it = lexer(str);
  let key = 0;

  do {
    const path = it.text();
    if (path) tokens.push(encodePath(path));

    const name = it.tryConsume("NAME");
    const pattern = it.tryConsume("PATTERN");

    if (name || pattern) {
      tokens.push({
        name: name || String(key++),
        pattern,
      });

      const next = it.peek();
      if (next.type === "*") {
        throw new TypeError(
          `Unexpected * at ${next.index}, you probably want \`/*\` or \`{/:foo}*\`: ${DEBUG_URL}`,
        );
      }

      continue;
    }

    const asterisk = it.tryConsume("*");
    if (asterisk) {
      tokens.push({
        name: String(key++),
        pattern: `${negate(delimiter)}*`,
        modifier: "*",
        separator: delimiter,
      });
      continue;
    }

    const open = it.tryConsume("{");
    if (open) {
      const prefix = it.text();
      const name = it.tryConsume("NAME");
      const pattern = it.tryConsume("PATTERN");
      const suffix = it.text();
      const separator = it.tryConsume(";") && it.text();

      it.consume("}");

      const modifier = it.modifier();

      tokens.push({
        name: name || (pattern ? String(key++) : ""),
        prefix: encodePath(prefix),
        suffix: encodePath(suffix),
        pattern,
        modifier,
        separator,
      });
      continue;
    }

    it.consume("END");
    break;
  } while (true);

  return new TokenData(tokens, delimiter);
}

/**
 * Compile a string to a template function for the path.
 */
export function compile<P extends ParamData = ParamData>(
  path: string,
  options: CompileOptions & ParseOptions = {},
) {
  return $compile<P>(parse(path, options), options);
}

export type ParamData = Partial<Record<string, string | string[]>>;
export type PathFunction<P extends ParamData> = (data?: P) => string;

/**
 * Check if a key repeats.
 */
export function isRepeat(key: Key) {
  return key.modifier === "+" || key.modifier === "*";
}

/**
 * Check if a key is optional.
 */
export function isOptional(key: Key) {
  return key.modifier === "?" || key.modifier === "*";
}

/**
 * Convert a single token into a path building function.
 */
function keyToFunction(
  key: Key,
  encode: Encode | false,
): (data: ParamData) => string {
  const encodeValue = encode || NOOP_VALUE;
  const { prefix = "", suffix = "", separator = suffix + prefix } = key;

  if (encode && isRepeat(key)) {
    const stringify = (value: string, index: number) => {
      if (typeof value !== "string") {
        throw new TypeError(`Expected "${key.name}/${index}" to be a string`);
      }
      return encodeValue(value);
    };

    const compile = (value: unknown) => {
      if (!Array.isArray(value)) {
        throw new TypeError(`Expected "${key.name}" to be an array`);
      }

      if (value.length === 0) return "";

      return prefix + value.map(stringify).join(separator) + suffix;
    };

    if (isOptional(key)) {
      return (data): string => {
        const value = data[key.name];
        if (value == null) return "";
        return value.length ? compile(value) : "";
      };
    }

    return (data): string => {
      const value = data[key.name];
      return compile(value);
    };
  }

  const stringify = (value: unknown) => {
    if (typeof value !== "string") {
      throw new TypeError(`Expected "${key.name}" to be a string`);
    }
    return prefix + encodeValue(value) + suffix;
  };

  if (isOptional(key)) {
    return (data): string => {
      const value = data[key.name];
      if (value == null) return "";
      return stringify(value);
    };
  }

  return (data): string => {
    const value = data[key.name];
    return stringify(value);
  };
}

/**
 * Transform tokens into a path building function.
 */
export function $compile<P extends ParamData>(
  data: TokenData,
  options: CompileOptions,
): PathFunction<P> {
  const { encode = encodeURIComponent, validate = true } = options;
  const flags = toFlags(options);
  const sources = toRegExpSource(data, []);

  // Compile all the tokens into regexps.
  const encoders: Array<(data: ParamData) => string> = data.tokens.map(
    (token, index) => {
      if (typeof token === "string") return () => token;

      const fn = keyToFunction(token, encode);
      if (!validate) return fn;

      const validRe = new RegExp(`^${sources[index]}$`, flags);

      return (data) => {
        const value = fn(data);
        if (!validRe.test(value)) {
          throw new TypeError(
            `Invalid value for "${token.name}": ${JSON.stringify(value)}`,
          );
        }
        return value;
      };
    },
  );

  return function path(data: Record<string, any> = {}) {
    let path = "";
    for (const encoder of encoders) path += encoder(data);
    return path;
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
 * Create path match function from `path-to-regexp` spec.
 */
export function $match<P extends ParamData>(
  data: TokenData,
  options: MatchOptions = {},
): MatchFunction<P> {
  const { decode = decodeURIComponent, end = true } = options;
  const { delimiter } = data;
  const keys: Key[] = [];
  const flags = toFlags(options);
  const sources = toRegExpSource(data, keys);
  const re = new RegExp(
    `^${sources.join("")}(?=${escape(delimiter)}|$)`,
    flags,
  );

  const decoders = keys.map((key) => {
    if (!decode) return NOOP_VALUE;

    if (isRepeat(key)) {
      const { prefix = "", suffix = "", separator = suffix + prefix } = key;
      return (value: string) => value.split(separator).map(decode);
    }

    return decode;
  });

  const isValid = end
    ? (a: string, b: string) => a.length === b.length
    : () => true;

  return Object.assign(
    function match(input: string) {
      const m = re.exec(input);
      if (!m) return false;

      const { 0: path } = m;
      if (!isValid(input, path)) return false;
      const params = Object.create(null);

      for (let i = 1; i < m.length; i++) {
        if (m[i] === undefined) continue;

        const key = keys[i - 1];
        const decoder = decoders[i - 1];
        params[key.name] = decoder(m[i]);
      }

      return { path, params };
    },
    { re },
  );
}

export function match<P extends ParamData>(
  path: string,
  options: MatchOptions & ParseOptions = {},
): MatchFunction<P> {
  return $match(parse(path, options), options);
}

/**
 * Escape a regular expression string.
 */
function escape(str: string) {
  return str.replace(/[.+*?^${}()[\]|/\\]/g, "\\$&");
}

/**
 * Get the flags for a regexp from the options.
 */
function toFlags(options: { sensitive?: boolean }) {
  return options.sensitive ? "s" : "is";
}

/**
 * A key is a capture group in the regex.
 */
export interface Key {
  name: string;
  prefix?: string;
  suffix?: string;
  pattern?: string;
  modifier?: string;
  separator?: string;
}

/**
 * A token is a string (nothing special) or key metadata (capture group).
 */
export type Token = string | Key;

/**
 * Convert a token into a regexp string (re-used for path validation).
 */
function toRegExpSource(data: TokenData, keys: Key[]): string[] {
  const sources = Array(data.tokens.length);
  let backtrack = "";

  let i = data.tokens.length;

  while (i--) {
    const token = data.tokens[i];

    if (typeof token === "string") {
      backtrack = token;
      sources[i] = escape(token);
      continue;
    }

    const {
      prefix = "",
      suffix = "",
      separator = suffix + prefix,
      modifier = "",
    } = token;

    const pre = escape(prefix);
    const post = escape(suffix);

    if (token.name) {
      backtrack = suffix || backtrack;
      keys.unshift(token);

      if (isRepeat(token)) {
        if (!separator) {
          throw new TypeError(
            `Missing separator for "${token.name}": ${DEBUG_URL}`,
          );
        }

        const mod = modifier === "*" ? "?" : "";
        const sep = escape(separator);
        const pattern =
          token.pattern || `${negate(data.delimiter, separator, backtrack)}+`;

        sources[i] = wrap(
          pre,
          `(?:${pattern})(?:${sep}(?:${pattern}))*`,
          post,
          mod,
        );
      } else {
        sources[i] = wrap(
          pre,
          token.pattern || `${negate(data.delimiter, backtrack)}+`,
          post,
          modifier,
        );
      }

      backtrack = prefix;
    } else {
      sources[i] = `(?:${pre}${post})${modifier}`;
      backtrack = `${prefix}${suffix}`;
    }
  }

  return sources;
}

function negate(...args: string[]) {
  const values = args.sort().filter((value, index, array) => {
    for (let i = 0; i < index; i++) {
      const v = array[i];
      if (v.length && value.startsWith(v)) return false;
    }
    return value.length > 0;
  });

  const isSimple = values.every((value) => value.length === 1);
  if (isSimple) return `[^${escape(values.join(""))}]`;

  return `(?:(?!${values.map(escape).join("|")}).)`;
}

function wrap(pre: string, pattern: string, post: string, modifier: string) {
  if (pre || post) {
    return `(?:${pre}(${pattern})${post})${modifier}`;
  }

  return `(${pattern})${modifier}`;
}
