layui.define(["jquery"], function (exports) {
    var $ = layui.jquery;

    function makeMap(str, expectsLowerCase) {
        var map = {};
        var list = str.split(',');
        for (var i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase ? function (val) {
            return map[val.toLowerCase()];
        } : function (val) {
            return map[val];
        }
    }

    var router;

    var isH5Tag = makeMap(
        'a,address,article,aside,base,blockquote,body,button,caption,center,col,colgroup,dd,' +
        'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
        'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,ul,i,ol,label,li,menuitem,meta,' +
        'optgroup,option,param,rp,rt,span,source,style,summary,table,tbody,td,tfoot,th,thead,' +
        'title,tr,track,area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
        'link,meta,param,source,track,wbr,colgroup,dd,dt,li,options,p,td,tfoot,th,' +
        'thead,tr,source,image');

    // 渲染style
    function renderStyle(cssStr, id) {
        if (cssStr) {
            var s = document.querySelector("#" + id);
            if (s) {
                // 此css节点已经在页面中。
                return;
            }

            var styleElement = document.createElement("style");
            styleElement.id = id;
            styleElement.innerText = cssStr;
            document.head.appendChild(styleElement);
        }
    }

    // 渲染dom。
    function render(tag, attr, childen) {
        var _this = this;

        // 如果存在css，则使用css
        if (_this.cssStr && _this.cssStrId) {
            renderStyle(_this.cssStr, _this.cssStrId);
        }

        attr = attr || {};
        childen = childen || [];
        // 普通h5节点
        if (isH5Tag(tag)) {
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


    function layspa(option) {
        return option;
    }

    /**
     * 注册一个单页组件
     */
    layspa.component = function (option) {
        if (option.name) {
            exports(option.name, option);
        }
        option.reged = true;

        // 加入路由
        if (option.router && !router) {
            router = option.router;

            router.onReplace(function (oldMod, newMod) {

                // 新组件和老组件相同， 什么都不处理。
                if (oldMod.name === newMod.name) {
                    return;
                }

                oldMod.onDestroy && oldMod.onDestroy();

                layspa.run(newMod, function (newMod) {
                    $(oldMod.$el).replaceWith(newMod.$el);
                    newMod.onReady && newMod.onReady();
                });
            });
            delete option.router;
        }

        if (router) {
            option.$router = router;
        }

        option.$getChilden = function (name) {
            var rs = [];
            if (option.$childen) {
                $.each(option.$childen, function (i, mod) {
                    if (mod.name === name) {
                        rs.push(mod);
                    }
                });
            }
            return rs.length === 0 ? null : (rs.length === 1 ? rs[0] : rs);
        };

        option.onDestroy = function () {
            // 先执行子组件的destroy。
            if (option.$childen) {
                $.each(option.$childen, function (index, mod) {
                    mod && mod.onDestroy && mod.onDestroy();
                });
            }

            option.destroy && option.destroy();
        }

        option.onReady = function () {

            // 先执行子组件的ready。
            if (option.$childen) {
                $.each(option.$childen, function (index, mod) {
                    mod.$router = option.$router;
                    mod && mod.onReady && mod.onReady();
                });
            }

            option.ready && option.ready();

        };
    };

    /**
     * 开始渲染组件树
     */
    layspa.run = function (option, cb) {
        if (option.title) {
            document.title = option.title;
        }

        // 未注册的组件，先注册。
        if (!option.reged) {
            layspa.component(option);
        }

        // 这每次都重新渲染
        var p = option.render(render.bind(option));
        // if (false && option.$el) {
        //     p = Promise.resolve(option.$el);
        // } else {
        //     p
        // }

        p.then(function (dom) {
            option.$el = dom;
            cb && cb(option);
            if (option.el) {
                var $dom = $(option.el);
                $dom.replaceWith(dom);
                $dom.ready(function () {
                    option.onReady();
                });
            }
        });
    };

    exports("layspa", layspa);
});
