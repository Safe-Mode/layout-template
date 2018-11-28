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
const rollup = require(`gulp-better-rollup`);
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require(`rollup-plugin-commonjs`);
const babel = require('rollup-plugin-babel');
const pug = require('gulp-pug');

const renderViews = (path) => {
  return gulp.src(path)
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest('build/'))
    .pipe(server.stream());
};

gulp.task('views', () => {
  return renderViews('views/*.pug');
});

gulp.task('style', () => {
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

gulp.task('scripts', () => {
  return gulp.src('js/main.js')
      .pipe(plumber())
      .pipe(sourcemaps.init({
        loadMaps: true
      }))
      .pipe(rollup({
        plugins: [
          resolve(),
          commonjs({
            include: 'node_modules/**'
          }),
          babel({
            babelrc: false,
            presets: [
              [
                '@babel/env',
                {
                  useBuiltIns: 'usage'
                }
              ]
            ]
          })
        ]
      }, 'iife'))
      .pipe(uglify())
      .pipe(rename('script.min.js'))
      .pipe(sourcemaps.write(''))
      .pipe(gulp.dest('build/js'))
      .pipe(server.stream());
});

gulp.task('images', () => {
  return gulp.src('img/**/*.{jpg,png,svg}')
      .pipe(imagemin([
        imagemin.optipng({optimizationLevel: 3}),
        imagemin.jpegtran({progressive: true}),
        imagemin.svgo()
      ]))
      .pipe(gulp.dest('build/img'));
});

gulp.task('webp', () => {
  return gulp.src('img/**/*.{png,jpg}')
      .pipe(webp({quality: 90}))
      .pipe(gulp.dest('build/img'));
});

gulp.task('sprite', () => {
  return gulp.src('img/*.svg')
      .pipe(svgstore({
        inlineSvg: true
      }))
      .pipe(rename('sprite.svg'))
      .pipe(gulp.dest('build/img'));
});

gulp.task('serve', () => {
  server.init({
    server: 'build/',
    notify: true,
    open: false,
    cors: true,
    ui: false
  });

  gulp.watch('views/**/*.pug', (event) => {
    return renderViews(event.path);
  });

  gulp.watch('scss/**/*.{scss,sass}', ['style']);
  gulp.watch('js/**/*.js', ['scripts']);
  gulp.watch('views/**/*.pug', ['views']);
  gulp.watch('img/**/*.{jpg,png,svg}', ['images', 'copy']);
});

gulp.task('copy', () => {
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

gulp.task('clean', () => {
  return del('build');
});

gulp.task('build', (done) => {
  run('clean', 'copy', 'style', 'scripts', 'images', 'webp', 'sprite', 'views', done);
});
