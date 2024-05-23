const DEFAULT_PREFIXES = "./";
const DEFAULT_DELIMITER = "/";
const GROUPS_RE = /\((?:\?<(.*?)>)?(?!\?)/g;
const NOOP_VALUE = (value: string) => value;
const NAME_RE = /^[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}$]$/u;

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

/**
 * Tokenizer results.
 */
interface LexToken {
  type:
    | "OPEN"
    | "CLOSE"
    | "PATTERN"
    | "NAME"
    | "CHAR"
    | "ESCAPED_CHAR"
    | "MODIFIER"
    | "RESERVED"
    | "END";
  index: number;
  value: string;
}

/**
 * Tokenize input string.
 */
function lexer(str: string) {
  const chars = [...str];
  const tokens: LexToken[] = [];
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];

    if (char === "!" || char === ";" || char === "|") {
      tokens.push({ type: "RESERVED", index: i, value: chars[i++] });
      continue;
    }

    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: chars[i++] });
      continue;
    }

    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: chars[i++] });
      continue;
    }

    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: chars[i++] });
      continue;
    }

    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: chars[i++] });
      continue;
    }

    if (char === ":") {
      let name = "";
      let j = i + 1;

      while (NAME_RE.test(chars[j])) {
        name += chars[j++];
      }

      if (!name) throw new TypeError(`Missing parameter name at ${i}`);

      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }

    if (char === "(") {
      let count = 1;
      let pattern = "";
      let j = i + 1;

      if (chars[j] === "?") {
        throw new TypeError(`Pattern cannot start with "?" at ${j}`);
      }

      while (j < chars.length) {
        if (chars[j] === "\\") {
          pattern += chars[j++] + chars[j++];
          continue;
        }

        if (chars[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (chars[j] === "(") {
          count++;
          if (chars[j + 1] !== "?") {
            throw new TypeError(`Capturing groups are not allowed at ${j}`);
          }
        }

        pattern += chars[j++];
      }

      if (count) throw new TypeError(`Unbalanced pattern at ${i}`);
      if (!pattern) throw new TypeError(`Missing pattern at ${i}`);

      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
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
    while (
      (value = this.tryConsume("CHAR") || this.tryConsume("ESCAPED_CHAR"))
    ) {
      result += value;
    }
    return result;
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
    prefixes = DEFAULT_PREFIXES,
    delimiter = DEFAULT_DELIMITER,
    encodePath = NOOP_VALUE,
  } = options;
  const defaultPattern = `[^${escape(delimiter)}]+?`;
  const tokens: Token[] = [];
  const iter = lexer(str);
  let key = 0;
  let path = "";

  do {
    const char = iter.tryConsume("CHAR");
    const name = iter.tryConsume("NAME");
    const pattern = iter.tryConsume("PATTERN");
    const modifier = iter.tryConsume("MODIFIER");

    if (name || pattern || modifier) {
      let prefix = char || "";

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
          name || key++,
          pattern || defaultPattern,
          prefix,
          "",
          modifier,
        ),
      );
      continue;
    }

    const value = char || iter.tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }

    if (path) {
      tokens.push(encodePath(path));
      path = "";
    }

    const open = iter.tryConsume("OPEN");
    if (open) {
      const prefix = iter.text();
      const name = iter.tryConsume("NAME");
      const pattern = iter.tryConsume("PATTERN");
      const suffix = iter.text();

      iter.consume("CLOSE");

      const modifier = iter.tryConsume("MODIFIER");

      // TODO: Create non-matching version of keys to switch on/off in `compile`.
      // TODO: Make optional trailing `/` a version of this so the info is in the "token".
      tokens.push(
        toKey(
          encodePath,
          delimiter,
          name || (pattern ? key++ : ""),
          name && !pattern ? defaultPattern : pattern || "",
          prefix,
          suffix,
          modifier,
        ),
      );
      continue;
    }

    iter.consume("END");
    break;
  } while (true);

  return new TokenData(tokens, delimiter);
}

function toKey(
  encode: Encode,
  delimiter: string,
  name: string | number,
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
  value: string | TokenData,
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
    encode = encodeURIComponent,
    validate = true,
    loose = DEFAULT_DELIMITER,
  } = options;
  const reFlags = flags(options);
  const stringify = toStringify(loose);

  // Compile all the tokens into regexps.
  const encoders: Array<(data: ParamData) => string> = data.tokens.map(
    (token) => {
      const fn = tokenToFunction(token, encode);
      if (!validate || typeof token === "string") return fn;

      const pattern = keyToRegexp(token, stringify);
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
  const keys: Key[] = [];
  const re = pathToRegexp(str, keys, options);
  return matchRegexp<P>(re, keys, options);
}

/**
 * Create a path match function from `path-to-regexp` output.
 */
function matchRegexp<P extends ParamData>(
  re: RegExp,
  keys: Key[],
  options: MatchOptions,
): MatchFunction<P> {
  const { decode = decodeURIComponent, loose = DEFAULT_DELIMITER } = options;
  const stringify = toStringify(loose);

  const decoders = keys.map((key) => {
    if (key.separator) {
      const re = new RegExp(
        `(${key.pattern})(?:${stringify(key.separator)}|$)`,
        "g",
      );

      return (value: string) => {
        const result: string[] = [];
        for (const m of value.matchAll(re)) result.push(decode(m[1]));
        return result;
      };
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
 * Escape and repeat a string for regular expressions.
 */
function repeat(str: string) {
  return `${escape(str)}+`;
}

/**
 * Encode all non-delimiter characters using the encode function.
 */
function toStringify(loose: string) {
  if (loose) {
    const re = new RegExp(`[^${escape(loose)}]+|(.)`, "g");
    const replacer = (value: string, loose: string) =>
      loose ? repeat(value) : escape(value);
    return (value: string) => value.replace(re, replacer);
  }

  return escape;
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
  name: string | number;
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
 * Pull out keys from a regexp.
 */
function regexpToRegexp(path: RegExp, keys: Key[]): RegExp {
  if (!keys) return path;

  let index = 0;
  for (const execResult of path.source.matchAll(GROUPS_RE)) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise.
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: "",
    });
  }

  return path;
}

/**
 * Transform an array into a regexp.
 */
function arrayToRegexp(
  paths: PathItem[],
  keys: Key[],
  options: PathToRegexpOptions,
): RegExp {
  const parts = paths.map((path) => pathToRegexp(path, keys, options).source);
  return new RegExp(`(?:${parts.join("|")})`, flags(options));
}

/**
 * Create a path regexp from string input.
 */
function stringToRegexp(
  path: string,
  keys: Key[],
  options: PathToRegexpOptions,
) {
  return tokensToRegexp(parse(path, options), keys, options);
}

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
  let pattern = start ? "^" : "";

  for (const token of data.tokens) {
    if (typeof token === "string") {
      pattern += stringify(token);
    } else {
      if (token.pattern) keys.push(token);
      pattern += keyToRegexp(token, stringify);
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
function keyToRegexp(key: Key, stringify: Encode): string {
  const prefix = stringify(key.prefix);
  const suffix = stringify(key.suffix);

  if (key.pattern) {
    if (key.separator) {
      const mod = key.modifier === "*" ? "?" : "";
      const split = stringify(key.separator);
      return `(?:${prefix}((?:${key.pattern})(?:${split}(?:${key.pattern}))*)${suffix})${mod}`;
    } else {
      return `(?:${prefix}(${key.pattern})${suffix})${key.modifier}`;
    }
  } else {
    return `(?:${prefix}${suffix})${key.modifier}`;
  }
}

/**
 * Simple input types.
 */
export type PathItem = string | RegExp | TokenData;

/**
 * Repeated and simple input types.
 */
export type Path = PathItem | PathItem[];

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 */
export function pathToRegexp(
  path: Path,
  keys: Key[] = [],
  options: PathToRegexpOptions = {},
) {
  if (path instanceof TokenData) return tokensToRegexp(path, keys, options);
  if (path instanceof RegExp) return regexpToRegexp(path, keys);
  if (Array.isArray(path)) return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
