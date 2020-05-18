layui.define([], function (exports) {
    exports("foot", {
        render: function (r) {
            return r("div", {"style": "text-align: center;"}, [
                "https://www.microanswer.cn"
            ])
        },
        ready: function () {
            console.log("foot ok");
        }
    })
});
