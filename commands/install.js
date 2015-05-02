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


var origin = path.join(__dirname, "../buildkits");
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

logger.log("Adapt BuildKit versions available: "+dirs.join(","),0);

var foundDir = "";
for (var i = dirs.length -1; i > -1; i--) {
	if (semver.satisfies(packageJSON.version, ">="+dirs[i])) {
		foundDir = dirs[i];
		break;
	}
}

if (!foundDir) return logger.error("No matching version found.");
logger.log("Using Adapt BuildKit version: "+foundDir,0);

console.log("Adapt BuildKit NPM Install...");	
var oldCwd = process.cwd();
process.chdir( path.join(origin, foundDir, "buildkit") );
console.log(path.join(origin, foundDir));
process.umask(0000);
var npm = require("npm");
npm.load(function(er, npm) {
	npm.commands.install(function(er, data) {
		if (er) {
			console.log(er, data);
			process.exit(1)
		}
		console.log("Finished Adapt BuildKit NPM Install.")
		copyMaker();
	});			
});


var done = 0;

function copyMaker() {
	console.log("Installing BuildKit into current directory....")
	process.chdir(oldCwd);
	origin = path.join(origin, foundDir)
	var list = fsext.glob( origin, "**");

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

			addCopyTask(item.path, outputPath);
		}
	}
}

var copyTasks = [];
var limit = 20;
var currentRunning = 0;
var copyInterval = null;

function addCopyTask(from, to) {
	copyTasks.push({
		from: from,
		to: to
	});
	copyStart();
}
function copyStart() {
	if (copyInterval !== null) return;
	copyInterval = setInterval(runCopyTasks);
}
function runCopyTasks() {
	if (currentRunning >= limit) return;
	for (var i = 0, l = copyTasks.length; i < l && currentRunning < limit; i++) {
		var task = copyTasks.shift();
		copy(task.from, task.to);
	}
	
}
function copyFinish() {
	if (copyInterval === null) return;
	clearInterval(copyInterval);
}

function copy(from, to) {
	currentRunning++;
	var readStream = fs.createReadStream(from)

	readStream.pipe(fs.createWriteStream(to));

	readStream.on("end", function() {
		done++;
		currentRunning--;
		if (copyTasks.length === 0 && currentRunning <= 0) {
			copyFinish();
			console.log("Finished installing BuildKit.", done, "files copied.");	
		}
	});
}