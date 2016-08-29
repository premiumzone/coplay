'use strict';

const path = require('path');
const $ = require('gulp-load-plugins')();
const gulp = require('gulp');
const merge = require('merge-stream');
const runSequence = require('gulp-sequence');
require('colors');

// Check for --production flag
let isProduction = (process.env.NODE_ENV === 'production');

const COMPATIBILITY = ['last 2 versions', 'ie >= 9'];

const PATHS = {
  tempDir: '.tmp',
  stylesMainFile: 'app/_src/css/main.scss',
  styles: [
    'app/_src/css/**/*.scss'
  ],
  templates: 'app/_src/templates/**/*.hbs',
  templatePartials: 'app/_src/templates/**/_*.hbs',
  javascriptAll: 'app/_src/js/**/*.js',
  javascriptHead: [
    'app/_src/js/utils.js',
    'app/_src/js/browsers.js'
  ],
  javascriptBody: [
    // paths to individual JS (bower)components defined below
    'components/socket.io-client/socket.io.js',
    'components/d3/d3.js',
    'components/handlebars/handlebars.runtime.js',

    // custom js
    'app/_src/js/state-manager.js',
    'app/_src/js/bubbles.js',
    'app/_src/js/spotify-client.js',
    'app/_src/js/socket-client.js',
    'app/_src/js/notification.js',
    'app/_src/js/playlist-manager.js',
    'app/_src/js/main.js'
  ]
};

const logFileChange = function(event) {
  const filename = require('path').relative(__dirname, event.path);
  console.log('[' + 'WATCH'.green + '] ' + filename.magenta + ' was ' + event.type + ', running tasks...');
};

// compile SCSS
gulp.task('styles', function() {
  const minifycss = $.if(isProduction, $.minifyCss());

  return gulp.src(PATHS.stylesMainFile)
    .pipe($.if(!isProduction, $.sourcemaps.init()))
    .pipe($.sass())
    .on('error', $.notify.onError({
        message: '<%= error.message %>',
        title: 'SCSS Error'
    }))
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    .pipe(minifycss)
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('app/public/css'));
});

gulp.task('templates', function() {
  gulp.src(PATHS.templates)
    .pipe($.handlebars({ handlebars: require('handlebars') }))
    .pipe($.wrap('Handlebars.template(<%= contents %>)'))
    .pipe($.declare({
      namespace: 'teliaCoplay.templates',
      noRedeclare: true // Avoid duplicate declarations
    }))
    .pipe($.concat('templates.js'))
    .pipe(gulp.dest(PATHS.tempDir));
});

gulp.task('template-partials', function() {
  gulp.src(PATHS.templatePartials)
    .pipe($.handlebars({ handlebars: require('handlebars') }))
    .pipe($.wrap('Handlebars.registerPartial(<%= processPartialName(file.relative) %>, Handlebars.template(<%= contents %>));', {}, {
      imports: {
        processPartialName: function(filename) {
          // Strip the extension and the underscore
          // Escape the output with JSON.stringify
          return JSON.stringify(path.basename(filename, '.js').substr(1));
        }
      }
    }))
    .pipe($.declare({
      namespace: 'teliaCoplay.templatePartials',
      noRedeclare: true // Avoid duplicate declarations
    }))
    .pipe($.concat('template-partials.js'))
    .pipe(gulp.dest(PATHS.tempDir));
});

gulp.task('javascript', function() {
  const head = gulp.src(PATHS.javascriptHead)
    .pipe($.if(!isProduction, $.sourcemaps.init()))
    .pipe($.concat('head.js', {
      newLine:'\n;'
    }))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('app/public/js'));

  const templatePaths = [
    path.join(PATHS.tempDir, 'templates.js'),
    path.join(PATHS.tempDir, 'template-partials.js')
  ];

  const body = gulp.src(PATHS.javascriptBody.concat(templatePaths))
    .pipe($.if(!isProduction, $.sourcemaps.init()))
    .pipe($.concat('main.js', {
      newLine:'\n;'
    }))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest('app/public/js'));

  return merge(head, body);
});

gulp.task('watch-styles', function() {
  gulp.watch([PATHS.stylesMainFile, PATHS.styles], ['styles'])
    .on('change', function(event) {
      logFileChange(event);
    });
});

gulp.task('watch-templates', function() {
  gulp.watch([].concat(PATHS.templates, PATHS.templatePartials), ['templates', 'template-partials', 'javascript'])
    .on('change', function(event) {
      logFileChange(event);
    });
});

gulp.task('watch-javascript', function() {
  gulp.watch(PATHS.javascriptAll, ['javascript', 'lint'])
    .on('change', function(event) {
      logFileChange(event);
    });
});

gulp.task('clean', function() {
  gulp.src(PATHS.tempDir, { read: false }).pipe($.clean());
});

// lint all JS files in javascript directory
gulp.task('lint', function() {
  return gulp.src(PATHS.javascriptAll)
    .pipe($.jshint())
    .pipe($.notify(function(file) {
      if (file.jshint.success) {
        return false;
      }
      const errors = file.jshint.results.map(function(data) {
        if (data.error) {
          return `(${data.error.line}: ${data.error.character}) ${data.error.reason}`;
        }
      }).join(`\n`);
      return `${file.relative} (${file.jshint.results.length} errors)\n${errors}`;
    }));
});

// build for development and watch for changes
gulp.task('build-dev', function(cb) {
  runSequence(
    ['styles', 'templates', 'template-partials'],
    'javascript',
    ['watch-styles', 'watch-templates', 'watch-javascript']
  )(cb);
});

// build for production
gulp.task('build', function(cb) {
  isProduction = true;

  runSequence(
    ['styles', 'templates', 'template-partials'],
    'javascript'
  )(cb);
});

gulp.task('default', ['build-dev']);
