const { src,dest } = require("gulp");
const Mygulp = require("./gulp_layspa_maker");
const uglify = require("gulp-uglify");

function defaultTask() {
    return src("./index.html")
        .pipe(Mygulp())
        .pipe(uglify())
        .pipe(dest("output/spa/"));
}

exports.default = defaultTask;
