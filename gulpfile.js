'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var server = require('browser-sync').create();
var minify = require('gulp-csso');
var rename = require('gulp-rename');
var imagemin = require('gulp-imagemin');
var webp = require('gulp-webp');
var svgstore = require('gulp-svgstore');
var posthtml = require('gulp-posthtml');
var include = require('posthtml-include');
var del = require('del');
var run = require('run-sequence');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var pug = require('gulp-pug');
var combiner = require('stream-combiner2');

gulp.task('style', function () {
  gulp.src('scss/main.scss')
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(sass())
      .pipe(postcss([
        autoprefixer()
      ]))
      .pipe(gulp.dest('build/css'))
      .pipe(minify())
      .pipe(rename('style.min.css'))
      .pipe(sourcemaps.write(''))
      .pipe(gulp.dest('build/css'))
      .pipe(server.stream());
});

gulp.task('browserify', function () {
  return combiner.obj([
    browserify('js/main.js', {
      debug: true
    }).bundle(),
    source('script.js'),
    buffer(),
    sourcemaps.init({
      loadMaps: true
    }),
    uglify(),
    rename({
      suffix: '.min'
    }),
    sourcemaps.write(''),
    gulp.dest('build/js/'),
    server.stream()
  ])
  .on('error', console.error.bind(console));
});

gulp.task('images', function () {
  return gulp.src('img/**/*.{jpg,png,svg}')
      .pipe(imagemin([
        imagemin.optipng({optimizationLevel: 3}),
        imagemin.jpegtran({progressive: true}),
        imagemin.svgo()
      ]))
      .pipe(gulp.dest('build/img'));
});

gulp.task('webp', function () {
  return gulp.src('img/**/*.{png,jpg}')
      .pipe(webp({quality: 90}))
      .pipe(gulp.dest('build/img'));
});

gulp.task('sprite', function () {
  return gulp.src('img/*.svg')
      .pipe(svgstore({
        inlineSvg: true
      }))
      .pipe(rename('sprite.svg'))
      .pipe(gulp.dest('build/img'));
});

gulp.task('views', function () {
  return gulp.src('views/*.pug')
      .pipe(plumber())
      .pipe(pug({
        pretty: true
      }))
      .pipe(gulp.dest('build/'))
      .pipe(server.stream());
});

gulp.task('serve', function () {
  server.init({
    server: 'build/',
    notify: false,
    open: false,
    cors: true,
    ui: false
  });

  gulp.watch('scss/**/*.{scss,sass}', ['style']);
  gulp.watch('js/**/*.js', ['browserify']);
  gulp.watch('views/**/*.pug', ['views']);
  gulp.watch('img/**/*.{jpg,png,svg}', ['images', 'copy']);
});

gulp.task('copy', function () {
  return gulp.src([
    'fonts/**/*.{woff,woff2}',
    'img/**',
    'video/**',
    'js/transit/*.js'
  ], {
    base: '.'
  })
      .pipe(gulp.dest('build'));
});

gulp.task('clean', function () {
  return del('build');
});

gulp.task('build', function (done) {
  run('clean', 'copy', 'style', 'browserify', 'images', 'sprite', 'views', done);
});