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
   * List of characters to automatically consider prefixes when parsing.
   */
  prefixes?: string;
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
   * Set characters to treat as "loose" and allow arbitrarily repeated. (default: `/`)
   */
  loose?: string;
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
   * Function for decoding strings for params.
   */
  decode?: Decode;
}

export interface CompileOptions extends ParseOptions {
  /**
   * When `true` the validation will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * Set characters to treat as "loose" and allow arbitrarily repeated. (default: `/`)
   */
  loose?: string;
  /**
   * When `false` the function can produce an invalid (unmatched) path. (default: `true`)
   */
  validate?: boolean;
  /**
   * Function for encoding input strings for output into the path. (default: `encodeURIComponent`)
   */
  encode?: Encode;
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
    throw new TypeError(`Unexpected ${nextType} at ${index}, expected ${type}`);
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
  const {
    prefixes = "./",
    delimiter = DEFAULT_DELIMITER,
    encodePath = NOOP_VALUE,
  } = options;
  const tokens: Token[] = [];
  const it = lexer(str);
  let key = 0;
  let path = "";

  do {
    const char = it.tryConsume("CHAR");
    const name = it.tryConsume("NAME");
    const pattern = it.tryConsume("PATTERN");

    if (name || pattern) {
      let prefix = char || "";
      const modifier = it.modifier();

      if (!prefixes.includes(prefix)) {
        path += prefix;
        prefix = "";
      }

      if (path) {
        tokens.push(encodePath(path));
        path = "";
      }

      tokens.push(
        toKey(
          encodePath,
          delimiter,
          name || String(key++),
          pattern,
          prefix,
          "",
          modifier,
        ),
      );
      continue;
    }

    const value = char || it.tryConsume("ESCAPED");
    if (value) {
      path += value;
      continue;
    }

    if (path) {
      tokens.push(encodePath(path));
      path = "";
    }

    const asterisk = it.tryConsume("*");
    if (asterisk) {
      tokens.push(
        toKey(
          encodePath,
          delimiter,
          String(key++),
          `[^${escape(delimiter)}]*`,
          "",
          "",
          asterisk,
        ),
      );
      continue;
    }

    const open = it.tryConsume("{");
    if (open) {
      const prefix = it.text();
      const name = it.tryConsume("NAME");
      const pattern = it.tryConsume("PATTERN");
      const suffix = it.text();

      it.consume("}");

      tokens.push(
        toKey(
          encodePath,
          delimiter,
          name || (pattern ? String(key++) : ""),
          pattern,
          prefix,
          suffix,
          it.modifier(),
        ),
      );
      continue;
    }

    it.consume("END");
    break;
  } while (true);

  return new TokenData(tokens, delimiter);
}

function toKey(
  encode: Encode,
  delimiter: string,
  name: string,
  pattern = "",
  inputPrefix = "",
  inputSuffix = "",
  modifier = "",
): Key {
  const prefix = encode(inputPrefix);
  const suffix = encode(inputSuffix);
  const separator =
    modifier === "*" || modifier === "+"
      ? prefix + suffix || delimiter
      : undefined;
  return { name, prefix, suffix, pattern, modifier, separator };
}

/**
 * Compile a string to a template function for the path.
 */
export function compile<P extends object = object>(
  value: Path,
  options: CompileOptions = {},
) {
  const data = value instanceof TokenData ? value : parse(value, options);
  return compileTokens<P>(data, options);
}

export type ParamData = Partial<Record<string, string | string[]>>;
export type PathFunction<P extends ParamData> = (data?: P) => string;

/**
 * Convert a single token into a path building function.
 */
function tokenToFunction(
  token: Token,
  encode: Encode,
): (data: ParamData) => string {
  if (typeof token === "string") {
    return () => token;
  }

  const optional = token.modifier === "?" || token.modifier === "*";

  if (token.separator) {
    const stringify = (value: string, index: number) => {
      if (typeof value !== "string") {
        throw new TypeError(`Expected "${token.name}/${index}" to be a string`);
      }
      return encode(value);
    };

    const compile = (value: unknown) => {
      if (!Array.isArray(value)) {
        throw new TypeError(`Expected "${token.name}" to be an array`);
      }

      if (value.length === 0) return "";

      return (
        token.prefix + value.map(stringify).join(token.separator) + token.suffix
      );
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
    return token.prefix + encode(value) + token.suffix;
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
    encode = NOOP_VALUE,
    validate = true,
    loose = DEFAULT_DELIMITER,
  } = options;
  const reFlags = flags(options);
  const stringify = toStringify(loose);
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
  str: Path,
  options: MatchOptions = {},
): MatchFunction<P> {
  const re = pathToRegexp(str, options);
  return matchRegexp<P>(re, options);
}

/**
 * Create a path match function from `path-to-regexp` output.
 */
function matchRegexp<P extends ParamData>(
  re: PathRegExp,
  options: MatchOptions,
): MatchFunction<P> {
  const { decode = NOOP_VALUE, loose = DEFAULT_DELIMITER } = options;
  const stringify = toStringify(loose);

  const decoders = re.keys.map((key) => {
    if (key.separator) {
      const re = new RegExp(stringify(key.separator), "g");

      return (value: string) => value.split(re).map(decode);
    }

    return decode;
  });

  return function match(pathname: string) {
    const m = re.exec(pathname);
    if (!m) return false;

    const { 0: path, index } = m;
    const params = Object.create(null);

    for (let i = 1; i < m.length; i++) {
      if (m[i] === undefined) continue;

      const key = re.keys[i - 1];
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
function toStringify(loose: string) {
  if (!loose) return escape;

  const re = new RegExp(`[^${escape(loose)}]+|(.)`, "g");
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
  prefix: string;
  suffix: string;
  pattern: string;
  modifier: string;
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
    start = true,
    end = true,
    loose = DEFAULT_DELIMITER,
  } = options;
  const stringify = toStringify(loose);
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

  if (trailing) {
    pattern += `(?:${stringify(data.delimiter)})${loose ? "?" : ""}`;
  }

  pattern += end ? "$" : `(?=${escape(data.delimiter)}|$)`;

  return new RegExp(pattern, flags(options));
}

/**
 * Convert a token into a regexp string (re-used for path validation).
 */
function toKeyRegexp(stringify: Encode, delimiter: string) {
  const segmentPattern = `[^${escape(delimiter)}]+?`;

  return (key: Key) => {
    const prefix = stringify(key.prefix);
    const suffix = stringify(key.suffix);

    if (key.name) {
      const pattern = key.pattern || segmentPattern;
      if (key.separator) {
        const mod = key.modifier === "*" ? "?" : "";
        const split = stringify(key.separator);
        return `(?:${prefix}((?:${pattern})(?:${split}(?:${pattern}))*)${suffix})${mod}`;
      } else {
        return `(?:${prefix}(${pattern})${suffix})${key.modifier}`;
      }
    }

    return `(?:${prefix}${suffix})${key.modifier}`;
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
