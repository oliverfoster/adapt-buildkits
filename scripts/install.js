#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../libraries/fsext.js");
var logger = require("../libraries/logger.js");
var _ = require("underscore");
var semver = require("semver");



logger.log("Fixing permission on buildkits...", 0);
logger.log("Fixing permission on temp folder...", 0);


var origin = path.join(__dirname, "../");
origin.replace(/\\/g, "/");

var list = fsext.glob( origin, [ "**/buildkits", "**/temp", "**/buildkits/**", "**/temp/**" ] );

for (var i = 0, l = list.length; i < l; i ++) {
	fs.chmodSync(list[i].path, 0777);
}


logger.log("Permission fixed.", 0);
