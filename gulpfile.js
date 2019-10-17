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
const uglify = require('gulp-uglify-es').default;
const rollup = require(`gulp-better-rollup`);
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require(`rollup-plugin-commonjs`);
const babel = require('rollup-plugin-babel');
const pug = require('gulp-pug');
const concat = require('gulp-concat');

const renderViews = (blob) => {
  return src(blob)
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(dest('build/'))
    .pipe(server.stream());
};

const clean = () => {
  return del('build');
};

const copy = () => {
  return src([
    'fonts/**/*.{woff,woff2}',
    'video/**'
  ], {
    base: '.'
  })
      .pipe(dest('build/'));
};

const images = () => {
  return src('img/**/*.{jpg,png}')
      .pipe(imagemin([
        imagemin.optipng({
          optimizationLevel: 3
        }),
        imagemin.jpegtran({
          progressive: true
        })
      ]))
      .pipe(dest('build/img/'));
};

const views = () => {
  return renderViews('views/*.pug');
};

const vendorCss = () => {
  return src([
    'normalize.css/normalize.css'
  ], {
    cwd: 'node_modules',
    sourcemaps: true
  })
      .pipe(plumber())
      .pipe(concat('vendors.css'))
      .pipe(minify())
      .pipe(rename('vendors.min.css'))
      .pipe(dest('build/css/', {
        sourcemaps: '.'
      }));
};

const mainCss = () => {
  return src('scss/main.scss', {
    sourcemaps: true
  })
      .pipe(plumber())
      .pipe(sass())
      .pipe(postcss([
        autoprefixer()
      ]))
      .pipe(dest('build/css/'))
      .pipe(minify())
      .pipe(rename('styles.min.css'))
      .pipe(dest('build/css/', {
        sourcemaps: '.'
      }))
      .pipe(server.stream());
};

const vendorJs = () => {
  return src([
    ' '
  ], {
    cwd: 'node_modules',
    sourcemaps: true,
  })
      .pipe(concat('vendors.js'))
      .pipe(uglify())
      .pipe(rename('vendors.min.js'))
      .pipe(dest('build/js/', {
        sourcemaps: '.'
      }));
};

const mainJs = () => {
  return src('js/main.js', {
    sourcemaps: true
  })
      .pipe(plumber())
      .pipe(rollup({
        plugins: [
          resolve(),
          commonjs(),
          babel()
        ]
      }, 'iife'))
      .pipe(uglify())
      .pipe(rename('scripts.min.js'))
      .pipe(dest('build/js/', {
        sourcemaps: '.'
      }))
      .pipe(server.stream());
};

const toWebP = () => {
  return src('img/**/*.{png,jpg}')
      .pipe(webp({
        quality: 90
      }))
      .pipe(dest('build/img/'));
};

const sprite = () => {
  return src('img/**/*.svg')
      .pipe(imagemin([
        imagemin.svgo()
      ]))
      .pipe(svgstore({
        inlineSvg: true
      }))
      .pipe(rename('sprite.svg'))
      .pipe(dest('build/img/'));
};

const serve = () => {
  server.init({
    server: 'build/',
    notify: true,
    open: false,
    cors: true,
    ui: false,
    middleware: [
      (req, res, next) => {
        const url = req.url;
        const isIndex = url !== '/';
        const hasExt = url.indexOf('.') === -1;

        req.url = (hasExt && isIndex) ? url + '.html' : url;
        next();
      }
    ]
  });

  watch('views/*.pug')
      .on('change', (blob) => {
        renderViews(path.join(__dirname, blob));
      });

  watch('scss/**/*.{scss,sass}', mainCss);
  watch('js/**/*.js', mainJs);
  watch(['views/**/*.pug', '!views/*.pug'], views);
  watch('img/**/*.{jpg,png}', images);
  watch('img/**/*.svg', series(sprite, views));
  watch('fonts/**/*.{woff,woff2}', copy);
};

exports.build = series(clean, copy, images, sprite, views, vendorCss, mainCss, vendorJs, mainJs);
exports.serve = serve;
exports.vendors = series(vendorCss, vendorJs);
