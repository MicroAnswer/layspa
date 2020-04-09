const { src,dest } = require("gulp");
const layspa = require("./gulp_layspa_maker");
const uglify = require("gulp-uglify");

function defaultTask() {
    return src("./src/**/*.html")
        .pipe(layspa())
        .pipe(uglify())
        .pipe(dest("output/spa/"));
}

exports.default = defaultTask;
