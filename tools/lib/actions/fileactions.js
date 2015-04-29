var fsext = require("../utils/fsext.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var chalk = require("chalk");


module.exports = {
	copy: function(options) {
		if (options.root === undefined) options.root = "";

		console.log(chalk.green(">", options['course'], ":", options['@displayName']));

		var srcPath = path.join(options.root, options.src);

		var list = fsext.glob(srcPath, options.globs);

		options.root = fsext.relative(options.root);
		options.dest = fsext.relative(options.dest);

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

				fs.createReadStream(item.path).pipe(fs.createWriteStream(outputPath));
			}
			
		}
	},
	collate: function(options) {
		if (options.root === undefined) options.root = "";

		console.log(chalk.green(">", options['course'], ":", options['@displayName']));

		var srcPath = path.join(options.root, options.src);

		var list = fsext.glob(srcPath, options.globs);

		options.root = fsext.relative(options.root);
		options.dest = fsext.relative(options.dest);

		var destList = fsext.glob(fsext.relative(options.dest), options.diffGlobs);

		for (var d = destList.length -1, dl = -1; d > dl; d--) {
			var destItem = destList[d];
			var shortenedPathDest = (destItem.path).substr( options.dest.length  );
			var found = false;
			for (var i = 0, l = list.length; i < l; i ++) {
				var srcItem = list[i];
				var shortenedPathSrc = (srcItem.path).substr( (srcItem.path).indexOf(options.on) + options.on.length  );
				if (shortenedPathDest == shortenedPathSrc) {
					found = true;
					break;
				}
			}
			if (!found) {
				console.log(chalk.yellow("Removing:", destItem.path.substr(process.cwd().length)));
				if (destItem.dir) {
					fs.rmdirSync(destItem.path);
				} else {
					fs.unlinkSync(destItem.path);
				}
			}
		}


		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.path).substr( (item.path).indexOf(options.on) + options.on.length  );
			var outputPath = path.join(options.dest, shortenedPath);

			if (item.dir) {
				fsext.mkdirp({ dest: outputPath });
			} else {
				var dirname = path.dirname(outputPath);
				fsext.mkdirp({ dest: dirname });

				var ifExists = fs.existsSync(outputPath);

				if (ifExists && options.force !== true) {
					var outputStat = fs.statSync(outputPath);
					if (outputStat.mtime >= item.mtime) continue;
				} 
				if (!ifExists) {
					console.log(chalk.yellow("Adding:", outputPath.path.substr(process.cwd().length)));
				}

				fs.createReadStream(item.path).pipe(fs.createWriteStream(outputPath));
			}
			
		}

	}
};