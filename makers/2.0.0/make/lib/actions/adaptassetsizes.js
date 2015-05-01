var fileCheck = function(options, config) {
        if (!Q) Q = require('q');
        if (!imagesize) imagesize = require('image-size-big-max-buffer');
        if (!path) path = require('path');
        if (!tap) tap = require('gulp-tap');

        var config = {
            globs: config.buildGlobs.files,
            gulp: { base: config.buildGlobs.srcPath, cwd: config.buildGlobs.srcPath}
        };

        var pathCheck = function(srcPath, options) {
            var deferred = Q.defer();

            var srcPath = stringReplace( srcPath , options.courseOptions);
            var fcOpts = options.filecheck.options;

            var suspects = [];
            gulp.src(srcPath, { base: "build", cwd:"."})
                .pipe(tap(function(file) {
                    var extension = path.extname(file.path).substr(1);;
                    switch ( extension ) {
                    case "jpeg":
                    case "jpg":
                    case "png":
                        try {
                            var data = imagesize(file.path);
                            file.width = data.width;
                            file.height = data.height;
                        } catch(e) {
                            file.flaggedProps = [
                                e
                            ];
                        }
                        break;
                    case "mp4":
                    case "ogv":
                        file.width = 0;
                        file.height = 0;
                        break
                    default:
                        return;
                    }

                    var settings = fcOpts[extension];
                    if(settings) {
                        if(file.size > settings.size) {
                            if(!file.flaggedProps) file.flaggedProps = [];
                            file.flaggedProps.push("filesize:" + (Math.round(file.size/100)/10) + "mb");
                        }
                        else if(file.width > settings.width) {
                            if(!file.flaggedProps) file.flaggedProps = [];
                            file.flaggedProps.push("width:" + file.width + "px");
                        }
                        else if(file.height > settings.height) {
                            if(!file.flaggedProps) file.flaggedProps = [];
                            file.flaggedProps.push("height:" + file.height + "px");
                        }
                        if(file.flaggedProps !== undefined) {
                            suspects.push(file);
                        }
                    }

                }))
                .on("end", function() {
                    if(suspects.length > 0) {
                        for(var i = 0, length = suspects.length; i < length; i++) {
                            console.log(chalk.bgMagenta("" + options.courseOptions.course + " - '" + suspects[i].relative + "' (" + suspects[i].flaggedProps + ")"));
                        }
                    }
                    deferred.resolve();
                });

            return deferred.promise;
        };

        console.log(chalk.white("" + options.courseOptions.course + " - Checking Files..."));

        var promises = [];
        
        for (var i = 0, l = options.filecheck.srcPaths.length; i < l; i++) {
            var srcPath = options.filecheck.srcPaths[i];
            promises.push(pathCheck(srcPath, options));
        }

        return Q.all(promises).then(function() {
            //console.log(chalk.white("" + options.courseOptions.course + " - Finished Checking Files."));
        });
    };