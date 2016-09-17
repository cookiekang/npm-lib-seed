import babelrc from 'babelrc-rollup'
import uglify from 'rollup-plugin-uglify'
import rollupCommonjs from 'rollup-plugin-commonjs'
import rollupNpm from 'rollup-plugin-node-resolve'

const fs = require('fs')
const del = require('del')
const gzipSize = require('gzip-size')
const rollup = require('rollup')
const json = require('rollup-plugin-json')
const babel = require('rollup-plugin-babel')
const colors = require('colors')
const pkg = require('../package.json')
const path = require('path')

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
  error: 'red',
})
let promise = Promise.resolve()

// Clean up the output directory
promise = promise.then(() => del(['dist/*']))

console.log('您当前打包的模块是 '.info + pkg.name.yellow)
console.log('当前版本号是: '.info + pkg.version.yellow)
console.log('当前模块所依赖的外部包: '.info)

Object.keys(pkg.dependencies).forEach(key => {
  console.log(key.yellow)
})

const banner =
  '/*!\n' +
  ' * ' + pkg.name + '.js v' + pkg.version + '\n' +
  ' */'

function getConfig(format) {
  // 打包成独立min文件时就要包含所有模块的代码
  let external = format === 'min' ? function () { return false } : Object.keys(pkg.dependencies)
  return {
    entry: 'src/index.js',
    format: format === 'min' ? 'umd' : format,
    out: path.resolve(`dist/${format === 'cjs' ? 'index' : `index.${format}`}.js`),
    banner,
    env: format === 'min' ? 'production' : 'development',
    moduleName: (format === 'umd' || format === 'min') ? pkg.name : undefined,
    sourceMap: true,
    external,
  }
}

function getSize(code) {
  return ((code.length ? code.length : code) / 1024).toFixed(2) + 'kb'
}

function write(dest, code) {
  return new Promise((resolve, reject) => {
    fs.writeFile(dest, code, err => {
      if (!err) {
        console.log(dest.info + ' ' + getSize(code).yellow)
        resolve()
      } else {
        reject(err)
      }
    })
  })
}

function zip(file) {
  return function () {
    fs.readFile(file, (err, buf) => {
      gzipSize(buf, (error, size) => {
        console.log('当前模块gzip后的大小为(不包括依赖的外部包): '.info + getSize(size).yellow)
      })
    })
  }
}

function logError(e) {
  console.log(e)
}

function buildEntry(opts) {
  const plugins = [
    rollupNpm({
      jsnext: true,
      main: true
    }),
    json(),
    babel(babelrc()),
    rollupCommonjs(),
  ]
  let isMin = opts.env === 'production'
  if (isMin) {
    plugins.push(uglify())
  }

  return rollup.rollup({
    entry: opts.entry,
    plugins,
    external: opts.external,
  }).then(bundle => {
    const code = bundle.generate({
      format: opts.format,
      moduleName: opts.moduleName,
      sourceMap: opts.sourceMap,
      banner: opts.banner,
    }).code
    if (isMin) {
      return write(opts.out, code).then(zip(opts.out))
    }
    return write(opts.out, code)
  })
}

function doFinal() {
  delete pkg.private
  delete pkg.devDependencies
  delete pkg.scripts
  delete pkg.eslintConfig
  delete pkg.babel
  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, '  '), 'utf-8')
  fs.writeFileSync('dist/LICENSE.txt', fs.readFileSync('LICENSE.txt', 'utf-8'), 'utf-8')
}

function build(builds) {
  let built = 0
  const total = builds.length
  function next() {
    buildEntry(getConfig(builds[built])).then(() => {
      built += 1
      if (built < total) {
        next()
      } else {
        doFinal()
      }
    }).catch(logError)
  }
  next()
}

promise.then(() => {
  if (!fs.existsSync(path.resolve('./dist'))) {
    fs.mkdirSync(path.resolve('./dist'))
  }
  build(['es', 'cjs', 'umd', 'min'])
})
