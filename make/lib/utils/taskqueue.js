var ProgressBar = require('progress');
var chalk = require("chalk");
var _ = require("underscore");
var tasks = [];
var total = 0;
var interval = null;
var running = 0;
var bar;
var displayed = false;
var completed = 0;
var maxTasks = 20;

var events = require('events');
var eventEmitter = new events.EventEmitter();


var pub =  _.extend(eventEmitter, {
	isRunning:function() {
		return (completed < total);
	},
	runlog: function(options) {
		if (options.dynamic === false) {
			if (options["@displayName"]) console.log(chalk.green(options["@displayName"]));
		} else {
			if (options["@displayName"]) console.log(chalk.green(options['course'], options["@displayName"]));
		}
	},
	log: function(text, level) {
		switch(level) {
		case 0:
			console.log(chalk.green(text));
			break;
		case 1:
			console.log(chalk.yellow(text));
			break;
		}
	},
	add: function(options, executor) {
		tasks.push({
			options: options,
			executor: executor
		});
		total++;
		pub.start();
	},
	start: function() {
		if (interval !== null) return;
		interval = setInterval(pub.loop,0);
	},
	loop: function() {
		if (!displayed) {
			bar = new ProgressBar(':current/:total [:bar] :percent', {
				complete: '=',
			    incomplete: ' ',
			    width: 20,
			    total: total+1
			});
			bar.tick();
			displayed = true;
		}
		for (var i = 0, l = tasks; running < maxTasks && i < tasks.length; i++) {
			running++;
			var task = tasks.shift();
			task.executor(task.options, pub.done);
		}
	},
	done: function(name, options) {
		bar.tick();
		running--;
		completed++;
		if (completed >= total) {
			clearInterval(interval);
			interval = null;
			console.log();
			pub.emit("end");
		}
	}
});


module.exports = pub;