const DEFAULT_DELIMITER = '/'
const DEFAULT_DELIMITERS = './'

const PATH_REGEXP = new RegExp([
  '(\\\\.)',
  '(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?'
].join('|'), 'g')

const parse = (str, options) => {
  const tokens = []
  const defaultDelimiter = (options && options.delimiter) || DEFAULT_DELIMITER
  const delimiters = (options && options.delimiters) || DEFAULT_DELIMITERS

  let res
  let [key, index, path, pathEscaped] = [0, 0, '', false]

  while ((res = PATH_REGEXP.exec(str)) !== null) {
    const [ m, escaped ] = res
    const { index: offset } = res

    path += str.slice(index, offset)
    index = offset + m.length

    if (escaped) {
      path += escaped[1]
      pathEscaped = true
      continue
    }

    let prev = ''
    const next = str[index]
    const [
      ,,
      name,
      capture,
      group,
      modifier
    ] = res

    if (!pathEscaped && path.length) {
      const k = path.length - 1

      if (delimiters.indexOf(path[k]) > -1) [prev, path] = [path[k], path.slice(0, k)]
    }

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
      delimiter,
      optional,
      repeat,
      partial,
      pattern: pattern ? escapeGroup(pattern) : `[^${escapeString(delimiter)}]+?`
    })
  }

  if (path || index < str.length) {
    tokens.push(path + str.substr(index))
  }

  return tokens
}

const compile = (str, options) => tokensToFunction(parse(str, options))

const escapeString = str => str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')

const escapeGroup = group => group.replace(/([=!:$/()])/g, '\\$1')

const tokensToFunction = (tokens) => {
  const matches = tokens.map((token, i) => typeof token === 'object'
    ? new RegExp(`^(?:${token.pattern})$`)
    : token
  )

  return (data, options) => {
    let path = ''
    const encode = (options && options.encode) || encodeURIComponent

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (typeof token === 'string') {
        path += token
        continue
      }

      const value = data ? data[token.name] : undefined

      let segment

      if (Array.isArray(value)) {
        if (!token.repeat) {
          throw new TypeError(`Expected "${token.name}" to not repeat, but got array`)
        }

        if (value.length === 0) {
          if (token.optional) continue

          throw new TypeError(`Expected "${token.name}" to not be empty`)
        }

        value.forEach((_, j) => {
          segment = encode(value[j])

          if (!matches[i].test(segment)) {
            throw new TypeError(`Expected all "${token.name}" to match "${token.pattern}"`)
          }

          path += `${(j === 0 ? token.prefix : token.delimiter)}${segment}`
        })

        continue
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        segment = encode(String(value))

        if (!matches[i].test(segment)) {
          throw new TypeError(`Expected "${token.name}" to match "${token.pattern}", but got "${segment}"`)
        }

        path += `${token.prefix}${segment}`
        continue
      }

      if (token.optional) {
        if (token.partial) path += token.prefix
        continue
      }

      throw new TypeError(`Expected "${token.name}" to be ${(token.repeat ? 'an array' : 'a string')}`)
    }

    return path
  }
}

const flags = options => options && options.sensitive ? '' : 'i'

const regexpToRegexp = (path, keys) => {
  if (!keys) return path

  const groups = path.source.match(/\((?!\?)/g)

  if (groups) {
    groups.forEach((_, i) => {
      keys.push({
        name: i,
        prefix: null,
        delimiter: null,
        optional: false,
        repeat: false,
        partial: false,
        pattern: null
      })
    })
  }

  return path
}

const arrayToRegexp = (path, keys, options) => new RegExp(`(?:${path.map(pathItem => pathToRegexp(pathItem, keys, options).source).join('|')})`, flags(options))

const stringToRegexp = (path, keys, options) => tokensToRegExp(parse(path, options), keys, options)

const tokensToRegExp = (tokens, keys, options) => {
  options = options || {}

  const { strict } = options
  const end = options.end !== false
  const delimiter = escapeString(options.delimiter || DEFAULT_DELIMITER)
  const delimiters = options.delimiters || DEFAULT_DELIMITERS
  const endsWith = [...(options.endsWith || [])].map(escapeString).concat('$').join('|')

  let route = ''
  let isEndDelimited = false

  tokens.forEach((token, i) => {
    if (typeof token === 'string') {
      route += escapeString(token)
      isEndDelimited = i === tokens.length - 1 && delimiters.indexOf(token[token.length - 1]) > -1
    } else {
      const prefix = escapeString(token.prefix)
      const capture = token.repeat
        ? `(?:${token.pattern})(?:${prefix}(?:${token.pattern}))*`
        : token.pattern

      if (keys) keys.push(token)

      if (token.optional) {
        if (token.partial) {
          route += `${prefix}(${capture})?`
        } else {
          route += `(?:${prefix}(${capture}))?`
        }
      } else {
        route += `${prefix}(${capture})`
      }
    }
  })

  if (end) {
    if (!strict) route += `(?:${delimiter})?`

    route += endsWith === '$' ? '$' : `(?=${endsWith})`
  } else {
    if (!strict) route += `(?:${delimiter}(?=${endsWith}))?`
    if (!isEndDelimited) route += `(?=${delimiter}|${endsWith})`
  }

  return new RegExp(`^${route}`, flags(options))
}

const pathToRegexp = (path, keys, options) => {
  if (path instanceof RegExp) {
    return regexpToRegexp(path, keys)
  }

  if (Array.isArray(path)) {
    return arrayToRegexp(path, keys, options)
  }

  return stringToRegexp(path, keys, options)
}

module.exports = pathToRegexp
module.exports.parse = parse
module.exports.compile = compile
module.exports.tokensToFunction = tokensToFunction
module.exports.tokensToRegExp = tokensToRegExp
