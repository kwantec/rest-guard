/**
 * Created by rramirez on 7/1/15.
 */

var gulp = require('gulp');
var gulpLoadPlugins = require('gulp-load-plugins');
var plugins = gulpLoadPlugins();

gulp.task('default', function () {
    return gulp.src(['test/*-test.js'])
        .pipe(plugins.mocha({
            reporter: 'spec'
        }));
});
