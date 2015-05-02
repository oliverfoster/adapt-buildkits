var program = require('commander');
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
 
var cmdValue;

program
    .command('install')
	.version(JSON.parse(fs.readFileSync( path.join(__dirname, "../package.json"))).version)
   	.description("install the build utilitiy into the current folder")
   	.action(function() {
    	require("../commands/install");
   	});

program.parse(process.argv);