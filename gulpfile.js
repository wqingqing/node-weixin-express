var path = require('path');
var gulp = require('gulp');
var eslint = require('gulp-eslint');
var excludeGitignore = require('gulp-exclude-gitignore');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var nsp = require('gulp-nsp');
var plumber = require('gulp-plumber');
var coveralls = require('gulp-coveralls');
var babel = require('gulp-babel');
var del = require('del');
var isparta = require('isparta');

// Initialize the babel transpiler so ES2015 files gets compiled
// when they're loaded
require('babel-core/register');

var frontends = ['lib/**/*.png', 'lib/**/*.html', 'lib/**/*.ejs', 'lib/**/*.css'];
var backends = ['lib/**/*.js', '!lib/statics/**/*.js', '!lib/views/**/*.js'];

gulp.task('static', function () {
  return gulp.src(backends)
    .pipe(excludeGitignore())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('nsp', function (cb) {
  nsp({package: path.resolve('package.json')}, cb);
});

gulp.task('pre-test', function () {
  return gulp.src(backends)
    .pipe(istanbul({
      includeUntested: true,
      instrumenter: isparta.Instrumenter
    }))
    .pipe(istanbul.hookRequire())
    ;
});

gulp.task('test', ['pre-test'], function (cb) {
  var mochaErr;

  gulp.src('test/**/*.js')
    .pipe(plumber())
    .pipe(mocha({reporter: 'spec'}))
    .on('error', function (err) {
      mochaErr = err;
      throw err;
    })
    .pipe(istanbul.writeReports())
    .on('end', function () {
      cb(mochaErr);
    });
});

gulp.task('coveralls', ['test'], function () {
  if (!process.env.CI) {
    return;
  }

  return gulp.src(path.join(__dirname, 'coverage/lcov.info'))
    .pipe(coveralls());
});

gulp.task('babel', ['clean'], function () {
  return gulp.src(backends)
    .pipe(babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('copy', function () {
  return gulp.src(frontends)
    .pipe(gulp.dest('dist'));
});

gulp.task('run', ['babel', 'copy']);

gulp.task('clean', function () {
  return del('dist');
});

gulp.task('watch', function() {
  gulp.watch(frontends, ['copy']);
  gulp.watch(backends, ['nsp', 'babel', 'test', 'copy']);
});

gulp.task('prepublish', ['nsp', 'babel']);
gulp.task('default', ['copy', 'static', 'test', 'coveralls']);