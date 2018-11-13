'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const server = require('browser-sync').create();
const minify = require('gulp-csso');
const rename = require('gulp-rename');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const svgstore = require('gulp-svgstore');
const del = require('del');
const run = require('run-sequence');
const uglify = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const pug = require('gulp-pug');
const combiner = require('stream-combiner2');

const renderViews = function (path) {
  return gulp.src(path)
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('build/'))
    .pipe(server.stream());
};

gulp.task('views', function () {
  return renderViews('views/*.pug');
});

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

gulp.task('serve', function () {
  server.init({
    server: 'build/',
    notify: false,
    open: false,
    cors: true,
    ui: false
  });

  gulp.watch('views/**/*.pug', function (event) {
    return renderViews(event.path);
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
