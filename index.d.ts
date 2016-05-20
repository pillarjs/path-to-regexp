declare function pathToRegexp (path: pathToRegexp.Path, options?: pathToRegexp.Options): pathToRegexp.PathRegExp;
declare function pathToRegexp (path: pathToRegexp.Path, keys: pathToRegexp.Token[], options?: pathToRegexp.Options): pathToRegexp.PathRegExp;

declare namespace pathToRegexp {
  export interface PathRegExp extends RegExp {
    // An array to be populated with the keys found in the path.
    keys: Key[];
  }

  export interface Options {
    // When `true` the route will be case sensitive. (default: `false`)
    sensitive?: boolean;
    // When `false` the trailing slash is optional. (default: `false`)
    strict?: boolean;
    // When `false` the path will match at the beginning. (default: `true`)
    end?: boolean;
  }

  /**
   * Parse an Express-style path into an array of tokens.
   */
  export function parse (path: string): Token[];

  /**
   * Transforming an Express-style path into a valid path.
   */
  export function compile (path: string): PathFunction;

  /**
   * Transform an array of tokens into a path generator function.
   */
  export function tokensToFunction (tokens: Token[]): PathFunction;

  /**
   * Transform an array of tokens into a matching regular expression.
   */
  export function tokensToRegExp (tokens: Token[], options?: Options): PathRegExp;

  export interface Key {
    name: string | number;
    prefix: string;
    delimiter: string;
    optional: boolean;
    repeat: boolean;
    pattern: string;
    partial: boolean;
    asterisk: boolean;
  }

  interface PathFunctionOptions {
    pretty?: boolean;
  }

  export type Token = string | Key;
  export type Path = string | RegExp | Array<string | RegExp>;
  export type PathFunction = (data?: Object, options?: PathFunctionOptions) => string;
}

export = pathToRegexp;
