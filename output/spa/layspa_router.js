/**
 * layui 路由插件
 *
 * @author Microanswer.cn
 * @date 2020年4月9日16点43分
 */
layui.define(["jquery"], function (exports) {
    var $ = layui.jquery;

    function parseUrl(url) {
        var tps = url.split("?");
        var path = tps[0]; // 对于 hash 部分， path 就是确定的路径，而对于网页资源部分，这个path还包含了 协议、host、端口这些东西。
        var search = tps[1];
        var query = {};
        if (search) {
            var kss = search.split("&");
            for (var i = 0; i < kss.length; i++) {
                var ks = kss[i];
                if (ks) {
                    var kv = ks.split("=");
                    query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
                }
            }
        }
        return {
            query: query,
            path: path
        };
    }

    /**
     * 路由插件。
     * @constructor
     */
    function Router(option) {
        this.tagName = option.tagName || "layspa_router";
        this.ruls = option.ruls || [];
        this.init();
    }

    /**
     * 初始化当前路由。
     */
    Router.prototype.init = function () {
        this.originHref = window.location.href;

        var temps = this.originHref.split("#");
        this.htmlHref = temps[0];
        var o = parseUrl(this.htmlHref);
        this.htmlQuery = o.query;
        this.htmlPath = o.path;

        if (temps.length > 1) {
            this.hashHref = temps[1];
            var p = parseUrl(this.hashHref);
            this.hashQuery = p.query;
            this.hashPath = p.path;
        } else {

            this.hashHref = "/";
            this.hashQuery = {};
            this.hashPath = "/";
        }

    };

    /**
     * 根据当前网页path，并比对路由规则，将匹配的组件以 Promise 放回.
     */
    Router.prototype.getRouteMod = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var r = null;
            $.each(_this.ruls, function (index,route) {
                if (route.path === _this.hashPath) {
                    r = route;
                }
            });

            if (!r) {
                resolve(null);
            }

            layui.use([r.use], function () {
                _this.mod = layui[r.use];
                resolve(_this.mod);
            });
        });
    };

    Router.prototype.onReplace = function (cb) {
        this.onExchange = this.onExchange || [];
        this.onExchange[0] = cb;
    };

    Router.prototype.applayPath = function (option) {
        var _this = this;
        _this.hashPath = option.path;
        var oldMod = _this.mod;
        _this.getRouteMod().then(function (mod) {
            if (!mod) {
                console.log("没有匹配到对应路由");
            } else {
                // 将当前组件替换为匹配到的组件。
                $.each(_this.onExchange||[], function(index, cb) {
                    cb(oldMod, mod);
                });
            }
        })
    };

    Router.prototype.push = function(option) {
        if (typeof option === "string") {
            option = {
                path: option
            }
        }

        if (!option || !option.path) {
            throw new Error("请指定跳转路径");
        }

        this.applayPath(option);
    };

    exports("layspa_router", Router);
});
