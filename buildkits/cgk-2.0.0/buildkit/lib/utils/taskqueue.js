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
	reset: function() {
		tasks = [];
		total = 0;
		interval = null;
		running = 0;
		bar = undefined;
		displayed = false;
		completed = 0;
		maxTasks = 20;
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
	end: function() {
		
		pub.emit("postProcessing");
		pub.removeAllListeners("postProcessing");
		if (completed < total) return;
		pub.emit("finalProcessing");
		pub.removeAllListeners("finalProcessing");
		if (completed < total) return;
		console.log();
		clearInterval(interval);
		interval = null;
		pub.emit("end");
		pub.removeAllListeners("end");
	},
	done: function(name, options) {
		bar.tick();
		running--;
		completed++;
		if (completed >= total) {
			pub.end();
		}
	}
});


module.exports = pub;