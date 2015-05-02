#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../lib/fsext.js");
var logger = require("../lib/logger.js");
var _ = require("underscore");
var semver = require("semver");


if (!fs.existsSync("package.json")) {
	return logger.error("No Adapt Framework package.json available!");
}
var packageJSON = JSON.parse(fs.readFileSync("package.json"));
logger.log("Adapt Framework version: "+ packageJSON.version, 0);


var origin = path.join(__dirname, "../makers");
origin.replace(/\\/g, "/");

var dirs = [];
fsext.walkSync( origin ,function(rdirs, rfiles) {
	for (var i = 0, l = rdirs.length; i < l; i++ ) {
		rdirs[i] = rdirs[i].replace(/\\/g, "/");
		var ver = semver.clean(rdirs[i].substr(origin.length+1));
		dirs.push(ver);
	}
});
dirs.sort(function(a,b) {
	if (semver.gt(a,b)) return 1;
	if (semver.lt(a,b)) return -1;
	return 0;
});

logger.log("Adapt Maker versions available: "+dirs.join(","),0);

var foundDir = "";
for (var i = dirs.length -1; i > -1; i--) {
	if (semver.satisfies(packageJSON.version, ">="+dirs[i])) {
		foundDir = dirs[i];
		break;
	}
}

if (!foundDir) return logger.error("No matching version found.");
logger.log("Using Adapt Maker version: "+foundDir,0);

console.log("NPM Install...");	
var oldCwd = process.cwd();
process.chdir( path.join(origin, foundDir) );
var npm = require("npm");
npm.load(function(er, npm) {
	npm.commands.install(function() {
		console.log("Finished NPM Install.")
		copyMaker();
	});			
});


function copyMaker() {
	process.chdir(oldCwd);
	origin = path.join(origin, foundDir)
	var list = fsext.glob( origin, "**");

	var done = 0;

	for (var i = 0, l = list.length; i < l; i ++) {
		var item = list[i];
		var shortenedPath = (item.path).substr(origin.length);
		var outputPath = path.join(process.cwd(), shortenedPath);

		if (item.dir) {
			fsext.mkdirp({ dest: outputPath });
			done++;
		} else {
			var dirname = path.dirname(outputPath);
			fsext.mkdirp({ dest: dirname });

			if (fs.existsSync(outputPath)) {
				var outputStat = fs.statSync(outputPath);
					if (outputStat.mtime >= item.mtime) {
					done++;
					continue;
				};
			} 

			var readStream = fs.createReadStream(item.path)

			readStream.pipe(fs.createWriteStream(outputPath));

			readStream.on("end", function() {
				done++;
				if (done >= list.length) {
					console.log("Finished ", done, "files copied.");	
				}
			});
		}
	}
}
