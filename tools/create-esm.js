const fs = require('fs')

const exportRegex = /module.exports\s*=\s*pathToRegexp/

const cjsSource = fs.readFileSync('index.js', { encoding: 'utf8' })

const esmSource = cjsSource.replace(exportRegex, 'export default pathToRegexp')

fs.writeFileSync('index.mjs', esmSource)
