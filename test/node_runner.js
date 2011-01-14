#!/usr/bin/env node

var fs = require('fs');
var sys = require('sys');

fs.readdir('test', function(err, files){
  files.forEach(function(file){
    var data;
    if (data = file.match(/^(test_.*)\.js$/)){
      require('./'+data[1]);
    }
  });
});
