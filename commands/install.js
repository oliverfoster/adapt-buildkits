#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../lib/fsext.js");
var logger = require("../lib/logger.js");
var _ = require("underscore");
var semver = require("semver");
var url = require("url");

function entryPoint(buildkitName) {

	var adaptVersion;
	if (!buildkitName) {
		adaptVersion = getAdaptVersion();
	}

	var availableBuildkits = findAvailableBuildkits();

	logger.log((!buildkitName ? "":"\n")+"Adapt BuildKit versions found:\n '"+_.keys(availableBuildkits).join("', '")+"'\n",0);

	require("../commands/uninstall.js")(true);

	var matchingBuildKits = findMatchingBuildKits(availableBuildkits, adaptVersion);
	
	var chosenBuildKit;
	if (!buildkitName) {
		
		if (_.keys(matchingBuildKits).length === 0) {
			logger.error("No compatible buildkits found.");
			process.exit(0);
		}
		
		logger.log("Compatible BuildKit versions found:\n '"+_.keys(matchingBuildKits).join("', '")+"'\n",0);
		
		var matchingBuildKitsSorted;
		matchingBuildKitsSorted = _.values(matchingBuildKits).sort(function(a,b) {
			return a.priority - b.priority;
		});
		chosenBuildKit = matchingBuildKitsSorted[0];
	} else {
		var indexed = _.indexBy(availableBuildkits, "name");
		if (!indexed[buildkitName]) {
			logger.error("Buildkit "+buildkitName+" not found.");
			process.exit(0);
		}
		chosenBuildKit = indexed[buildkitName];
	}

	logger.log("Trying Adapt BuildKit version: \n '"+chosenBuildKit.name+"'\n",0);


	checkBuildKitUpToDate(chosenBuildKit, function() {

		installBuildKit(chosenBuildKit);

	}, this);

	
}
module.exports = entryPoint;

function getAdaptVersion() {
	if (!fs.existsSync("package.json")) {
		logger.error("No Adapt Framework package.json available!");
		exit(0);
	}
	
	var packageJSON = JSON.parse(fs.readFileSync("package.json"));
	logger.log("\nAdapt Framework version found: \n '"+ packageJSON.version+"'\n", 0);

	return  packageJSON.version;
}

function findAvailableBuildkits() {
	var buildKitsConfig = JSON.parse(fs.readFileSync( path.join(__dirname, "../conf/buildkits.json") ));
	var indexed = _.indexBy(buildKitsConfig, "name");

	var origin = path.join(__dirname, "../buildkits");
	origin.replace(/\\/g, "/");

	var dirs = [];
	fsext.walkSync( origin ,function(rdirs, rfiles) {
		for (var i = 0, l = rdirs.length; i < l; i++ ) {
			rdirs[i] = rdirs[i].replace(/\\/g, "/");
			var ver = rdirs[i].substr(origin.length+1);
			
			if (!indexed[ver]) continue;
			indexed[ver].installed = true;
		}
	});

	return indexed;
}

function findMatchingBuildKits(availableBuildkits, adaptVersion) {
	var matching = {};
	for (var k in availableBuildkits) {
		if (semver.satisfies(adaptVersion, availableBuildkits[k].frameworkSupport)) {
			matching[availableBuildkits[k].name] = availableBuildkits[k];
		}
	}
	return matching;
}

function checkBuildKitUpToDate(buildkit, callback, that) {
	if (buildkit.installed) {
		if (buildkit.versionFile && buildkit.versionFileUrl) {
			var versionFilePath = path.join(__dirname, "../buildkits", buildkit.name, buildkit.versionFile);
			var versionJSON = JSON.parse(fs.readFileSync(versionFilePath));

			getBuildCurrentVersion(buildkit, function(version) {
				if (semver.lt(versionJSON.version, version)) {
					logger.log("'" + buildkit.name + "' BuildKit version out of date at v"+versionJSON.version + " downloading v"+version+"\n", 1);
					downloadBuildKit(buildkit, callback, that);
				} else {
					logger.log("'" + buildkit.name + "' BuildKit version is current at v"+versionJSON.version+"\n", 0);
					callback.call(that);
				}
			}, this);
		} else {
			callback.call(that);
		}
	} else {
		downloadBuildKit(buildkit, callback, that);
	}
}

function getBuildCurrentVersion(buildkit, callback, that) {
	var tempPath = path.join(__dirname, "../temp", buildkit.name);
		
	if (fs.existsSync(tempPath)) fsext.rm(tempPath);
	if (!fs.existsSync(tempPath)) fsext.mkdirp({dest:tempPath, norel: true});

	var downloadFileName = tempPath+"/version.json";
	fsext.rm(downloadFileName);

	download(buildkit.versionFileUrl+"?t="+(new Date()).getTime(), downloadFileName, function() {
		
		var versionJSON = JSON.parse(fs.readFileSync(downloadFileName));
		callback.call(that, versionJSON.version);

	}, this, true);
}

function downloadBuildKit(buildkit, callback, that) {
	var tempPath = path.join(__dirname, "../temp", buildkit.name);
	var outputPath = path.join(__dirname, "../buildkits", buildkit.name);
	
	if (fs.existsSync(tempPath)) fsext.rm(tempPath);
	if (!fs.existsSync(tempPath)) fsext.mkdirp({dest:tempPath, norel: true});

	var downloadFileName = tempPath+"/download.tar.gz";

	download(buildkit.tarballUrl, downloadFileName, function() {
		var targz = require("tar.gz");
		var compress = new targz().extract(downloadFileName, tempPath , function(err){
			fsext.walkSync(tempPath, function(dirs, files) {
				fsext.copy(dirs[0].path, outputPath, [ "**", ".*"], callback, that);
			}, this);
		});
	}, this);
}

function download(locationUrl, outputFileName, callback, that, isText) {
	var https = require("https");
	var urlParsed = url.parse(locationUrl);
	var req = https.request({
		hostname: urlParsed.hostname,
		port: 443,
		protocol: urlParsed.protocol,
		path: urlParsed.path,
		method: "GET"
	}, function(res) {
		if (res.headers.location) {
			return download(res.headers.location, outputFileName, callback, that);
		}
		var outputStream = fs.createWriteStream( outputFileName );
		res.pipe(outputStream);
		res.on("end", function() {
			setTimeout(function() {
				callback.call(that);
			}, 500);
		});
	});
	req.on("error", function(e) {
		console.log(e);
		process.exit(0);
	});
	req.end();
}

function installBuildKit(buildkit) {
	var origin = path.join(__dirname, "../buildkits", buildkit.name);
	origin.replace(/\\/g, "/");

	var oldCwd = process.cwd();
	if (buildkit.npmInstall) {
		if (buildkit.node_modulesCache) {

			process.chdir( origin );
			if (fs.existsSync("package.json")) {
				npmInstall(function() {
					copyMaker(finished, this, buildkit);
				}, this, oldCwd, buildkit);
			} else if (fs.existsSync("buildkit")) {
				process.chdir( path.join(origin, "buildkit") );
				npmInstall(function() {
					copyMaker(finished, this, buildkit);
				}, this, oldCwd, buildkit);
			} else {
				copyMaker(finished, this, buildkit);
			}

		} else {

			copyMaker(function() {
				if (fs.existsSync("package.json")) {
					npmInstall(finished, this, oldCwd, buildkit);
				} else if (fs.existsSync("buildkit")) {
					process.chdir( path.join(process.cwd(), "buildkit") );
					npmInstall(finished, this, oldCwd, buildkit);
				}
			}, this, buildkit);

		}
	} else {
		copyMaker(finished, this, buildkit);
	}

	function finished() {
		console.log ("Done.");
	}
}

function npmInstall(callback, that, oldCwd, buildkit) {
	var args = arguments;
	console.log("Adapt BuildKit NPM Install...\n");	
	process.umask(0000);
	var npm = require("npm");
	npm.load(function(er, npm) {
		npm.commands.install(function(er, data) {
			if (er) {
				console.log(er, data);
				process.exit(1)
			}
			process.chdir( oldCwd );
			console.log("\n");
			callback.apply(that, args);
		});			
	});
}


function copyMaker(callback, that, buildkit) {
	console.log("Installing Adapt BuildKit into current directory...\n")
	var origin = path.join(__dirname, "../buildkits", buildkit.name);
	origin = origin.replace(/\\/g, "/");

	fsext.copy(origin, process.cwd(), buildkit.copyGlobs, function() {
		makeUninstaller(buildkit);
		setPermissions(callback, that, buildkit);
	}, this);

	
}

function makeUninstaller(buildkit) {
	console.log("Making uninstall file...\n")
	var origin = path.join(__dirname, "../buildkits", buildkit.name);
	origin = origin.replace(/\\/g, "/");

	var list = fsext.glob( origin, buildkit.copyGlobs );
	var items = [];
	for (var i = 0, item; item = list[i++];) {
		items.push(item.path.substr(origin.length+1));
	}

	if (buildkit.node_modulesCache == false && buildkit.npmInstall == true) {
		items.push("node_modules");
	}

	buildkit.installed = items;

	var file = JSON.stringify(buildkit, null, "\t");
	fs.writeFileSync(".buildkit", file);
}


function setPermissions(callback, that, buildkit) {
	if (buildkit.executableGlobs) {
		console.log("Setting permissions on BuildKit in current directory...\n")
		var list = fsext.glob( process.cwd(), buildkit.executableGlobs );

		for (var i = 0, l = list.length; i < l; i ++) {
			fs.chmodSync(list[i].path, 0777);
		}
	}
	callback.call(that);
}