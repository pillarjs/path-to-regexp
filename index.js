/**
 * Expose `pathtoRegexp`.
 */

module.exports = pathtoRegexp;

var PATH_REGEXP = new RegExp([
  // Match already escaped characters that would otherwise incorrectly appear
  // in future matches. This allows the user to escape special characters that
  // shouldn't be transformed.
  '(\\\\.)',
  // Match Express-style params and un-named params with a prefix and optional
  // suffixes. Matches appear as:
  //
  // "/:test(\\d+)*?" => ["/", "test", "\d+", undefined, "*", "?"]
  // "/route(\\d+)" => [undefined, undefined, undefined, "\d+", undefined, undefined]
  '([\\/\\.])?(?:\:(\\w+)(?:\\((.*)\\))?|\\((.*)\\))(\\*)?(\\?)?',
  // Match regexp special characters that should always be escaped.
  '([=!:$|\\.\\/])',
  // Finally, enable automatic greedy matching.
  '(\\*)'
].join('|'), 'g');

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String} group
 * @return {String}
 */
function escapeGroup (group) {
  return group
    .replace(/([=!:$|\.\/\(\)])/g, '\\$1')
    .replace(/\*/g, '.*');
}

/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array should be passed, which will contain the placeholder key
 * names. For example "/user/:id" will then contain:
 *
 * [{ name: "id", optional: false }]
 *
 * @param  {(String|RegExp|Array)} path
 * @param  {Array}                 keys
 * @param  {Object}                options
 * @return {RegExp}
 */
function pathtoRegexp (path, keys, options) {
  keys = keys || [];
  options = options || {};

  var strict = options.strict;
  var end = options.end !== false;
  var flags = options.sensitive ? '' : 'i';
  var index = 0;

  if (path instanceof RegExp) {
    return path;
  }

  if (Array.isArray(path)) {
    // Map array parts into regexps and return their source. We also pass
    // the same keys and options instance into every generation to get
    // consistent matching groups before we join the sources together.
    path = path.map(function (value) {
      return pathtoRegexp(value, keys, options).source;
    });

    return new RegExp('(?:' + path.join('|') + ')', flags);
  }

  // Alter the path string into a usable regexp.
  path = path.replace(PATH_REGEXP, function (match, escaped, prefix, key, capture, group, star, optional, escape, greedy) {
      // Keep escaped characters the same.
      if (escaped) {
        return escaped;
      }

      // Escape special characters.
      if (escape) {
        return '\\' + escape;
      }

      optional = optional || '';

      var name = key || index++;
      var slash = (prefix === '/' ? '\\/' : '');
      var format = (prefix === '.' ? '\\.' : '');
      var regexp = capture || group || '[^\\/' + format + ']+?';

      keys.push({ name: name, optional: !!optional });

      // Return the greedy regexp match early.
      if (greedy) {
        return '(.*)';
      }

      return ''
        + (optional ? '' : slash)
        + '(?:'
        + format + (optional ? slash : '')
        + '(' + escapeGroup(regexp) + ')'
        + (star ? '((?:[\\/' + format + '].+?)?)' : '')
        + ')'
        + optional;
    });

  // Wrap the path in a regexp match.
  path = ('^' + path + (strict ? '' : '\\/?'));

  // If the path is non-ending, match until the end or a slash.
  path += (end ? '$' : (path[path.length - 1] === '/' ? '' : '(?=\\/|$)'));

  return new RegExp(path, flags);
};
