/**
 * Expose `pathtoRegexp`.
 */

module.exports = pathtoRegexp;

/**
 * Validate a group capture and push the relevant keys. It assumes the incoming
 * capturing group is wrapped in parentheses with any modifiers at the end.
 *
 * @param  {String} capture
 * @param  {Array}  keys
 * @return {String}
 */
function validateGroup (capture, keys, pushed) {
  // Filter out escaped parentheses. E.g. `\\(`.
  var groups = capture.match(/(?:^|[^\\])(?:\\\\)*\([^?]/g);

  // Push empty keys into the key array for each capturing group.
  if (groups) {
    keys.push.apply(keys, new Array(groups.length - (pushed ? 1 : 0)));
  }

  return capture.replace(/\//g, '\\/');
};

/**
 * Core path to regexp utility.
 *
 * @type {RegExp}
 */
var PATH_REGEXP = new RegExp([
  // Match escaped regexp characters that would otherwise be used incorrectly
  // in other matches. This allows the user to escape characters that shouldn't
  // be transformed.
  '(\\\\.)',
  // Match Express-style params with a prefix and optional suffixes.
  '([\\/\\.])?:(\\w+)(\\(.*?\\))?(\\*)?(\\?)?',
  // Match user-defined regexp matching groups.
  '(\\(.*?\\)[*+?]?)',
  // Match regexp special characters that need to be escaped.
  '([.+?=^!:${}|[\\]\\/])',
  // Finally, enable automatic greedy matching with an asterisk.
  '(\\*)'
].join('|'), 'g');

/**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String|RegExp|Array} path
 * @param  {Array} keys
 * @param  {Object} options
 * @return {RegExp}
 * @api private
 */
function pathtoRegexp(path, keys, options) {
  options = options || {};
  var sensitive = options.sensitive;
  var strict = options.strict;
  var end = options.end !== false;
  keys = keys || [];

  if (path instanceof RegExp) return path;
  if (path instanceof Array) path = '(' + path.join('|') + ')';

  path = path
    .replace(PATH_REGEXP, function (match, escaped, prefix, key, capture, star, optional, group, escape, anything) {
      if (escaped) {
        return escaped;
      }

      if (escape) {
        return '\\' + escape;
      }

      if (group) {
        return validateGroup(group, keys);
      }

      if (anything) {
        return validateGroup('(.*)', keys);
      }

      keys.push({ name: key, optional: !!optional });

      slash = prefix === '/' ? '\\/' : '';
      format = prefix === '.' ? '\\.' : '';
      capture = validateGroup(capture || '([^\\/' + format + ']+?)', keys, true);
      optional = optional || '';

      return ''
        + (optional ? '' : slash)
        + '(?:'
        + format + (optional ? slash : '') + capture
        + (star ? '((?:[\\/' + format + '].+?)?)' : '')
        + ')'
        + optional;
    })
    .concat(strict ? '' : '\\/?');

  return new RegExp('^' + path + (end ? '$' : '(?=\\/|$)'), sensitive ? '' : 'i');
};
