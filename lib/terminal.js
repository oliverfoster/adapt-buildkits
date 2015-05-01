var program = require('commander');
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
 
var cmdValue;

program
	.version(JSON.parse(fs.readFileSync( path.join(__dirname, "../package.json"))).version)
	.command('install', "install the build utilitiy into the current folder")
	
program.parse(process.argv);