#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../lib/fsext.js");
var logger = require("../lib/logger.js");
var _ = require("underscore");
var semver = require("semver");
var url = require("url");

function entryPoint(quiet) {

	if (!fs.existsSync(".buildkit")) {
		if (!quiet) {
			logger.error("No uninstall file found.");
			process.exit();
		} else return;
	}

	logger.log("Uninstalling current Adapt BuildKit...\n",0);

	var json = JSON.parse(fs.readFileSync(".buildkit"));
	var files = json.installed || json;
	for (var i = files.length, item; item = files[--i];) {
		fsext.rm(item);
	}

	fsext.rm(".buildkit");

	if (!quiet) logger.log("Done.",0);

	
}
module.exports = entryPoint;
