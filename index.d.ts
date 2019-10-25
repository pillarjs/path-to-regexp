export function pathToRegexp (path: Path, keys?: Key[], options?: RegExpOptions & ParseOptions): RegExp;

export interface RegExpOptions {
  /**
   * When `true` the regexp will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
  /**
   * When `true` the regexp allows an optional trailing delimiter to match. (default: `false`)
   */
  strict?: boolean;
  /**
   * When `true` the regexp will match to the end of the string. (default: `true`)
   */
  end?: boolean;
  /**
   * When `true` the regexp will match from the beginning of the string. (default: `true`)
   */
  start?: boolean;
  /**
   * Sets the final character for non-ending optimistic matches. (default: `/`)
   */
  delimiter?: string;
  /**
   * List of characters that can also be "end" characters.
   */
  endsWith?: string | string[];
  /**
   * List of characters to consider delimiters when parsing. (default: `undefined`, any character)
   */
  whitelist?: string | string[];
}

export interface ParseOptions {
  /**
   * Set the default delimiter for repeat parameters. (default: `'/'`)
   */
  delimiter?: string;
}

export interface TokensToFunctionOptions {
  /**
   * When `true` the regexp will be case sensitive. (default: `false`)
   */
  sensitive?: boolean;
}

/**
 * Parse an Express-style path into an array of tokens.
 */
export function parse (path: string, options?: ParseOptions): Token[];

/**
 * Transforming an Express-style path into a valid path.
 */
export function compile <P extends object = object> (path: string, options?: ParseOptions & TokensToFunctionOptions): PathFunction<P>;

/**
 * Transform an array of tokens into a path generator function.
 */
export function tokensToFunction <P extends object = object> (tokens: Token[], options?: TokensToFunctionOptions): PathFunction<P>;

/**
 * Transform an array of tokens into a matching regular expression.
 */
export function tokensToRegExp (tokens: Token[], keys?: Key[], options?: RegExpOptions): RegExp;

export interface Key {
  name: string | number;
  prefix: string;
  delimiter: string;
  optional: boolean;
  repeat: boolean;
  pattern: string;
}

export interface PathFunctionOptions {
  /**
   * Function for encoding input strings for output.
   */
  encode?: (value: string, token: Key) => string;
  /**
   * When `false` the function can produce an invalid (unmatched) path. (default: `true`)
   */
  validate?: boolean;
}

export type Token = string | Key;
export type Path = string | RegExp | Array<string | RegExp>;
export type PathFunction <P extends object = object> = (data?: P, options?: PathFunctionOptions) => string;
