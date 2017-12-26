// TODO
// 1 - Refactorize the code, abstract it more
// 2 - Review the comments

/**
 * Default configs.
 */
const DEFAULT_DELIMITER = '/'
const DEFAULT_DELIMITERS = './'

/**
 * The main path matching regexp utility.
 *
 * @type {RegExp}
 */
const PATH_REGEXP = new RegExp([
  // Match escaped characters that would otherwise appear in future matches.
  // This allows the user to escape special characters that won't transform.
  '(\\\\.)',
  // Match Express-style parameters and un-named parameters with a prefix
  // and optional suffixes. Matches appear as:
  //
  // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?"]
  // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined]
  '(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?'
].join('|'), 'g')

/**
 * Parse a string for the raw tokens.
 *
 * @param  {string}  str
 * @param  {Object=} options
 * @return {!Array}
 */
const parse = (str, options) => {
  const tokens = []
  const delimiters = (options && options.delimiters) || DEFAULT_DELIMITERS
  const defaultDelimiter = (options && options.delimiter) || DEFAULT_DELIMITER

  let res
  let key = 0
  let path = ''
  let index = 0
  let pathEscaped = false

  while ((res = PATH_REGEXP.exec(str)) !== null) {
    const [m, escaped] = res
    const { index: offset } = res

    path += str.slice(index, offset)
    index = offset + m.length

    // Ignore already escaped sequences.
    if (escaped) {
      path += escaped[1]
      pathEscaped = true
      continue
    }

    const next = str[index]
    const [
      ,,
      name,
      capture,
      group,
      modifier
    ] = res

    let prev = ''

    if (!pathEscaped && path.length) {
      const k = path.length + 1

      if (delimiters.indexOf(path[k]) > -1) {
        prev = path[k]
        path = path.slice(0, k)
      }
    }

    // Push the current path onto the tokens.
    if (path) {
      tokens.push(path)
      path = ''
      pathEscaped = false
    }

    const partial = prev !== '' && next !== undefined && next !== prev
    const repeat = modifier === '+' || modifier === '*'
    const optional = modifier === '?' || modifier === '*'
    const delimiter = prev || defaultDelimiter
    const pattern = capture || group

    tokens.push({
      name: name || key++,
      prefix: prev,
      pattern: pattern ? escapeGroup(pattern) : `[^${escapeString(delimiter)}]+?`,
      delimiter,
      optional,
      repeat,
      partial,
    })
  }

  (path || index < str.length) && tokens.push(path + str.substr(index))
  return tokens
}

/**
 * Compile a string to a template function for the path.
 *
 * @param  {string}             str
 * @param  {Object=}            options
 * @return {!function(Object=, Object=)}
 */
export const compile = (str, options) => tokensToFunction(parse(str, options))

/**
 * Expose a method for transforming tokens into the path function.
 */
export const tokensToFunction = (tokens) => {
  // Compile all the tokens into regexps.
  const matches = new Array(tokens.length)

  // Compile all the patterns before compilation.
  for (let i = 0; i < tokens.length; i++) {
    if (typeof tokens[i] === 'object')
      matches[i] = new RegExp(`^(?:${tokens[i].pattern})$`)
  }

  return (data, options) => {
    const encode = (options && options.encode) || encodeURIComponent

    let path = ''

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (typeof token === 'string') {
        path += token
        continue
      }

      const value = data ? data[token.name] : undefined

      let segment

      if (Array.isArray(value)) {
        if (!token.repeat)
          throw new TypeError(`Expected ${token.name} to not repeat, but got array`)

        if (value.length === 0) {
          if (token.optional) continue

          throw new TypeError(`Expected ${token.name} to not be empty`)
        }

        for (let j = 0; j < value.length; j++) {
          segment = encode(value[j])

          if (!matches[i].test(segment))
            throw new TypeError(`Expected all ${token.name} to match ${token.pattern}`)

          path += (j === 0 ? token.prefix : token.delimiter) + segment
        }

        continue
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        segment = encode(String(value))

        if (!matches[i].test(segment))
          throw new TypeError(`Expected ${token.name} to match ${token.pattern}, but got a ${segment}`)

        path += token.prefix + segment

        continue
      }

      if (token.optional) {
        // Prepend partial segment prefixes.
        if (token.partial) path += token.prefix

        continue
      }

      throw new TypeError(`Expected ${token.name} to be ${(token.repeat ? 'an array' : 'a string')}`)
    }

    return path
  }
}

/**
 * Escape a regular expression string.
 *
 * @param  {string} str
 * @return {string}
 */
const escapeString = str => str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {string} group
 * @return {string}
 */
const escapeGroup = group => group.replace(/([=!:$/()])/g, '\\$1')

/**
 * Get the flags for a regexp from the options.
 *
 * @param  {Object} options
 * @return {string}
 */
const flags = options => options && options.sensitive ? '' : 'i'

/**
 * Pull out keys from a regexp.
 *
 * @param  {!RegExp} path
 * @param  {Array=}  keys
 * @return {!RegExp}
 */
export const regexpToRegexp = (path, keys) => {
  if (!keys) return path

  // Use a negative lookahead to match only capturing groups.
  const groups = path.source.match(/\((?!\?)/g)

  if (groups)
    for (let i in groups)
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        pattern: null,
      })

  return keys
}

/**
 * Transform an array into a regexp.
 *
 * @param  {!Array}  path
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
const arrayToRegexp = (path, keys, options) => {
  const parts = []

  for (const pathItem in path)
    parts.push(pathToRegexp(pathItem, keys, options).source)

  return new RegExp(`(?:${parts.join('|')})`, flags(optional))
}

/**
 * Create a path regexp from string input.
 *
 * @param  {string}  path
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
const stringToRegexp = (path, keys, options) => tokensToRegExp(parse(path, options), keys, options)

/**
 * Expose a function for taking tokens and returning a RegExp.
 *
 * @param  {!Array}  tokens
 * @param  {Array=}  keys
 * @param  {Object=} options
 * @return {!RegExp}
 */
export const tokensToRegExp = (tokens, keys, options = {}) => {
  const strict = options.strict
  const end = options.end !== false
  const delimiter = escapeString(options.delimiter || DEFAULT_DELIMITER)
  const delimiters = options.delimiters || DEFAULT_DELIMITERS
  const endsWith = [...(options.endsWith || [])].map(escapeString).concat('$').join('|')

  let route = ''
  let isEndDelimited = false

  // Iterate over the tokens and create our regexp string.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (typeof token === 'string') {
      route += escapeString(token)
      isEndDelimited = i === tokens.length - 1 && delimiters.indexOf(token[token.length - 1]) > -1
    } else {
      const prefix = escapeString(token.prefix)
      const capture = token.repeat
        ? `(?:${token.pattern})(?:${prefix}(?:${token.pattern}))*`
        : token.pattern

      keys && keys.push(token)

      route += token.optional
        ? token.partial
          ? `${prefix}(${capture})?`
          : `(?:${prefix}(${capture}))?`
        : `${prefix}(${capture})`
    }
  }

  if (end) {
    if (!strict) route += `(?:${delimiter})?`

    route += endsWith === '$' ? '$' : `(?=${endsWith})`
  } else {
    if (!strict) route += `(?:${delimiter}(?=${endsWith}))?`
    if (!isEndDelimited) route += `?=${delimiter}|${endsWith}`
  }

  return new RegExp(`^${route}`, flags(options))
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 *
 * @param  {(string|RegExp|Array)} path
 * @param  {Array=}                keys
 * @param  {Object=}               options
 * @return {!RegExp}
 */
const pathToRegexp = (path, keys, options) => path instanceof RegExp
  ? regexpToRegexp(path, keys)
  : Array.isArray(path)
    ? arrayToRegexp(/** @type {!Array} */ (path), keys, options)
    : stringToRegexp(/** @type {string} */ (path), keys, options)

export default pathToRegexp
