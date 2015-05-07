var gulp = require('gulp'),
    gutil = require('gulp-util'),
    jshint = require('gulp-jshint'),
    clean = require('gulp-clean'),
    sourcemaps = require('gulp-sourcemaps'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    watchify = require('watchify'),
    browserify = require('browserify'),
    uglifyify = require('uglifyify'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer');

var express = require('express'),
    serverport = 5000;

var serverRoot = 'dist';

// JSHint task
gulp.task('jshint', jshintTask);

// Watchify tasks
gulp.task('watchify', makeWatchify('./app/scripts/index.js',serverRoot));

// App views tasks
gulp.task('cleanIndex', cleanIndex(serverRoot));
gulp.task('cleanViews', cleanViews(serverRoot));
gulp.task('copyIndex', ['cleanIndex'], copyIndex('./app',serverRoot));
gulp.task('copyViews', ['cleanViews'], copyViews('./app',serverRoot));

// App styles tasks
gulp.task('cleanStyles', cleanStyles(serverRoot));
gulp.task('styles', ['cleanStyles'], styles('./app',serverRoot));
// App assets task
gulp.task('cleanAssets', cleanAssets(serverRoot));
gulp.task('copyAssets', ['cleanAssets'], copyAssets('./app',serverRoot));

var jshintBlobs = [
  './app/scripts/*.js','./app/scripts/**/*.js',
  ];
var buildTasks = [
  'jshint',
  'watchify', 'copyAssets', 'copyIndex', 'copyViews', 'styles',
  ];
gulp.task('watch', buildTasks, function() {
  // Watch our scripts
  gulp.watch(jshintBlobs,['jshint']);

  // Watch app files
  gulp.watch('./app/styles/*.scss',['styles']);
  gulp.watch('./app/*.html', ['copyIndex']);
  gulp.watch(['./app/views/*','./app/views/**/*'], ['copyViews']);
  //gulp.watch('./app/assets/**/*', ['copyAssets']);
});

gulp.task('dev', ['watch'], function() {
  var server = express();
  server.use(express.static('./dist'));
  // Redirects everything back to index.html
  server.all('/*', function(req, res) {
      res.sendFile('/index.html', { root: serverRoot });
  });
  // Start webserver
  server.listen(serverport);
  console.log('Server listening at port',serverport);
});

function jshintTask() { // jshint task
  gulp.src(jshintBlobs)
  .pipe(jshint())
  // You can look into pretty reporters as well, but that's another story
  .pipe(jshint.reporter('default'));
}

function makeWatchify(mainScript, outPath, bundleName) { // Watchify task builder
  var bundleName = bundleName || 'bundle.js';
  var bundler = watchify(browserify(mainScript, watchify.args));
  bundler.on('update', watchifyBundle); // on any dep update, runs the bundler
  bundler.on('log', gutil.log); // output build logs to terminal
  bundler.transform('browserify-ngannotate',{});
  //bundler.transform('uglifyify',{global: true});

  return watchifyBundle;

  function watchifyBundle() {
    return bundler.bundle()
      .on('error', gutil.log.bind(gutil, 'Browserify Error'))
      .pipe(source(bundleName))
      // Output it to our dist folder
      .pipe(gulp.dest(outPath));
  }
}

function cleanIndex(outFolder) { // cleanIndex task builder
  return function() {
    return gulp.src(outFolder+'/*.html', {read: false})
      .pipe(clean());
  };
}
function copyIndex(appFolder,outFolder) { // copyIndex task builder
  return function() {
    return gulp.src([appFolder+'/*.html'])
      .pipe(gulp.dest(outFolder+'/'));
  };
}
function cleanViews(outFolder) { // cleanViews task builder
  return function() {
    return gulp.src(outFolder+'/views/', {read: false})
      .pipe(clean());
  };
}
function copyViews(appFolder,outFolder) { // copyViews task builder
  return function() {
    return gulp.src(appFolder+'/views/**/*')
      .pipe(gulp.dest(outFolder+'/views/'));
  };
}
function cleanAssets(outFolder) { // cleanAssets task builder
  return function() {
    return gulp.src(outFolder+'/assets/', {read: false})
      .pipe(clean());
  };
}
function copyAssets(appFolder,outFolder) { // assets task builder
  return function() {
    return gulp.src(appFolder+'/assets/**/*')
      .pipe(gulp.dest(outFolder+'/assets/'));
  };
}

function cleanStyles(outFolder) { // cleanStyles task builder
  return function() {
    return gulp.src(outFolder+'/css/', {read: false})
      .pipe(clean());
  };
}
function styles(appFolder,outFolder) { // styles task builder
  return function() {
    return gulp.src(appFolder+'/styles/*.scss')
      // The onError handler prevents Gulp from crashing when you make a mistake in your SASS
      .pipe(sass({onError: function(e) { console.log(e); } }))
      // Optionally add autoprefixer
      .pipe(autoprefixer("last 2 versions", "> 1%", "ie 8"))
      // These last two should look familiar now :)
      .pipe(gulp.dest(outFolder+'/css'));
  };
}
