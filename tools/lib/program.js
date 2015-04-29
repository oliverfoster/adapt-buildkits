var program = require('commander');
var _ = require("underscore");
 
var items;

program
  .version('0.0.1')
  .arguments('[env...]')
  .option('-w, --watch', "watch for changes")
  .option('-f, --force', "watch for changes")
  .action(function (env) {
     items = env;
  });
 
program.parse(process.argv);

var switches = {};
_.each(program.options, function(opt) {
	var k = opt.long.slice(2);
	if (k == "version") return;
	switches[k] = program[k];
});


module.exports = {
	switches: switches,
	items: items || []
};