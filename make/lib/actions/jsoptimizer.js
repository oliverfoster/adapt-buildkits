var requirejs = require('requirejs');
var fsext = require("../utils/fsext");
var taskqueue = require("../utils/taskqueue.js");
var path = require("path");
var fs = require("fs");
var sourcemapext = require("../utils/sourcemapext.js");
var _ = require("underscore");

var defaults = {
    optimize: "uglify2",
    generateSourceMaps: true,
    preserveLicenseComments: false,
    useSourceUrl: false
};


var outputCache = {};
var waitingNonDynamics = {};

module.exports = {
    perform: function(options) {
        options = _.extend({}, defaults, options);

        if (options.dest) options.out = options.dest;

        if (fs.existsSync(options.dest) && options.force !== true) {
            var files = fsext.glob(options.baseUrl, options.globs);
            var destStat = fs.statSync(options.dest);
            var changed = false;
            for (var i = 0, l = files.length; i < l; i++) {
                if (files[i].mtime > destStat.mtime) {
                    console.log(files[i].filename+files[i].extname, "has changed.");
                    changed = true;
                    break;
                }
            }
            if (!changed) return;
        }

        if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
        if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

        if (options.dynamic === false) {
            if (outputCache[options["@name"]]) {
                
                fsext.mkdirp({dest:path.dirname(options.dest)});
                fs.writeFileSync(fsext.relative(options.dest), outputCache[options["@name"]]);
                return;
            } else {
                if (waitingNonDynamics[options["@name"]]) {
                    
                    waitingNonDynamics[options["@name"]].push(options);
                    return;
                } else {
                    waitingNonDynamics[options["@name"]] = [];
                }
            }
        }
        taskqueue.runlog(options);

       

        if (options.empties) {
            for (var prefix in options.empties) {
                for (var atPath in options.empties[prefix]) {
                    var files = fsext.glob( atPath, [ options.empties[prefix][atPath] ]);
                    for (var f = 0, fl = files.length; f < fl; f++) {
                        options.paths[prefix+"/"+files[f].filename] = "empty:";
                    }
                }
            }
        }

        if (options.includes) {
            var cwd = path.join(process.cwd(), options.baseUrl);
            options.shim = options.shim || {};
            options.shim['app'] = options.shim['app'] || {};
            options.shim['app']['deps'] = options.shim['app']['deps'] || [];

            for (var prefix in options.includes) {
                for (var atPath in options.includes[prefix]) {
                    var files = fsext.glob( atPath, options.includes[prefix][atPath] );

                    for (var f = 0, fl = files.length; f < fl; f++) {
                        var relativePath = files[f].path.substr( cwd.length );
                        if (relativePath.substr(0,1)) relativePath = relativePath.substr(1);

                        var ext = path.extname(relativePath);
                    
                        relativePath = relativePath.slice(0, -ext.length);
                        
                        var moduleName = prefix+"/"+files[f].filename;
                        options.paths[moduleName] = relativePath;

                        options.shim['app']['deps'].push(moduleName);
                    }
                }
            }
        }


        switch (options.mode) {
        case "dev":
            options.generateSourceMaps = !options.switches.quick;
            options.optimize = "none";
            break;
        case "build":
            options.generateSourceMaps = false;
            options.optimize = !options.switches.quick ? "uglify2" : "none";
        } 

        taskqueue.add(options, function perform(options, done) {
            requirejs.optimize(options, function (buildResponse) {
                try {
                    if (options.sourceMapRelocate && options.generateSourceMaps) sourcemapext.relocate(options.dest + ".map", options.sourceMapRelocate);

                    if (!options.dynamic) {
                        if (options.generateSourceMaps) {
                            outputCache[ options['@name'] ] = {
                                javascript: fs.readFileSync(options.dest),
                                sourcemap: fs.readFileSync(options.dest + ".map")
                            };
                        } else {
                            outputCache[ options['@name'] ] = {
                                javascript: fs.readFileSync(options.dest)
                            };
                        }

                        if ( waitingNonDynamics[options["@name"]] ) {
                            var queue =  waitingNonDynamics[options["@name"]];
                            for (var i = 0, l = queue.length; i < l; i++) {
                                var item = queue[i];

                                fsext.mkdirp({dest:path.dirname(item.dest)});
                                if (options.generateSourceMaps) {
                                     fs.writeFileSync(fsext.relative(item.dest) + ".map", outputCache[options["@name"]].sourcemap );
                                }
                                fs.writeFileSync(fsext.relative(item.dest), outputCache[options["@name"]].javascript );
                            }
                        }
                        
                    }
                } catch(e) {
                    console.log(e);
                }

                done("js", options);

            }, function(err) {
                //optimization err callback
                console.log(err);
            });
        });

        
    },
    reset: function() {
        outputCache = {};
        waitingNonDynamics = {};
    }
};


