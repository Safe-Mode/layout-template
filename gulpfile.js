'use strict';

const path = require('path');
const { src, dest, series, watch } = require('gulp');
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

require('@babel/polyfill');

const renderViews = (blob) => {
  return src(blob)
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(dest('build'))
    .pipe(server.stream());
};

const clean = (done) => {
  del('build');
  done();
};

const copy = (done) => {
  src([
    'fonts/**/*.{woff,woff2}',
    'img/**',
    'video/**',
    'js/transit/*.js'
  ], {
    base: '.'
  })
      .pipe(dest('build'));
  done();
};

const views = (done) => {
  renderViews('views/*.pug');
  done();
};

const styles = (done) => {
  src('scss/main.scss')
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(sass())
      .pipe(postcss([
        autoprefixer()
      ]))
      .pipe(dest('build/css'))
      .pipe(minify())
      .pipe(rename('style.min.css'))
      .pipe(sourcemaps.write(''))
      .pipe(dest('build/css'))
      .pipe(server.stream());
  done();
};

const scripts = (done) => {
  src('js/main.js')
      .pipe(plumber())
      .pipe(sourcemaps.init({
        loadMaps: true
      }))
      .pipe(rollup({
        plugins: [
          resolve(),
          commonjs(),
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
      .pipe(dest('build/js'))
      .pipe(server.stream());
  done();
};

const images = (done) => {
  src('img/**/*.{jpg,png,svg}')
      .pipe(imagemin([
        imagemin.optipng({optimizationLevel: 3}),
        imagemin.jpegtran({progressive: true}),
        imagemin.svgo()
      ]))
      .pipe(dest('build/img'));
  done();
};

const toWebP = () => {
  return src('img/**/*.{png,jpg}')
      .pipe(webp({
        quality: 90
      }))
      .pipe(dest('build/img'));
};

const sprite = () => {
  return src('img/*.svg')
      .pipe(svgstore({
        inlineSvg: true
      }))
      .pipe(rename('sprite.svg'))
      .pipe(dest('build/img'));
};

const serve = () => {
  server.init({
    server: 'build/',
    notify: true,
    open: false,
    cors: true,
    ui: false
  });

  watch('**/*.pug')
      .on('change', (blob) => {
        renderViews(path.join(__dirname, blob));
      });

  watch('scss/**/*.{scss,sass}', styles);
  watch('js/**/*.js', scripts);
  watch(['views/**/*.pug', '!views/*.pug'], views);
  watch('img/**/*.{jpg,png,svg}', series(images, copy));
};

exports.build = series(clean, copy, views, styles, scripts, images);
exports.serve = serve;
