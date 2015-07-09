#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../libraries/fsext.js");
var logger = require("../libraries/logger.js");
var _ = require("underscore");
var semver = require("semver");
var url = require("url");

var pub = {

	entryPoint: function (buildkitName) {

		//find adapt version
		var adaptVersion;
		if (!buildkitName) adaptVersion = pub.getAdaptVersion();

		//list current buildkits
		var availableBuildkits = pub.findAvailableBuildkits();
		logger.log((!buildkitName ? "":"\n")+"Buildkit versions found:\n '"+_.keys(availableBuildkits).join("', '")+"'\n",0);

		//uninstall previous
		require("../commands/uninstall.js").entryPoint(true);
	
		
		var chosenBuildkit;
		if (!buildkitName) {
			//choose buildkit if non specified
			//match a buildkit to the adaptversion
			var matchingBuildkits = pub.findMatchingBuildkits(availableBuildkits, adaptVersion);

			if (_.keys(matchingBuildkits).length === 0) {
				logger.error("No compatible Buildkits found.");
				process.exit(0);
			}
			
			logger.log("Compatible Buildkit found:\n '"+_.keys(matchingBuildkits).join("', '")+"'\n",0);
			
			var matchingBuildkitsSorted;
			matchingBuildkitsSorted = _.values(matchingBuildkits).sort(function(a,b) {
				return a.priority - b.priority;
			});
			chosenBuildkit = matchingBuildkitsSorted[0];

		} else {
			//install specified buildkit
			var indexed = _.indexBy(availableBuildkits, "name");
			if (!indexed[buildkitName]) {
				logger.error("Buildkit "+buildkitName+" not found.");
				process.exit(0);
			}
			chosenBuildkit = indexed[buildkitName];
		}


		logger.log("Installing: \n '"+chosenBuildkit.name+"'\n",0);
		pub.checkBuildkitUpToDate(chosenBuildkit, function() {

			pub.installBuildkit(chosenBuildkit);

		}, this);

		
	},

	getAdaptVersion: function () {
		if (!fs.existsSync("package.json")) {
			logger.error("No Adapt Framework package.json available!");
			return "0.0.0";
			//exit(0);
		}
		
		var packageJSON = JSON.parse(fs.readFileSync("package.json"));
		logger.log("\nAdapt Framework version found: \n '"+ packageJSON.version+"'\n", 0);

		return  packageJSON.version;
	},

	findAvailableBuildkits: function() {
		var buildKitsConfig = JSON.parse(fs.readFileSync( path.join(__dirname, "../configurations/buildkits.json") ));
		var indexed = _.indexBy(buildKitsConfig, "name");

		var origin = path.join(__dirname, "../buildkits");
		origin.replace(/\\/g, "/");

		var dirs = [];
		var lists = fsext.list( origin );

		for (var i = 0, l = lists.dirs.length; i < l; i++ ) {
			lists.dirs[i] = lists.dirs[i].replace(/\\/g, "/");
			var ver = lists.dirs[i].substr(origin.length+1);
			
			if (!indexed[ver]) continue;
			indexed[ver].installed = true;
		}

		return indexed;
	},

	findMatchingBuildkits: function (availableBuildkits, adaptVersion) {
		var matching = {};
		for (var k in availableBuildkits) {
			if (semver.satisfies(adaptVersion, availableBuildkits[k].frameworkSupport)) {
				matching[availableBuildkits[k].name] = availableBuildkits[k];
			}
		}
		return matching;
	},

	checkBuildkitUpToDate: function(buildkit, callback, that) {
		
		if (buildkit.installed) {
			//if buildkit is installed, check that it is up to date
			if (buildkit.versionFile && buildkit.versionFileUrl) {
				var versionFilePath = path.join(__dirname, "../buildkits", buildkit.name, buildkit.versionFile);
				
				if (!fs.existsSync(versionFilePath)) {
					return pub.downloadBuildkit(buildkit, callback, that);
				}
				var versionJSON = JSON.parse(fs.readFileSync(versionFilePath));

				pub.getBuildCurrentVersion(buildkit, function(version) {
					//updated the buildkit if out of date
					if (semver.lt(versionJSON.version, version)) {
						logger.log("Version out of date at v"+versionJSON.version + " downloading v"+version+"\n", 1);
						pub.downloadBuildkit(buildkit, callback, that);
					} else {
						logger.log("Version is current at v"+versionJSON.version+"\n", 0);
						callback.call(that);
					}
				}, this);

			} else {
				//buildkit version not specified, assume version is ok
				callback.call(that);
			}

		} else {

			//buildkit not installed, download
			pub.downloadBuildkit(buildkit, callback, that);

		}
	},

	getBuildCurrentVersion: function(buildkit, callback, that) {
		//get version online
		var tempPath = path.join(__dirname, "../temp", buildkit.name);
			
		if (fs.existsSync(tempPath)) fsext.rm(tempPath);
		if (!fs.existsSync(tempPath)) fsext.mkdir(tempPath, {norel: true});

		var downloadFileName = tempPath+"/version.json";
		fsext.rm(downloadFileName);

		pub.download(buildkit.versionFileUrl+"?t="+(new Date()).getTime(), downloadFileName, function() {
			
			var versionJSON = JSON.parse(fs.readFileSync(downloadFileName));
			fsext.rm(downloadFileName);
			callback.call(that, versionJSON.version);

		}, this, true);
	},

	downloadBuildkit: function (buildkit, callback, that) {
		//download, extract and copy to buildkits folder
		var tempPath = path.join(__dirname, "../temp", buildkit.name);
		var outputPath = path.join(__dirname, "../buildkits", buildkit.name);
		
		if (fs.existsSync(tempPath)) fsext.rm(tempPath);
		if (fs.existsSync(outputPath)) fsext.rm(outputPath);
		if (!fs.existsSync(tempPath)) fsext.mkdir(tempPath, {norel: true});

		var downloadFileName = tempPath+"/download.tar.gz";

		logger.log("Caching a local copy:", 0);
		logger.log(" Downloading (this may take a while)...", 0);
		pub.download(buildkit.tarballUrl, downloadFileName, function() {
			logger.log(" Extracting...",0);
			var targz = require("tar.gz");
			var compress = new targz().extract(downloadFileName, tempPath , function(err){
				logger.log(" Caching...\n", 0);
				var lists = fsext.list(tempPath);
				fsext.copy(lists.dirs[0].path, outputPath, [ "**", ".*"], function() {
					if (fs.existsSync(downloadFileName)) fsext.rm(downloadFileName);
					callback.call(that);
				}, that);
			});
		}, this);
	},

	download: function(locationUrl, outputFileName, callback, that, isText) {
		//download any file to a location
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
				return pub.download(res.headers.location, outputFileName, callback, that);
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
	},

	installBuildkit: function(buildkit) {
		var origin = path.join(__dirname, "../buildkits", buildkit.name);
		origin.replace(/\\/g, "/");

		var oldCwd = process.cwd();
		if (buildkit.npmInstall) {
			if (buildkit.node_modulesCache) {
				//npm install in the buildkits folder and copy all to current directory
				process.chdir( origin );
				if (fs.existsSync("package.json")) {
					pub.npmInstall(function() {
						pub.copyMaker(finished, this, buildkit);
					}, this, oldCwd, buildkit);
				} else if (fs.existsSync("buildkit")) {
					process.chdir( path.join(origin, "buildkit") );
					pub.npmInstall(function() {
						pub.copyMaker(finished, this, buildkit);
					}, this, oldCwd, buildkit);
				} else {
					pub.copyMaker(finished, this, buildkit);
				}

			} else {
				//copy maker to current directory and npminstall there
				pub.copyMaker(function() {
					if (fs.existsSync("package.json")) {
						pub.npmInstall(finished, this, oldCwd, buildkit);
					} else if (fs.existsSync("buildkit")) {
						process.chdir( path.join(process.cwd(), "buildkit") );
						pub.npmInstall(finished, this, oldCwd, buildkit);
					}
				}, this, buildkit);

			}
		} else {
			//copy make to current directory with no npm install
			pub.copyMaker(finished, this, buildkit);
		}

		function finished() {
			console.log ("Done.");
		}
	},

	npmInstall: function (callback, that, oldCwd, buildkit) {
		var args = arguments;
		console.log("Buildkit NPM Install...\n");	
		process.umask(0000);
		var npm = require("npm");
		npm.load(function(er, npm) {
			npm.commands.install(function(er, data) {
				if (er) {
					console.log(er, data);
					process.exit(1)
				}
				process.chdir( oldCwd );
				callback.apply(that, args);
			});			
		});
	},


	copyMaker: function (callback, that, buildkit) {
		console.log("Installing into current directory...\n")
		var origin = path.join(__dirname, "../buildkits", buildkit.name);
		origin = origin.replace(/\\/g, "/");

		fsext.copy(origin, process.cwd(), buildkit.copyGlobs, function() {
			pub.makeUninstaller(buildkit);
			pub.setPermissions(callback, that, buildkit);
		}, this);	
	},

	makeUninstaller: function (buildkit) {
		console.log("Creating uninstall file...\n")
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
	},


	setPermissions: function (callback, that, buildkit) {
		if (buildkit.executableGlobs) {
			console.log("Correcting permissions...\n")
			var list = fsext.glob( process.cwd(), buildkit.executableGlobs );

			for (var i = 0, l = list.length; i < l; i ++) {
				fs.chmodSync(list[i].path, 0777);
			}
		}
		callback.call(that);
	}
}

module.exports = pub;

