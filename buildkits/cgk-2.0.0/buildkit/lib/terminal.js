var program = require('commander');
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
 
var items;

program
	.version(JSON.parse(fs.readFileSync( path.join(__dirname, "../package.json"))).version)
	.arguments('[env...]')
	.option('-w, --watch', "watch for changes")
	.option('-f, --force', "force rebuild")
	.option('-s, --server', "run server, implies watch")
	.option('-q, --quick', "skip minification and sourcemapping")
	.option('-i, --trackinginsert', "inserts tracking ids")
	.option('-d, --trackingdelete', "delete tracking ids")
	.option('-r, --trackingreset', "resets tracking ids")
	.option('-Z, --zip', "create sco zips")
	.action(function (env) {
		items = env;
	});
 
program.parse(process.argv);


var switches = {};
_.each(program.options, function(opt) {
	var k = opt.long.slice(2);
	if (k == "version") return;
	switches[k] = program[k];
});

function adaptType() {
	if (fs.existsSync("./src/course")) {
		return "src/course";
	} else if (fs.existsSync("./src/courses")) {
		return "src/courses"
	} else {
		return "builds/courses/course";
	}
}


module.exports = function(mode) {
	switch (mode) {
	case "prod":
		switches['force'] = true;
		break;
	}

	if (switches.server) {
		switches.watch = true;
	}

	return {
		type: adaptType(),
		mode: mode,
		switches: switches,
		items: items || []
	};
};