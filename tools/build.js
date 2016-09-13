'use strict';

const fs = require('fs')
const del = require('del')
const gzipSize = require('gzip-size')
const rollup = require('rollup')
const uglify = require('uglify-js')
const json = require('rollup-plugin-json')
const babel = require('rollup-plugin-babel')
const colors = require('colors')
const pkg = require('../package.json')
const path = require('path')
const babelrc = require('babelrc-rollup').default
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
})
let promise = Promise.resolve()

// Clean up the output directory
promise = promise.then(() => del(['dist/*']))

console.log('您当前打包的模块是 '.info + pkg.name.blue)
console.log('当前版本号是: '.info + pkg.version.blue)
console.log('当前模块所依赖的外部包: '.info)
for (var key in pkg.dependencies) {
  if (pkg.dependencies.hasOwnProperty(key)) {
    console.log(key.blue)
  }
}

var banner =
  '/*!\n' +
  ' * ' + pkg.name + '.js v' + pkg.version + '\n' +
  ' */'

function getConfig (format) {
  return {
    entry: 'src/index.js',
    format: format === 'min' ? 'umd' : format,
    out: path.resolve(`dist/${format === 'cjs' ? 'index' : `index.${format}`}.js`),
    banner,
    env: format === 'min' ? 'production' : 'development',
    moduleName: format === 'umd' ? pkg.name : undefined,
    sourceMap: true,
    external: Object.keys(pkg.dependencies)
  }
}

promise.then(() => {
  if (!fs.existsSync(path.resolve('./dist'))) {
    fs.mkdirSync(path.resolve('./dist'))
  }
  build(['es', 'cjs', 'umd', 'min'])
})

function build (builds) {
  var built = 0
  var total = builds.length

  next()
  function next () {
    buildEntry(getConfig(builds[built])).then(function () {
      built++
      if (built < total) {
        next()
      } else {
        doFinal()
      }
    }).catch(logError)
  }
}

function buildEntry (opts) {
  var plugins = [
    json(),
    babel(babelrc())
  ]
  console.log(opts.format)
  return rollup.rollup({
    entry: opts.entry,
    plugins: plugins,
    external: opts.external
  }).then(function (bundle) {
    var code = bundle.generate({
      format: opts.format,
      moduleName: opts.moduleName,
      sourceMap: opts.sourceMap,
      banner: opts.banner
    }).code

    if (opts.env === 'production') {
      var minified = (opts.banner ? opts.banner + '\n' : '') + uglify.minify(code, {
          fromString: true,
          output: {
            screw_ie8: true,
            ascii_only: true
          },
          compress: {
            pure_funcs: ['makeMap']
          }
        }).code
      return write(opts.out, minified).then(zip(opts.out))
    } else {
      return write(opts.out, code)
    }
  })
}

function doFinal () {
  delete pkg.private
  delete pkg.devDependencies
  delete pkg.scripts
  delete pkg.eslintConfig
  delete pkg.babel
  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, '  '), 'utf-8')
  fs.writeFileSync('dist/LICENSE.txt', fs.readFileSync('LICENSE.txt', 'utf-8'), 'utf-8')
}

function write (dest, code) {

  return new Promise(function (resolve, reject) {
    fs.writeFile(dest, code, function (err) {
      if (err) return reject(err)
      console.log(dest.info + ' ' + getSize(code).blue)
      resolve()
    })
  })
}

function zip (file) {
  return function () {
    fs.readFile(file, function (err, buf) {
      gzipSize(buf, function (error, size) {
        console.log('当前模块gzip后的大小为(不包括依赖的外部包): '.info + getSize(size).blue)
      })
    })
  }
}

function getSize (code) {
  return ((code.length ? code.length : code) / 1024).toFixed(2) + 'kb'
}

function logError (e) {
  console.log(e)
}



