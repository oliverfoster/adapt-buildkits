#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../lib/fsext.js");
var logger = require("../lib/logger.js");
var _ = require("underscore");
var semver = require("semver");
var npm = require("npm");


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

var curDirIndex = 0;

function npmInstallMakers() {
	console.log("Building maker",  dirs[curDirIndex], "...");	
	var curPath = path.join(origin, dirs[curDirIndex], "make" );
	process.chdir( curPath );
	var npm = require("npm");
	npm.load(function(er, npm) {
		npm.commands.install(function() {
			console.log("Finished building makers",  dirs[curDirIndex]);	
			curDirIndex++
			if (curDirIndex >= dirs.length) return;
			setTimeout(npmInstallMakers);
		});			
	});
}

npmInstallMakers();


