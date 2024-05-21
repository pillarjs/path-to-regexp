const DEFAULT_PREFIXES = "./";
const DEFAULT_DELIMITER = "/";
const NOOP_ENCODE = (x: string) => x;
const NOOP_DECODE = (x: string) => x;

const GROUPS_RE = /\((?:\?<(.*?)>)?(?!\?)/g;

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
    | "END";
  index: number;
  value: string;
}

/**
 * Tokenize input string.
 */
function lexer(str: string) {
  const tokens: LexToken[] = [];
  let i = 0;

  while (i < str.length) {
    const char = str[i];

    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }

    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }

    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }

    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }

    if (char === ":") {
      let name = "";
      let j = i + 1;

      while (j < str.length) {
        const code = str.charCodeAt(j);

        if (
          // `0-9`
          (code >= 48 && code <= 57) ||
          // `A-Z`
          (code >= 65 && code <= 90) ||
          // `a-z`
          (code >= 97 && code <= 122) ||
          // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }

        break;
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

      if (str[j] === "?") {
        throw new TypeError(`Pattern cannot start with "?" at ${j}`);
      }

      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }

        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError(`Capturing groups are not allowed at ${j}`);
          }
        }

        pattern += str[j++];
      }

      if (count) throw new TypeError(`Unbalanced pattern at ${i}`);
      if (!pattern) throw new TypeError(`Missing pattern at ${i}`);

      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }

    tokens.push({ type: "CHAR", index: i, value: str[i++] });
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
  encode?: Encode;
}

/**
 * Parse a string for the raw tokens.
 */
export function parse(str: string, options: ParseOptions = {}): Token[] {
  const {
    prefixes = DEFAULT_PREFIXES,
    delimiter = DEFAULT_DELIMITER,
    encode = NOOP_ENCODE,
  } = options;
  const defaultPattern = `[^${escape(delimiter)}]+?`;
  const result: Token[] = [];
  const tokens = lexer(str);
  const stringify = encoder(delimiter, encode, NOOP_ENCODE);
  let key = 0;
  let path = "";

  do {
    const char = tokens.tryConsume("CHAR");
    const name = tokens.tryConsume("NAME");
    const pattern = tokens.tryConsume("PATTERN");
    const modifier = tokens.tryConsume("MODIFIER");

    if (name || pattern || modifier) {
      let prefix = char || "";

      if (!prefixes.includes(prefix)) {
        path += prefix;
        prefix = "";
      }

      if (path) {
        result.push(stringify(path));
        path = "";
      }

      result.push({
        name: name || key++,
        prefix: stringify(prefix),
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: modifier || "",
      });
      continue;
    }

    const value = char || tokens.tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }

    if (path) {
      result.push(stringify(path));
      path = "";
    }

    const open = tokens.tryConsume("OPEN");
    if (open) {
      const prefix = tokens.text();
      const name = tokens.tryConsume("NAME") || "";
      const pattern = tokens.tryConsume("PATTERN") || "";
      const suffix = tokens.text();

      tokens.consume("CLOSE");

      result.push({
        name: name || (pattern ? key++ : ""),
        pattern: name && !pattern ? defaultPattern : pattern,
        prefix: stringify(prefix),
        suffix: stringify(suffix),
        modifier: tokens.tryConsume("MODIFIER") || "",
      });
      continue;
    }

    tokens.consume("END");
    break;
  } while (true);

  return result;
}

export type Encode = (value: string) => string;

export interface TokensToFunctionOptions {
  /**
   * When `true` the regexp will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * When `false` the function can produce an invalid (unmatched) path. (default: `true`)
   */
  validate?: boolean;
  /**
   * Function for encoding input strings for output.
   */
  encode?: Encode;
}

/**
 * Compile a string to a template function for the path.
 */
export function compile<P extends object = object>(
  value: string,
  options?: ParseOptions & TokensToFunctionOptions,
) {
  return tokensToFunction<P>(parse(value, options), options);
}

export type PathFunction<P extends object = object> = (data?: P) => string;

/**
 * Transform tokens into a path building function.
 */
export function tokensToFunction<P extends object = object>(
  tokens: Token[],
  options: TokensToFunctionOptions = {},
): PathFunction<P> {
  const reFlags = flags(options);
  const { encode = NOOP_ENCODE, validate = true } = options;

  // Compile all the tokens into regexps.
  const matches = tokens.map((token) => {
    if (typeof token === "object") {
      return new RegExp(`^(?:${token.pattern})$`, reFlags);
    }
  });

  return function path(data: Record<string, any> | undefined) {
    let path = "";

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (typeof token === "string") {
        path += token;
        continue;
      }

      const value = data ? data[token.name] : undefined;
      const optional = token.modifier === "?" || token.modifier === "*";
      const repeat = token.modifier === "*" || token.modifier === "+";

      if (Array.isArray(value)) {
        if (!repeat) {
          throw new TypeError(
            `Expected "${token.name}" to not repeat, but got an array`,
          );
        }

        if (value.length === 0) {
          if (optional) continue;

          throw new TypeError(`Expected "${token.name}" to not be empty`);
        }

        for (let j = 0; j < value.length; j++) {
          const segment = encode(value[j]);

          if (validate && !(matches[i] as RegExp).test(segment)) {
            throw new TypeError(
              `Expected all "${token.name}" to match "${token.pattern}", but got "${segment}"`,
            );
          }

          path += token.prefix + segment + token.suffix;
        }

        continue;
      }

      if (typeof value === "string" || typeof value === "number") {
        const segment = encode(String(value));

        if (validate && !(matches[i] as RegExp).test(segment)) {
          throw new TypeError(
            `Expected "${token.name}" to match "${token.pattern}", but got "${segment}"`,
          );
        }

        path += token.prefix + segment + token.suffix;
        continue;
      }

      if (optional) continue;

      const typeOfMessage = repeat ? "an array" : "a string";
      throw new TypeError(`Expected "${token.name}" to be ${typeOfMessage}`);
    }

    return path;
  };
}

/**
 * A match result contains data about the path match.
 */
export interface MatchResult<P extends object = object> {
  path: string;
  index: number;
  params: P;
}

/**
 * A match is either `false` (no match) or a match result.
 */
export type Match<P extends object = object> = false | MatchResult<P>;

/**
 * The match function takes a string and returns whether it matched the path.
 */
export type MatchFunction<P extends object = object> = (
  path: string,
) => Match<P>;

/**
 * Create path match function from `path-to-regexp` spec.
 */
export function match<P extends object = object>(
  str: Path,
  options?: ParseOptions & TokensToRegexpOptions & RegexpToFunctionOptions,
) {
  const keys: Key[] = [];
  const re = pathToRegexp(str, keys, options);
  return regexpToFunction<P>(re, keys, options);
}

export interface RegexpToFunctionOptions {
  /**
   * Function for decoding strings for params.
   */
  decode?: (value: string) => string;
}

/**
 * Create a path match function from `path-to-regexp` output.
 */
export function regexpToFunction<P extends object = object>(
  re: RegExp,
  keys: Key[],
  options: RegexpToFunctionOptions = {},
): MatchFunction<P> {
  const { decode = NOOP_DECODE } = options;
  const decoders = keys.map((key) => {
    if (key.split) {
      const re = new RegExp(`(${key.pattern})(?:${key.split}|$)`, "g");
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
function encoder(
  delimiter: string,
  encodeString: Encode,
  encodeDelimiter: Encode,
) {
  const re = new RegExp(`[^${escape(delimiter)}]+|(.)`, "g");
  const replacer = (value: string, delimiter: string) =>
    delimiter ? encodeDelimiter(value) : encodeString(value);
  return (value: string) => value.replace(re, replacer);
}

/**
 * Get the flags for a regexp from the options.
 */
function flags(options: { sensitive?: boolean }) {
  return options.sensitive ? "" : "i";
}

export interface TokenKey {
  name: string | number;
  prefix: string;
  suffix: string;
  pattern: string;
  modifier: string;
}

/**
 * A token is a string (nothing special) or key metadata (capture group).
 */
export type Token = string | TokenKey;

/**
 * Metadata about a key.
 */
export interface Key extends TokenKey {
  /**
   * Internal flag indicating the key needs to be split for the match.
   */
  split?: string;
}

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
  paths: Array<string | RegExp>,
  keys: Key[],
  options: TokensToRegexpOptions & ParseOptions,
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
  options: TokensToRegexpOptions & ParseOptions,
) {
  return tokensToRegexp(parse(path, options), keys, options);
}

export interface TokensToRegexpOptions {
  /**
   * When `true` the regexp will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * When `true` the regexp allows an optional trailing delimiter to match. (default: `true`)
   */
  trailing?: boolean;
  /**
   * When `true` all delimiters can be repeated one or more times. (default: `true`)
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
   * Sets the final character for non-ending optimistic matches. (default: `"/"`)
   */
  delimiter?: string;
}

/**
 * Expose a function for taking tokens and returning a RegExp.
 */
export function tokensToRegexp(
  tokens: Token[],
  keys: Key[] = [],
  options: TokensToRegexpOptions = {},
): RegExp {
  const {
    trailing = true,
    loose = true,
    start = true,
    end = true,
    delimiter = DEFAULT_DELIMITER,
  } = options;
  const delimiterRe = escape(delimiter);
  const stringify = loose ? encoder(delimiter, escape, repeat) : escape;
  let pattern = start ? "^" : "";

  // Iterate over the tokens and create our regexp string.
  for (const token of tokens) {
    if (typeof token === "string") {
      pattern += stringify(token);
    } else {
      const prefix = stringify(token.prefix);
      const suffix = stringify(token.suffix);

      if (token.pattern) {
        if (token.modifier === "+" || token.modifier === "*") {
          const mod = token.modifier === "*" ? "?" : "";
          const split = `${suffix}${prefix}` || delimiterRe; // Fallback to split on delimiter.
          keys.push(Object.assign({}, token, { split }));
          pattern += `(?:${prefix}((?:${token.pattern})(?:${split}(?:${token.pattern}))*)${suffix})${mod}`;
        } else {
          keys.push(token);
          pattern += `(?:${prefix}(${token.pattern})${suffix})${token.modifier}`;
        }
      } else {
        pattern += `(?:${prefix}${suffix})${token.modifier}`;
      }
    }
  }

  if (trailing) pattern += `${delimiterRe}${loose ? "*" : "?"}`;
  pattern += end ? "$" : `(?=${delimiterRe}|$)`;

  return new RegExp(pattern, flags(options));
}

/**
 * Supported `path-to-regexp` input types.
 */
export type Path = string | RegExp | Array<string | RegExp>;

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
  options: TokensToRegexpOptions & ParseOptions = {},
) {
  if (path instanceof RegExp) return regexpToRegexp(path, keys);
  if (Array.isArray(path)) return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
