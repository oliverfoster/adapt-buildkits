
var chalk = require("chalk");

var pub = {
	runlog: function(options) {
		if (options.dynamic === false) {
			if (options["@displayName"]) console.log(chalk.green(options["@displayName"]));
		} else {
			if (options['course']) {
				if (options["@displayName"]) console.log(chalk.green(options['course'], options["@displayName"]));
			} else {
				if (options["@displayName"]) console.log(chalk.green(options["@displayName"]));
			}
		}
	},
	log: function(text, level) {
		switch(level) {
		case 0:
			console.log(chalk.white(text));
			break;
		case 1:
			console.log(chalk.yellow(text));
			break;
		}
	}
};

module.exports = pub;