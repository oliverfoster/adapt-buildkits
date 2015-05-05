#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var fsext = require("../lib/fsext.js");
var logger = require("../lib/logger.js");
var _ = require("underscore");
var semver = require("semver");



logger.log("Fixing permission on buildkits...", 0);
logger.log("Fixing permission on temp folder...", 0);


var origin = path.join(__dirname, "../buildkits");
origin.replace(/\\/g, "/");

var list = fsext.glob( origin, "**");

for (var i = 0, l = list.length; i < l; i ++) {
	fs.chmodSync(list[i].path, 0777);
}



origin = path.join(__dirname, "../temp");
if (!fs.existsSync(origin)) fsext.mkdirp({dest:origin, norel:true});
origin.replace(/\\/g, "/");

list = fsext.glob( origin, "**");

for (var i = 0, l = list.length; i < l; i ++) {
	fs.chmodSync(list[i].path, 0777);
}


logger.log("Permission fixed.", 0);
