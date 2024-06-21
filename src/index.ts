const DEFAULT_DELIMITER = "/";
const NOOP_VALUE = (value: string) => value;
const ID_CHAR = /^\p{XID_Continue}$/u;

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
   * Set the default delimiter for repeat parameters. (default: `'/'`)
   */
  delimiter?: string;
  /**
   * Function for encoding input strings for output into path.
   */
  encodePath?: Encode;
}

export interface PathToRegexpOptions extends ParseOptions {
  /**
   * When `true` the regexp will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * Allow delimiter to be arbitrarily repeated. (default: `true`)
   */
  loose?: boolean;
  /**
   * When `true` the regexp will match to the end of the string. (default: `true`)
   */
  end?: boolean;
  /**
   * When `true` the regexp will match from the beginning of the string. (default: `true`)
   */
  start?: boolean;
  /**
   * When `true` the regexp allows an optional trailing delimiter to match. (default: `true`)
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
   * When `true` the validation will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * Allow delimiter to be arbitrarily repeated. (default: `true`)
   */
  loose?: boolean;
  /**
   * When `false` the function can produce an invalid (unmatched) path. (default: `true`)
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
  | ","
  | ";";

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
      `Unexpected ${nextType} at ${index}, expected ${type}: https://git.new/pathToRegexpError`,
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

  modifier(): string {
    return (
      this.tryConsume("?") || this.tryConsume("*") || this.tryConsume("+") || ""
    );
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
  const { delimiter = DEFAULT_DELIMITER, encodePath = NOOP_VALUE } = options;
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
          `Unexpected * at ${next.index}, you probably want \`/*\` or \`{/:foo}*\`: https://git.new/pathToRegexpError`,
        );
      }

      continue;
    }

    const asterisk = it.tryConsume("*");
    if (asterisk) {
      tokens.push({
        name: String(key++),
        pattern: `[^${escape(delimiter)}]*`,
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
      const separator = it.tryConsume(";") ? it.text() : prefix + suffix;

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
  const { prefix = "", suffix = "", separator = "" } = token;

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
  } = options;
  const reFlags = flags(options);
  const stringify = toStringify(loose, data.delimiter);
  const keyToRegexp = toKeyRegexp(stringify, data.delimiter);

  // Compile all the tokens into regexps.
  const encoders: Array<(data: ParamData) => string> = data.tokens.map(
    (token) => {
      const fn = tokenToFunction(token, encode);
      if (!validate || typeof token === "string") return fn;

      const pattern = keyToRegexp(token);
      const validRe = new RegExp(`^${pattern}$`, reFlags);

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
      const re = new RegExp(stringify(key.separator || ""), "g");
      return (value: string) => value.split(re).map(decode);
    }

    return decode || NOOP_VALUE;
  });

  return function match(pathname: string) {
    const m = re.exec(pathname);
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
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}

/**
 * Escape and repeat loose characters for regular expressions.
 */
function looseReplacer(value: string, loose: string) {
  return loose ? `${escape(value)}+` : escape(value);
}

/**
 * Encode all non-delimiter characters using the encode function.
 */
function toStringify(loose: boolean, delimiter: string) {
  if (!loose) return escape;

  const re = new RegExp(`[^${escape(delimiter)}]+|(.)`, "g");
  return (value: string) => value.replace(re, looseReplacer);
}

/**
 * Get the flags for a regexp from the options.
 */
function flags(options: { sensitive?: boolean }) {
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
  const { trailing = true, start = true, end = true, loose = true } = options;
  const stringify = toStringify(loose, data.delimiter);
  const keyToRegexp = toKeyRegexp(stringify, data.delimiter);
  let pattern = start ? "^" : "";

  for (const token of data.tokens) {
    if (typeof token === "string") {
      pattern += stringify(token);
    } else {
      if (token.name) keys.push(token);
      pattern += keyToRegexp(token);
    }
  }

  if (trailing) pattern += `(?:${stringify(data.delimiter)})?`;
  pattern += end ? "$" : `(?=${escape(data.delimiter)}|$)`;

  return new RegExp(pattern, flags(options));
}

/**
 * Convert a token into a regexp string (re-used for path validation).
 */
function toKeyRegexp(stringify: Encode, delimiter: string) {
  const segmentPattern = `[^${escape(delimiter)}]+?`;

  return (key: Key) => {
    const prefix = key.prefix ? stringify(key.prefix) : "";
    const suffix = key.suffix ? stringify(key.suffix) : "";
    const modifier = key.modifier || "";

    if (key.name) {
      const pattern = key.pattern || segmentPattern;
      if (key.modifier === "+" || key.modifier === "*") {
        const mod = key.modifier === "*" ? "?" : "";
        const split = key.separator ? stringify(key.separator) : "";
        return `(?:${prefix}((?:${pattern})(?:${split}(?:${pattern}))*)${suffix})${mod}`;
      }
      return `(?:${prefix}(${pattern})${suffix})${modifier}`;
    }

    return `(?:${prefix}${suffix})${modifier}`;
  };
}

/**
 * Repeated and simple input types.
 */
export type Path = string | TokenData;

export type PathRegExp = RegExp & { keys: Key[] };

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
