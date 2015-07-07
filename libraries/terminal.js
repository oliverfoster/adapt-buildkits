var program = require('commander');
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
 
var cmdValue;

program
	.version(JSON.parse(fs.readFileSync( path.join(__dirname, "../package.json"))).version)
	.command('install [buildkitName]')
   	.description("install a buildkit into the current folder")
   	.action(function(buildkitName) {
    	require("../commands/install").entryPoint(buildkitName);
   	});

program
   	.command('list')
   	.description("list the available builkits")
   	.action(function() {
    	require("../commands/list").entryPoint();
   	});

program
    .command('uninstall')
    .description("uninstall the buildkit from the current folder")
    .action(function() {
      require("../commands/uninstall").entryPoint();
    });

program.parse(process.argv);