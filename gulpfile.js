const { src,dest,parallel } = require("gulp");
const uglify = require("gulp-uglify");
const layspa = require("./build/gulp_layspa_maker");
const config = require("./build/config");

function compileModTask() {
    return src("./src/**/*" + config.ext)
        .pipe(layspa({
            output: "./output/spa/"
        }))
        .pipe(uglify())
        .pipe(dest("none"));
}

function copyLibTask() {
    return src("./lib/*.js")
        .pipe(dest("./output/spa/"));
}

function copyIndexHtmlTask () {
    return src("./index.html")
        .pipe(dest("./output/"));
}

exports.default = parallel(compileModTask, copyLibTask, copyIndexHtmlTask);
