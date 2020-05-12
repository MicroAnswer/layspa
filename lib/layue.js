/**
 * 预期使用方法：
 * new Layue({
 *     el: "#app",
 *     use: ["main"], // 使用main组件
 *     render: function (r) {
 *         return r("main");
 *     },
 *     ready: function () {},
 *     destroy: function () {}
 * });
 */
layui.define(["jquery"], function (exports) {

    var $ = layui.jquery;

    function Layue(option) {
        if (!option || typeof option !== "object") {
            throw new Error("创建一个Layue实例必须传入option对象。");
        }

        this.version = "1.0.0";    // 版本号
        this.option  = option;     // 配置
        this.remotes = [];         // 需要异步加载的组件列表。

        this._render();
    }

    // 渲染函数。
    Layue.prototype._render = function () {
        var dom = this.option.render.call(this, render.bind(this));
    }

    function has(arr, key) {
        return (arr || []).indexOf(key) > -1;
    }

    // 渲染实现函数
    function render(tag, attr, childen) {
        var _this = this;

        attr = attr || {};
        childen = childen || [];

        // 要创建的节点是另一个组件，这里先不创建，将其放入任务加载列表。
        if (has(this.option.use, tag)) {
            _this.remotes.push({

            })
        } else if(1) {
            return new Promise(function (resolve, reject) {
                var dom = document.createElement(tag);

                $.each(attr, function (k, v) {
                    var at = {name: k, value: v};

                    if (at.name === 'ref') {
                        _this.$refs = _this.$refs || {};
                        var $refs = _this.$refs[at.value];
                        if ($refs) {
                            if ($.isArray($refs)) {
                                $refs.push(dom);
                            } else {
                                _this.$refs[at.value] = [$refs, dom];
                            }
                        } else {
                            _this.$refs[at.value] = dom;
                        }
                    } else

                    if (at.name.indexOf("@") === 0) {
                        // 事件监听

                        var event = at.name.substring(1, at.name.length);
                        dom.addEventListener(event, function (event) {
                            var dom = this;
                            _this.methods[at.value] && _this.methods[at.value].call(_this, dom, event);
                        });

                    } else

                    if (at.name === 'class') {
                        dom.className = dom.className + " " + (at.value || "");

                    } else

                    if (at.name === 'style') {
                        var style = at.value || "";
                        var sps = style.split(";");
                        for (var j = 0; j < sps.length; j++) {
                            var sp = sps[j].split(":");
                            dom.style[sp[0].trim()] = (sp[1] || "").trim();
                        }

                    } else

                    if (at.name === 'id') {
                        dom.id = at.value;
                    } else {
                        dom.setAttribute(at.name, at.value);
                    }
                });

                var p = Promise.resolve(dom);
                if (childen && childen.length > 0) {
                    $.each(childen, function (index, item) {
                        var t = typeof item;
                        if (t === "string" || t === "number" || t === "boolean") {
                            p = p.then(function () {
                                return document.createTextNode(String(item || ""));
                            });
                        } else {
                            p = p.then(function () {
                                return item.then(function (dom) {
                                    return dom;
                                });
                            });
                        }
                        p = p.then(function (d) {
                            dom.appendChild(d);
                        });
                    });
                }

                p.then(function () {
                    resolve(dom);
                });
            });
        } else {

            var pro = Promise.resolve();

            // 路由插槽
            if (_this.$router.tagName === tag) {
                pro = pro.then(function () {
                    return _this.$router.getRouteMod();
                });
            } else {

                // 加载自定义组件。
                pro = pro.then(function () {
                    return new Promise(function (resolve, reject) {
                        layui.use([tag], function () {
                            resolve(layui[tag]);
                        });
                    })
                });
            }

            return pro.then(function (mod) {
                return new Promise(function (resolve, reject) {
                    if (!mod) {
                        return render.call(_this, "div", {}, ["没有匹配到路由。"]);
                    }

                    // 设置ref
                    for (var f in attr) {
                        var at = {name: f, value: attr[f]};
                        if (at.name === 'ref') {
                            _this.$refs = _this.$refs || {};
                            var $refs = _this.$refs[at.value];
                            if ($refs) {
                                if ($.isArray($refs)) {
                                    $refs.push(mod);
                                } else {
                                    _this.$refs[at.value] = [$refs, mod];
                                }
                            } else {
                                _this.$refs[at.value] = mod;
                            }
                        }
                    }

                    // 把布局里的自定义组件作为当前组件的子组件，放在 $childen 里。
                    _this.$childen = _this.$childen || [];
                    if (_this.$childen.indexOf(mod) === -1) {
                        _this.$childen.push(mod);
                    }

                    // 加入路由
                    if (_this.$router) {
                        mod.$router = _this.$router;
                    }

                    // 将当前组件作为子组件的父组件。
                    mod.$parent = _this;

                    mod.render(render.bind(mod)).then(function (tagDom) {
                        mod.$el = tagDom;
                        resolve(tagDom);
                    });
                });
            });

        }
    }



    exports("Layue", Layue);
});
