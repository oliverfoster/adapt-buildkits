var less = require("less");
var fs = require("fs");
var fsext = require("./utils/fsext");
var chalk = require("chalk");
var path = require("path");
var hbs = require("handlebars");
var fileactions = require("./actions/fileactions.js");
var lessoptimizer = require("./actions/lessoptimizer.js");
var hbsoptimizer = require("./actions/hbsoptimizer.js");
var jsoptimizer = require("./actions/jsoptimizer.js");
var bundlesoptimizer = require("./actions/bundlesoptimizer.js");
var _ = require("underscore");


var defaults = {
	dest: "./builds"
};


var toolsConfig = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), "config.json")));

function builds(options) {
	options = _.extend({}, defaults, options);

	if (options.switches['force']) options.force = true;


	console.log("Mode:", options.mode);
	console.log("Forced:", options.force || false);
	console.log("Courses", options.items);

	jsoptimizer.reset();

	fsext.walkSync(fsext.relative(options.dest), function(dirs, files) {
		dirs = _.pluck(dirs, "filename");
		
		for (var i = 0, l = dirs.length; i < l; i++) {
			var dir = dirs[i];
			var opts = _.extend({}, options, { dest: path.join(options.dest, dir), course: dir });
			build(opts);
		}

	});
}

function build(options) {
	for (var i = 0, l = toolsConfig.actions.length; i < l; i++) {
		var config = toolsConfig.actions[i];

		var dest = hbs.compile(config.dest)(options);
		var cloneConfig = _.extend({}, options, config, { dest: dest });

		switch (config['@action']) {
		case "copy":
			fileactions.copy(cloneConfig);
			break;
		case "collate":
			fileactions.collate(cloneConfig);
			break;
		case "handlebars":
			hbsoptimizer(cloneConfig);
			break;
		case "javascript":
			jsoptimizer.perform(cloneConfig);
			break;
		case "bundler":
			bundlesoptimizer(cloneConfig);
			break;
		case "less":
			lessoptimizer(cloneConfig);
			break;
		}
	}
}


module.exports = function(config) {
	builds(config);
};