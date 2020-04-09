/**
 * layui 路由插件
 *
 * @author Microanswer.cn
 * @date 2020年4月9日16点43分
 */
layui.define([], function (exports) {

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
    function Router() {}

    /**
     * 初始化当前路由。
     */
    Router.prototype.init = function () {
        this.originHref = window.location.href;

        var temps = this.originHref.split("#")[0];
        this.htmlHref = temps[0];
        var o = parseUrl(this.htmlHref);
        this.htmlQuery = o.query;
        this.htmlPath = o.path;

        if (temps.length > 1) {
            this.hashHref = temps[1];
            var p = parseUrl(this.hashHref);
            this.hashQuery = p.query;
            this.hashPath = p.path;
        }
    };

    exports("layspa_router", Router);
});
