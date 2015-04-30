
var chalk = require("chalk");

var pub = {
	runlog: function(options) {
		if (options.dynamic === false) {
			if (options["@displayName"]) console.log(options["@displayName"]);
		} else {
			if (options['course']) {
				if (options["@displayName"]) console.log(options['course'], "-", options["@displayName"]);
			} else {
				if (options["@displayName"]) console.log(options["@displayName"]);
			}
		}
	},
	log: function(text, level) {
		switch(level) {
		case -1:
			console.log(chalk.bgRed(text));
			break;
		case 0:
			console.log(chalk.bgWhite(text));
			break;
		case 1:
			console.log(chalk.yellow(text));
			break;
		case 2:
			console.log(chalk.blue(text));
			break;
		}
	}
};

module.exports = pub;