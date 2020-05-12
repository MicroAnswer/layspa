/**
 * layui 路由插件
 *
 * @author Microanswer.cn
 * @date 2020年4月9日16点43分
 */
layui.define(["jquery"], function (exports) {
    var $ = layui.jquery;

    var notfoundMod = {
        name: "notfound",
        render: function (r) {
            return r("div",{}, ["404 NotFound."]);
        }
    };

    var timeoutMod = {
        name: "timeout",
        render: function (r) {
            return r("div", {}, ["mod load timeout."]);
        }
    };

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

    // 未匹配到路由时使用此组件
    function notfound() {
        return notfoundMod;
    }

    // 组件加载超时
    function timeout() {
        return timeoutMod;
    }

    /**
     * 路由插件。
     * @constructor
     */
    function Router(option) {
        this.tagName = option.tagName || "layspa_router";
        this.ruls = option.ruls || [];
        this.timeout = option.timeout || 30 * 1000;
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

        window.onpopstate = this.onPopstateChange.bind(this);

    };

    Router.prototype.onPopstateChange = function (e) {
        this.init();
        this.applayPath({
            path: this.hashPath
        });
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

            var timeoutIndex = setTimeout(function () {
                reject(new Error("mod_load_timeout"));
            }, _this.timeout || 30 * 1000)

            function res(m) {
                _this.mod = m;
                resolve(m);
                clearTimeout(timeoutIndex);
            }

            if (!r) {
                res(notfound());
            }

            layui.use([r.use], function () {
                res(layui[r.use]);
            });
        }).catch(function (err) {
            console.log("组件加载超时，", err);
            _this.mod = timeout();
            return Promise.resolve(_this.mod);
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
            console.log("替换", mod);
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

        history.pushState(null, null, this.htmlHref + "#" + option.path);
        this.applayPath(option);
    };

    exports("layspa_router", Router);
});
