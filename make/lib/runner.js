var less = require("less");
var fs = require("fs");
var fsext = require("./utils/fsext");
var fswatch = require("./utils/fswatch");
var chalk = require("chalk");
var path = require("path");
var hbs = require("handlebars");
var taskqueue = require("./utils/taskqueue.js");
var logger = require("./utils/logger.js");
var _ = require("underscore");


var defaults;
var toolsConfig = {};
var indexActions;
var actions;
var reloadClient, reloadFiles;

function loadConfigs(options) {
	var configs = fsext.glob(path.dirname(__dirname), "*.json");
	for (var i = 0, l = configs.length; i < l; i++) {
		 toolsConfig = _.extend(toolsConfig, JSON.parse(fs.readFileSync(configs[i].path)));
	}
	
	defaults = toolsConfig.defaults;

	actions = toolsConfig.actions;
	actions = _.filter(actions, function(item, item1) {
		if (item['@types'] === undefined) return true;

		if (item['@types'].indexOf(options.type) == -1) return false;

		return true;

	});

	actions = _.filter(actions, function(item, item1) {
		if (item['@onlyOnSwitches'] !== undefined) {
			for (var key in options.switches) {
				var value = options.switches[key];
				if (!value) continue;
				
				if (item['@onlyOnSwitches'].indexOf(key) != -1) {
					return true;
				}
			};
			return false;
		}

		if (item['@excludeOnSwitches'] === undefined) return true;

		for (var key in options.switches) {
			var value = options.switches[key];
			if (!value) continue;
			
			if (item['@excludeOnSwitches'].indexOf(key) != -1) {
				return false;
			}
		};

		return true;

	});

	indexActions = _.indexBy(actions, "@name");
}

function entryPoint(options) {
	loadConfigs(options);

	switch(options.type) {
	case "builds/courses/course":
		defaults.dest = defaults.multipleDestPath;
		break;
	case "src/courses":
		defaults.dest = defaults.multipleDestPath;
		break;
	case "src/course":
		defaults.dest = defaults.singleDestPath;
		break;
	}

	options = _.extend({}, defaults, options);

	if (options.switches['force']) options.force = true;
	if (options.switches['server']) server();

	logger.log("Mode: "+options.mode,0);
	logger.log("Structure:"+options.type,0);
	logger.log("Forced: "+(options.force || false),0);
	logger.log("Courses: "+(options.items.join(",")||"All"),0);

	switch(options.type) {
	case "builds/courses/course":
		buildsFolders(options);
		break;
	case "src/courses":
		srcsFolders(options);
		break;
	case "src/course":
		srcsFolder(options);
		break;
	}

	if (!options.switches.watch) waitForEnd();
	else watchForChanges(options);

		
}

function buildsFolders(options) {
	fsext.walkSync(fsext.relative(options.dest), function(dirs, files) {
		dirs = _.pluck(dirs, "filename");
		
		for (var i = 0, l = dirs.length; i < l; i++) {
			var dir = dirs[i];

			if (options.items.length > 0)
				if (options.items.indexOf(dir) == -1) continue;

			var opts = _.extend({}, options, { dest: path.join(options.dest, dir), course: dir });
			build(opts);
		}

	});
}

function srcsFolders(options) {
	fsext.walkSync(fsext.relative(options.srcCoursesPath), function(dirs, files) {
		dirs = _.pluck(dirs, "filename");
		
		for (var i = 0, l = dirs.length; i < l; i++) {
			var dir = dirs[i];

			if (options.items.length > 0)
				if (options.items.indexOf(dir) == -1) continue;

			var opts = _.extend({}, options, { dest: path.join(options.dest, dir), course: dir });
			build(opts);
		}

	});
}

function srcsFolder(options) {
	var opts = _.extend({}, options, { dest: options.dest, course: "" });
	build(opts);
}

function server() {
	var browserSync = require('browser-sync'),
        serveIndex = require('serve-index');

    reloadClient = browserSync.reload;

    var index = serveIndex( defaults.dest, {'icons': true})
    var srv = browserSync({
        server: {
        	index: "not_something_that_should_be_found.html",
            baseDir: defaults.dest,
            middleware: function (req, res, next) {
                if (req.url.substr(-1) == "/") index(req, res, next);
                else next();
            }
        },
        notify: true,
        ghostMode: {
            clicks: true,
            location: true,
            forms: true,
            scroll: true
        }
    });
}

function waitForEnd() {
	if (taskqueue.isRunning())
		taskqueue.on('end', endMe);
	else endMe();

	function endMe() {
		console.log('Press any key to exit');

		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on('data', process.exit.bind(process, 0));
	}
}

function watchForChanges(options) {
	logger.log("Watching for changes...",1);

	for (var i = 0, l = toolsConfig.watches.length; i < l; i++) {
		var data = toolsConfig.watches[i];
		data.options = options;
		data.callback = onChange;
		fswatch.watch(data);
	}

}

function onChange(type, stat, data) {
	var options = data.options;
	taskqueue.reset();

	options.switches.force = true;

	logger.log(stat.filename+stat.extname + " has changed.",1);

	for (var a = 0, al = data.actions.length; a < al; a++) {
		var actionName = data.actions[a];
		if (!indexActions[actionName]) return;
		resetAction(indexActions[actionName]);
	}

	fsext.walkSync(fsext.relative(defaults.dest), function(dirs, files) {
		dirs = _.pluck(dirs, "filename");
		
		for (var i = 0, l = dirs.length; i < l; i++) {
			var dir = dirs[i];

			if (options.items.length > 0)
				if (options.items.indexOf(dir) == -1) continue;

			var opts = _.extend({}, options, { dest: path.join(options.dest, dir), course: dir });
			for (var a = 0, al = data.actions.length; a < al; a++) {
				var actionName = data.actions[a];
				if (!indexActions[actionName]) return;
				runAction(opts, indexActions[actionName]);
			}	
		}

	});
	
	fswatch.pause();

	if (taskqueue.isRunning()) {
		taskqueue.on('end', endMe);
	} else endMe();

	function endMe() {
		logger.log("Watching for changes...",1);
		if (reloadFiles) {
			reloadClient(reloadFiles);
		} else {
			reloadClient();
		}
		fswatch.resume();
	}
}

function build(options) {
	for (var i = 0, l = actions.length; i < l; i++) {
		var config = actions[i];

		runAction(options, config);
	}
}


function runAction(options, config) {
	var dest;
	if (config.dest) {
		dest = hbs.compile(config.dest)(options);
	}
	var cloneConfig = _.extend({}, options, config, { dest: dest });

	reloadFiles = false;
	if (cloneConfig.reloadFiles) {
		reloadFiles = ["*.css"];	
	}
	require("./actions/"+config['@action']+".js").perform(cloneConfig);
	
}

function resetAction(config) {
	require("./actions/"+config['@action']+".js").reset();
}

module.exports = function(config) {
	entryPoint(config);
};