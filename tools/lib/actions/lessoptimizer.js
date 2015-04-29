var less = require("less");
var fsext = require("../utils/fsext");
var path = require("path");
var fs = require("fs");
var sourcemapext = require("../utils/sourcemapext.js");
var _ = require("underscore");
var chalk = require("chalk");

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


module.exports = function(options) {
	options = _.extend({}, defaults, options);

	var output = "";
	if (typeof options.src == "string") options.src = [options.src];

	if (fs.existsSync(options.dest) && options.force !== true) {
		var destStat = fs.statSync(options.dest);
		for (var s = 0, sl = options.src.length; s < sl; s++) {
			if (fs.existsSync(options.src[s])) {
		        var files = fsext.glob(options.src[s], options.globs, { dirs: false });
		        var changed = false;
		        for (var i = 0, l = files.length; i < l; i++) {
		            if (files[i].mtime > destStat.mtime) {
		                console.log(files[i].filename+files[i].extname, "has changed.");
		                changed = true;
		                break;
		            }
		        }
		        if (!changed) return;
		        if (changed) {
		            console.log("Performing ", options['@name']);
		            break;
		        }

		    }
	    }
	}
	
	console.log(chalk.green(">", options['course'], ":", options['@displayName']));

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

	var config = _.extend({}, options, { sourceMap: options });

	switch (options.mode) {
        case "dev":
            config.compress = false;
            break;
        case "build":
        	delete config.sourceMap;
        	config.compress = true;
        } 

	less.render(includeFile, config, function(error, output) {
		fsext.mkdirp({dest:path.dirname(options.dest)});

		fs.writeFileSync(options.dest, output.css);
		if (output.map) {
			fs.writeFileSync(options.dest + ".map", output.map);
			if (options.sourceMapRelocate) sourcemapext.relocate(options.dest + ".map", options.sourceMapRelocate);
		}
	});
};