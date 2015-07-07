#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../libraries/fsext.js");
var logger = require("../libraries/logger.js");
var _ = require("underscore");
var semver = require("semver");

var oldCwd;
var origin;
var foundDir;

var pub = {
	entryPoint: function() {

		var availableBuildkits = pub.findAvailableBuildkits();

		var output = "";
		_.each(availableBuildkits, function(item) {
			output += "\tBuildkit: "+item.name + "\n";
			output += "\tSupports Framework: " + item.frameworkSupport+"\n";
			output += "\n";
		});
		logger.log("\nBuildkit versions found:\n\n"+output+"\n",0);

	},

	findAvailableBuildkits: function() {
		var buildKitsConfig = JSON.parse(fs.readFileSync( path.join(__dirname, "../configurations/buildkits.json") ));
		var indexed = _.indexBy(buildKitsConfig, "name");

		var origin = path.join(__dirname, "../buildkits");
		origin.replace(/\\/g, "/");

		var dirs = [];
		fsext.list( origin, function(rdirs, rfiles) {
			for (var i = 0, l = rdirs.length; i < l; i++ ) {
				rdirs[i] = rdirs[i].replace(/\\/g, "/");
				var ver = rdirs[i].substr(origin.length+1);
				
				if (!indexed[ver]) continue;
				indexed[ver].installed = true;
			}
		});

		return indexed;
	}
};

module.exports = pub;