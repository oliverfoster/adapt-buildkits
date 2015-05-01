var fsext = require("../utils/fsext.js");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var hbs = require("handlebars");

function twoDigit(num) {
	var snum = ""+num;
	return (snum.length < 2 ? "0" : "") + snum;
}

module.exports = {
	perform: function(options) {
		if (options.root === undefined) options.root = "";

		logger.runlog(options);

		var now = (new Date());
		options.scoDate = now.getYear() + twoDigit(now.getMonth()) + twoDigit(now.getDate()) + "_" + twoDigit(now.getHours()) + twoDigit(now.getMinutes()) + twoDigit(now.getSeconds());
		
		options.root = hbs.compile(options.root)(options);
		options.root = fsext.relative(options.root);
		
		var srcPath = path.join(options.root, options.src);

		var courseJSON = fsext.glob(srcPath, "**/course.json", { dirs: false });
		if (courseJSON.length) {
			var course = JSON.parse(fs.readFileSync(courseJSON[0].path));
			options = _.extend({}, course, options);
		}
		
		options.dest = hbs.compile(options.dest)(options);
		options.dest = fsext.relative(options.dest);

		var list = fsext.glob(srcPath, options.globs, { dirs: false });
		var zip = require("node-native-zip-compression");

		var scodest = path.dirname(options.dest);
		fsext.mkdirp({dest:scodest, norel:true});

		var archive = new zip();
		var zipFiles = [];
		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.path).substr(options.root.length);
			shortenedPath = shortenedPath.replace(/\\/g, "/");
			if (shortenedPath.substr(0,1) == "/") shortenedPath = shortenedPath.substr(1);
			zipFiles.push(
				{ "name": shortenedPath, path: item.path }
			);
		}

		taskqueue.on("finalProcessing", function() {
			taskqueue.add({"@name": "zip", src: zipFiles, dest: options.dest }, function(opts, done) {
			
				archive.addFiles(opts.src, function (err) {
				    if (err) return logger.log("Err while adding files", 2);
				    
				    archive.toBuffer(function(buff){;
					    fs.writeFile(opts.dest, buff, function () {
					        done("zip", opts);
					    });
					});
				});

			});
		});

	},
	reset: function() {
		
	}
};