var hbs = require("handlebars");
var fsext = require("../utils/fsext");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var path = require("path");
var fs = require("fs");
var _ = require("underscore");

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
		
		if (typeof options.src == "string") options.src = [options.src];

		if (fs.existsSync(options.dest) && options.force !== true) {
			var destStat = fs.statSync(options.dest);
			var changed = false;
			for (var s = 0, sl = options.src.length; s < sl; s++) {
				if (fs.existsSync(options.src[s])) {
			        var files = fsext.glob(options.src[s], options.globs, { dirs: false });
			        for (var i = 0, l = files.length; i < l; i++) {
			            if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.mtime) {
			                changed = true;
			                break;
			            }
			        }
			    }
			    if (changed) break;
		    }
		    if (!changed) {
	        	return;
	        }
		}

		logger.runlog(options);

		taskqueue.add(options, function perform(options, done) {

			var output = "";
			output+="define(";
			if (options.requires) {
				output+=JSON.stringify(_.values(options.requires))+",";
			}
			output+="function(";
			if (options.requires) {
				output+=_.keys(options.requires).join(",");
			}
			output+="){\n";


			output+=options.context+"={};\n";

			for (var s = 0, sl = options.src.length; s < sl; s++) {
				var files = fsext.glob(options.src[s], options.globs, { dirs: false });

				for (var i = 0, l = files.length; i < l; i++) {
					var file = files[i];

					var contents = fs.readFileSync(file+"").toString();
					var precompiled = hbs.precompile(contents);

					var isPartial = fsext.globMatch([file], options.paritalGlobs);
					if (isPartial.length > 0) {
						output+= "Handlebars.registerPartial('"+file.filename+"',Handlebars.template("+precompiled+"));\n";
					} else {
						if (options.context) {
							output+=options.context+"['"+file.filename+"']=Handlebars.template(";
						};

						output+=precompiled;

						if (options.context) {
							output+=");\n";
						} else {
							output+="\n";
						}
					}
				}
			}

			output+="});";

			if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
			if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

			fsext.mkdirp({dest:path.dirname(options.dest)});
			fs.writeFile(options.dest, output, function() {
				done("hbs", options);
			});
		});
	},
	reset: function() {
		
	}
};

