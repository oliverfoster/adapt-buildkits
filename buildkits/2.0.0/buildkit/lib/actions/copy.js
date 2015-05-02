var fsext = require("../utils/fsext.js");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var hbs = require("handlebars");


module.exports = {
	perform: function(options) {
		if (options.root === undefined) options.root = "";

		logger.runlog(options);

		options.root = hbs.compile(options.root)(options);
		options.root = fsext.relative(options.root);
		options.dest = hbs.compile(options.dest)(options);
		options.dest = fsext.relative(options.dest);

		var srcPath = path.join(options.root, options.src);

		var list = fsext.glob(srcPath, options.globs);

		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.path).substr(options.root.length);
			var outputPath = path.join(options.dest, shortenedPath);

			if (item.dir) {
				fsext.mkdirp({ dest: outputPath });
			} else {
				var dirname = path.dirname(outputPath);
				fsext.mkdirp({ dest: dirname });

				if (fs.existsSync(outputPath) && options.force !== true) {
					var outputStat = fs.statSync(outputPath);
					if (outputStat.mtime >= item.mtime) continue;
				} 

				taskqueue.add({"@name": "copy", src: item.path, dest:outputPath }, function(opts, done) {

					var readStream = fs.createReadStream(opts.src)

					readStream.pipe(fs.createWriteStream(opts.dest));

					readStream.on("end", function() {
						done("collate", opts);
					});

				});
				
			}
			
		}
	},
	reset: function() {
		
	}
};