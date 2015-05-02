#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../lib/fsext.js");
var logger = require("../lib/logger.js");
var _ = require("underscore");
var semver = require("semver");



logger.log("Fixing permission on builtkits...", 0);


var origin = path.join(__dirname, "../buildkits");
origin.replace(/\\/g, "/");

var list = fsext.glob( origin, "**");

for (var i = 0, l = list.length; i < l; i ++) {
	fs.chmodSync(list[i], 0777);
}

logger.log("Permission fixed.", 0);
