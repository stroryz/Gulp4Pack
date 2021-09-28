const {src, dest, parallel, series, watch} = require('gulp');

const sass = require('gulp-sass')(require('sass'));
const notify = require('gulp-notify');
const rename = require('gulp-rename');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();
const fileInclude = require('gulp-file-include');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const fs = require('fs');
const del = require('del');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const uglify = require('gulp-uglify-es').default;
const tiny = require('gulp-tinypng-compress');
const gutil = require('gulp-util');
const ftp = require('vinyl-ftp');

const fonts = () => {
  src('./src/fonts/**.ttf')
    .pipe(ttf2woff())
    .pipe(dest('./app/fonts'))
  return src('./src/fonts/**.ttf')
    .pipe(ttf2woff2())
    .pipe(dest('./app/fonts'))
}

const cb = () => {}

let srcFonts = './src/scss/_fonts.scss';
let appFonts = './app/fonts/';

const fontStyle = (done) => {
  let file_content = fs.readFileSync(srcFonts);

  fs.writeFile(srcFonts, '', cb);
  fs.readdir(appFonts, function(err, items) {
    if (items) {
      let c_fontname;
      for (var i = 0; i < items.length; i++) {
        let fontname = items[i].split('.');
        fontname = fontname[0];
        if (c_fontname != fontname) {
          fs.appendFile(srcFonts, '@include font-face("' + fontname + '", "' + fontname + '", 400);\r\n', cb);
        }
        c_fontname = fontname;
      }
    }
  })
  done();
}

const svgSprites = () => {
  return src('./src/img/**.svg')
    .pipe(svgSprite({
      mode: {
        stack: {
          sprite: "../sprite.svg"
        }
      }
    }))
    .pipe(dest('./app/img'))
}

const styles = () => {
  return src('./src/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'expanded',
    }).on('error', notify.onError()))
    .pipe(rename({
      suffix: '.min',
    }))
    .pipe(autoprefixer({
      cascade: false,
    }))
    .pipe(cleanCSS({
      level: 2,
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(dest('./app/css/'))
    .pipe(browserSync.stream())
}

const htmlInclude = () => {
  return src(['./src/index.html'])
    .pipe(fileInclude({
      prefix: '@',
      basepath: '@file',
    }))
    .pipe(dest('./app'))
    .pipe(browserSync.stream())
}

const imgToApp = () => {
  return src(['./src/img/**.{jpg,png,jpeg}'])
    .pipe(dest('./app/img'))
}

const resources = () => {
  return src('./src/resources/**')
    .pipe(dest('./app'))
}

const clean = () => {
  return del(['app/*'])
}

const scripts = () => {
  return src('./src/js/main.js')
    .pipe(webpackStream({
      output: {
        filename: 'main.js'
      },
      module: {
        rules: [
          {
            test: /\.m?js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: "defaults" }]
                ]
              }
            }
          }
        ]
      }
    }))
    .pipe(sourcemaps.init())
    .pipe(uglify().on("error", notify.onError()))
    .pipe(sourcemaps.write('.'))
    .pipe(dest('./app/js'))
    .pipe(browserSync.stream())
}

const watchFiles = () => {
  browserSync.init({
      server: {
          baseDir: "./app"
      }
  });

  watch('./src/scss/**/*.scss', styles)
  watch('./src/index.html', htmlInclude)
  watch('./src/img/**.{jpg,png,jpeg}', imgToApp)
  watch('./src/img/**.svg', svgSprites)
  watch('./src/resources/**', resources)
  watch('./src/fonts/**.ttf', fonts)
  watch('./src/fonts/**.ttf', fontStyle)
  watch('./src/js/**/*.js', scripts)
}

exports.styles = styles;
exports.watchFiles = watchFiles;

exports.default = series(clean, parallel(htmlInclude, scripts, fonts, imgToApp, svgSprites, resources), fontStyle, styles, watchFiles);

const tinyPng = () => {
  return src(['./src/img/*.{jpg,png,jpeg}'])
    .pipe(tiny({
        key: '8DjkFTZy7QQVvfc9GpNcbyzvsJjGzzsz',
        log: true,
    }))
    .pipe(dest('./app/img'))
}

const stylesBuild = () => {
  return src('./src/scss/**/*.scss')
    .pipe(sass({
      outputStyle: 'expanded',
    }).on('error', notify.onError()))
    .pipe(rename({
      suffix: '.min',
    }))
    .pipe(autoprefixer({
      cascade: false,
    }))
    .pipe(cleanCSS({
      level: 2,
    }))
    .pipe(dest('./app/css/'))
}

const scriptsBuild = () => {
  return src('./src/js/main.js')
    .pipe(webpackStream({
      output: {
        filename: 'main.js'
      },
      module: {
        rules: [
          {
            test: /\.m?js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: "defaults" }]
                ]
              }
            }
          }
        ]
      }
    }))
    .pipe(uglify().on("error", notify.onError()))
    .pipe(dest('./app/js'))
}

exports.build = series(clean, parallel(htmlInclude, scriptsBuild, fonts, imgToApp, svgSprites, resources), fontStyle, stylesBuild, tinyPng);

// deploy
const deploy = () => {
	let conn = ftp.create({
		host: '', //Имя хоста
		user: '', // Имя пользователя
		password: '', // Пароль хостинга 
		parallel: 10,
		log: gutil.log
	});

	let globs = [
		'app/**',
	];

	return src(globs, {
			base: './app',
			buffer: false
		})
		.pipe(conn.newer('')) // only upload newer files тут аналогично нижней части
		.pipe(conn.dest('/www.blabla.blabla.ru/')); // Важно передать правильный путь, обязательно в конце /, после него ставится папка app
}

exports.deploy = deploy;