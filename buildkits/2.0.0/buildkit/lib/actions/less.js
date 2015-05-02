var less = require("less");
var fsext = require("../utils/fsext");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var path = require("path");
var fs = require("fs");
var sourcemapext = require("../utils/sourcemapext.js");
var _ = require("underscore");
var hbs = require("handlebars");

var defaults = {
		src: process.cwd(),
		dest: path.join(process.cwd(), "templates.js"),
		extensionGlobs: [ "*.hbs", '*.html', "*.handlebars", "*.htm" ],
		paritalGlobs: [ "**/partial/**" ],
		requires: {
			Handlebars: 'handlebars'
		},
		context: "Handlebars.templates"
	};


module.exports = {
	perform: function(options) {
		options = _.extend({}, defaults, options);

		options.dest = hbs.compile(options.dest)(options);

		var output = "";
		if (typeof options.src == "string") options.src = [options.src];

		if (fs.existsSync(options.dest) && options.force !== true) {
			var destStat = fs.statSync(options.dest);
			for (var s = 0, sl = options.src.length; s < sl; s++) {
				if (fs.existsSync(options.src[s])) {
			        var files = fsext.glob(options.src[s], options.globs, { dirs: false });
			        var changed = false;
			        for (var i = 0, l = files.length; i < l; i++) {
			            if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.ctime) {
			                changed = true;
			                break;
			            }
			        }
			    }
			    if (changed) break;
		    }
		    if (!changed) return;
		}
		
		logger.runlog(options);

		if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
	    if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");



		var includeFile = "";

		for (var s = 0, sl = options.src.length; s < sl; s++) {
			var files = fsext.glob(options.src[s], options.globs, { dirs: false });

			for (var i = 0, l = files.length; i < l; i++) {
				var file = files[i];
				var relativePath = file.path.substr(process.cwd().length+1);
				includeFile += '@import "' + relativePath + '";\n';
			}
		
		}

		options.includeFile = includeFile;

		taskqueue.add(options, function perform(options, done) {
			var config = _.extend({}, options, { sourceMap: options });

			switch (options.mode) {
		        case "debug":
		        	if (options.switches.quick) delete config.sourceMap;
		            config.compress = false;
		            break;
		        case "prod":
		        	delete config.sourceMap;
		        	config.compress = !options.switches.quick;
		        } 


			less.render(options.includeFile, config, complete);

			function complete(error, output) {
				if (error) {
					var output = "";
					for (var k in error) {
						switch (typeof error[k]) {
						case "object": case "function": case "undefined": case "null":
							break;
						default:
							output += k +": " + JSON.stringify(error[k]) + "\n";
						}
					}
					logger.error("\n"+output);
					done("less", options);
					return;
				}
				fsext.mkdirp({dest:path.dirname(options.dest)});

				fs.writeFileSync(options.dest, output.css);
				if (output.map) {
					fs.writeFileSync(options.dest + ".map", output.map);
					if (options.sourceMapRelocate) sourcemapext.relocate(options.dest + ".map", options.sourceMapRelocate);
				}
				done("less", options);
			}
		});
	},
	reset: function() {

	}
};


