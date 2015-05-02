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


	origin = path.join(__dirname, "../buildkits");
	origin.replace(/\\/g, "/");

	var dirs = [];
	fsext.walkSync( origin ,function(rdirs, rfiles) {
		for (var i = 0, l = rdirs.length; i < l; i++ ) {
			rdirs[i] = rdirs[i].replace(/\\/g, "/");
			var ver = rdirs[i].substr(origin.length+1);
			dirs.push(ver);
		}
	});
	dirs.sort(function(a,b) {
		if (!semver.valid(a) && !semver.valid(b)) return 0;
		if (!semver.valid(a) && semver.valid(b)) return -1;
		if (semver.valid(a) && !semver.valid(b)) return 1;
		if (semver.gt(a,b)) return 1;
		if (semver.lt(a,b)) return -1;
		return 0;
	});

	logger.log("\nAdapt BuildKit versions found:\n '"+dirs.join("', '")+"'\n",0);
}

module.exports = entryPoint;