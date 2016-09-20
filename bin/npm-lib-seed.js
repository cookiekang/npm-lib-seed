#!/usr/bin/env node

"use strict";

/**
 * Module dependencies.
 */

var ndir = require('ndir');
var path = require('path');
var fs = require('fs');
var program = require('commander');
var shell = require('shelljs');
var inquirer = require("inquirer");
var colors = require('colors');
var pkg = require('../package.json');
var template = path.join(__dirname, '../template');

program.version(pkg.version);
program
  .command('init <name>')
  .action(function (name) {
    console.log(name)
    var cwd = process.cwd()
    var modulepath = path.join(cwd, name)
    var user = {};

    user['name'] = shell.exec('npm whoami', {silent: true}).stdout.trim();
    console.log(modulepath)
    inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'please enter your email',
        validate: function (answer) {
          if (!answer) {
            return 'please enter your email!'
          }
          return true;
        }
      }
    ]).then(function (answer) {
      user['email'] = answer.email;
      console.log(answer)
      shell.exec('cp -rf ' + template + ' ' + modulepath);
      ndir.walk(modulepath, function onDir(dirpath, files) {
        var basedirname = path.basename(dirpath);
        if (basedirname === '.git') {
          return;
        }
        for (var i = 0, l = files.length; i < l; i++) {
          var info = files[i];
          if (!info[1].isFile()) {
            continue;
          }
          var filepath = info[0];
          var topath = filepath.replace('__name__', name);
          var content = fs.readFileSync(filepath, 'utf8');
          content = content.replace(/\{\{name\}\}/g, name);
          content = content.replace(/\{\{username\}\}/g, user.name);
          content = content.replace(/\{\{useremail\}\}/g, user.email)
          content = content.replace(/\{\{NAME\}\}/g, name.toUpperCase());
          fs.writeFileSync(topath, content);
          if (topath !== filepath) {
            fs.unlinkSync(filepath);
          }
        }
      }, function end() {
        var info = name + 'npm module create success!';
        console.log(info.green);
      }, function error(err, errPath) {
        console.error('%s error: %s', errPath, err);
      });
    })


  });

program.parse(process.argv);
