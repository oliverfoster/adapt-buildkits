var program = require("./lib/program.js");
var runner = require("./lib/runner.js");

var options = program;
options.mode = "build";
runner(options);