#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../lib/fsext.js");
var logger = require("../lib/logger.js");
var _ = require("underscore");
var semver = require("semver");

var oldCwd;
var origin;
var foundDir;
function entryPoint() {

	var availableBuildkits = findAvailableBuildkits();

	var output = "";
	_.each(availableBuildkits, function(item) {
		output += "\tBuildKit: "+item.name + "\n";
		output += "\tSupports Framework: " + item.frameworkSupport+"\n";
		output += "\n";
	});
	logger.log("\nAdapt BuildKit versions found:\n\n"+output+"\n",0);

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

module.exports = entryPoint;