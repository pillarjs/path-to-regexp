const DEFAULT_DELIMITER = "/";
const NOOP_VALUE = (value: string) => value;
const ID_CHAR = /^\p{XID_Continue}$/u;
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

export interface PathToRegexpOptions extends ParseOptions {
  /**
   * Regexp will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * Allow the delimiter to be arbitrarily repeated. (default: `true`)
   */
  loose?: boolean;
  /**
   * Verify patterns are valid and safe to use. (default: `false`)
   */
  strict?: boolean;
  /**
   * Match from the beginning of the string. (default: `true`)
   */
  start?: boolean;
  /**
   * Match to the end of the string. (default: `true`)
   */
  end?: boolean;
  /**
   * Allow optional trailing delimiter to match. (default: `true`)
   */
  trailing?: boolean;
}

export interface MatchOptions extends PathToRegexpOptions {
  /**
   * Function for decoding strings for params, or `false` to disable entirely. (default: `decodeURIComponent`)
   */
  decode?: Decode | false;
}

export interface CompileOptions extends ParseOptions {
  /**
   * Regexp will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * Allow the delimiter to be arbitrarily repeated. (default: `true`)
   */
  loose?: boolean;
  /**
   * Verify patterns are valid and safe to use. (default: `false`)
   */
  strict?: boolean;
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

      while (ID_CHAR.test(chars[++i])) {
        name += chars[i];
      }

      if (!name) {
        throw new TypeError(`Missing parameter name at ${i}`);
      }

      tokens.push({ type: "NAME", index: i, value: name });
      continue;
    }

    if (value === "(") {
      const pos = i++;
      let count = 1;
      let pattern = "";

      if (chars[i] === "?") {
        throw new TypeError(`Pattern cannot start with "?" at ${i}`);
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
            throw new TypeError(`Capturing groups are not allowed at ${i}`);
          }
        }

        pattern += chars[i++];
      }

      if (count) throw new TypeError(`Unbalanced pattern at ${pos}`);
      if (!pattern) throw new TypeError(`Missing pattern at ${pos}`);

      tokens.push({ type: "PATTERN", index: i, value: pattern });
      continue;
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
        pattern: `(?:(?!${escape(delimiter)}).)*`,
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
  path: Path,
  options: CompileOptions = {},
) {
  const data = path instanceof TokenData ? path : parse(path, options);
  return compileTokens<P>(data, options);
}

export type ParamData = Partial<Record<string, string | string[]>>;
export type PathFunction<P extends ParamData> = (data?: P) => string;

/**
 * Convert a single token into a path building function.
 */
function tokenToFunction(
  token: Token,
  encode: Encode | false,
): (data: ParamData) => string {
  if (typeof token === "string") {
    return () => token;
  }

  const encodeValue = encode || NOOP_VALUE;
  const repeated = token.modifier === "+" || token.modifier === "*";
  const optional = token.modifier === "?" || token.modifier === "*";
  const { prefix = "", suffix = "", separator = suffix + prefix } = token;

  if (encode && repeated) {
    const stringify = (value: string, index: number) => {
      if (typeof value !== "string") {
        throw new TypeError(`Expected "${token.name}/${index}" to be a string`);
      }
      return encodeValue(value);
    };

    const compile = (value: unknown) => {
      if (!Array.isArray(value)) {
        throw new TypeError(`Expected "${token.name}" to be an array`);
      }

      if (value.length === 0) return "";

      return prefix + value.map(stringify).join(separator) + suffix;
    };

    if (optional) {
      return (data): string => {
        const value = data[token.name];
        if (value == null) return "";
        return value.length ? compile(value) : "";
      };
    }

    return (data): string => {
      const value = data[token.name];
      return compile(value);
    };
  }

  const stringify = (value: unknown) => {
    if (typeof value !== "string") {
      throw new TypeError(`Expected "${token.name}" to be a string`);
    }
    return prefix + encodeValue(value) + suffix;
  };

  if (optional) {
    return (data): string => {
      const value = data[token.name];
      if (value == null) return "";
      return stringify(value);
    };
  }

  return (data): string => {
    const value = data[token.name];
    return stringify(value);
  };
}

/**
 * Transform tokens into a path building function.
 */
function compileTokens<P extends ParamData>(
  data: TokenData,
  options: CompileOptions,
): PathFunction<P> {
  const {
    encode = encodeURIComponent,
    loose = true,
    validate = true,
    strict = false,
  } = options;
  const flags = toFlags(options);
  const stringify = toStringify(loose, data.delimiter);
  const sources = toRegExpSource(data, stringify, [], flags, strict);

  // Compile all the tokens into regexps.
  const encoders: Array<(data: ParamData) => string> = data.tokens.map(
    (token, index) => {
      const fn = tokenToFunction(token, encode);
      if (!validate || typeof token === "string") return fn;

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
  index: number;
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
export function match<P extends ParamData>(
  path: Path,
  options: MatchOptions = {},
): MatchFunction<P> {
  const { decode = decodeURIComponent, loose = true } = options;
  const data = path instanceof TokenData ? path : parse(path, options);
  const stringify = toStringify(loose, data.delimiter);
  const keys: Key[] = [];
  const re = tokensToRegexp(data, keys, options);

  const decoders = keys.map((key) => {
    if (decode && (key.modifier === "+" || key.modifier === "*")) {
      const { prefix = "", suffix = "", separator = suffix + prefix } = key;
      const re = new RegExp(stringify(separator), "g");
      return (value: string) => value.split(re).map(decode);
    }

    return decode || NOOP_VALUE;
  });

  return function match(input: string) {
    const m = re.exec(input);
    if (!m) return false;

    const { 0: path, index } = m;
    const params = Object.create(null);

    for (let i = 1; i < m.length; i++) {
      if (m[i] === undefined) continue;

      const key = keys[i - 1];
      const decoder = decoders[i - 1];
      params[key.name] = decoder(m[i]);
    }

    return { path, index, params };
  };
}

/**
 * Escape a regular expression string.
 */
function escape(str: string) {
  return str.replace(/([.+*?^${}()[\]|/\\])/g, "\\$1");
}

/**
 * Escape and repeat loose characters for regular expressions.
 */
function looseReplacer(value: string, loose: string) {
  const escaped = escape(value);
  return loose ? `(?:${escaped})+(?!${escaped})` : escaped;
}

/**
 * Encode all non-delimiter characters using the encode function.
 */
function toStringify(loose: boolean, delimiter: string) {
  if (!loose) return escape;

  const re = new RegExp(`(?:(?!${escape(delimiter)}).)+|(.)`, "g");
  return (value: string) => value.replace(re, looseReplacer);
}

/**
 * Get the flags for a regexp from the options.
 */
function toFlags(options: { sensitive?: boolean }) {
  return options.sensitive ? "" : "i";
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
 * Expose a function for taking tokens and returning a RegExp.
 */
function tokensToRegexp(
  data: TokenData,
  keys: Key[],
  options: PathToRegexpOptions,
): RegExp {
  const {
    trailing = true,
    loose = true,
    start = true,
    end = true,
    strict = false,
  } = options;
  const flags = toFlags(options);
  const stringify = toStringify(loose, data.delimiter);
  const sources = toRegExpSource(data, stringify, keys, flags, strict);
  let pattern = start ? "^" : "";
  pattern += sources.join("");
  if (trailing) pattern += `(?:${stringify(data.delimiter)})?`;
  pattern += end ? "$" : `(?=${escape(data.delimiter)}|$)`;

  return new RegExp(pattern, flags);
}

/**
 * Convert a token into a regexp string (re-used for path validation).
 */
function toRegExpSource(
  data: TokenData,
  stringify: Encode,
  keys: Key[],
  flags: string,
  strict: boolean,
): string[] {
  const defaultPattern = `(?:(?!${escape(data.delimiter)}).)+?`;
  let backtrack = "";
  let safe = true;

  return data.tokens.map((token, index) => {
    if (typeof token === "string") {
      backtrack = token;
      return stringify(token);
    }

    const {
      prefix = "",
      suffix = "",
      separator = suffix + prefix,
      modifier = "",
    } = token;

    const pre = stringify(prefix);
    const post = stringify(suffix);

    if (token.name) {
      const pattern = token.pattern ? `(?:${token.pattern})` : defaultPattern;
      const re = checkPattern(pattern, token.name, flags);

      safe ||= safePattern(re, prefix || backtrack);
      if (!safe) {
        throw new TypeError(
          `Ambiguous pattern for "${token.name}": ${DEBUG_URL}`,
        );
      }
      safe = !strict || safePattern(re, suffix);
      backtrack = "";

      keys.push(token);

      if (modifier === "+" || modifier === "*") {
        const mod = modifier === "*" ? "?" : "";
        const sep = stringify(separator);

        if (!sep) {
          throw new TypeError(
            `Missing separator for "${token.name}": ${DEBUG_URL}`,
          );
        }

        safe ||= !strict || safePattern(re, separator);
        if (!safe) {
          throw new TypeError(
            `Ambiguous pattern for "${token.name}" separator: ${DEBUG_URL}`,
          );
        }
        safe = !strict;

        return `(?:${pre}(${pattern}(?:${sep}${pattern})*)${post})${mod}`;
      }

      return `(?:${pre}(${pattern})${post})${modifier}`;
    }

    return `(?:${pre}${post})${modifier}`;
  });
}

function checkPattern(pattern: string, name: string, flags: string) {
  try {
    return new RegExp(`^${pattern}$`, flags);
  } catch (err: any) {
    throw new TypeError(`Invalid pattern for "${name}": ${err.message}`);
  }
}

function safePattern(re: RegExp, value: string) {
  return value ? !re.test(value) : false;
}

/**
 * Repeated and simple input types.
 */
export type Path = string | TokenData;

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 */
export function pathToRegexp(path: Path, options: PathToRegexpOptions = {}) {
  const data = path instanceof TokenData ? path : parse(path, options);
  const keys: Key[] = [];
  const regexp = tokensToRegexp(data, keys, options);
  return Object.assign(regexp, { keys });
}
