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

    var isH5Tag = makeMap(
        'a,address,article,aside,base,blockquote,body,button,caption,center,col,colgroup,dd,' +
        'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
        'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,ul,ol,li,menuitem,meta,' +
        'optgroup,option,param,rp,rt,span,source,style,summary,table,tbody,td,tfoot,th,thead,' +
        'title,tr,track,area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
        'link,meta,param,source,track,wbr,colgroup,dd,dt,li,options,p,td,tfoot,th,' +
        'thead,tr,source,image');

    function render(tag, attr, childen) {
        attr = attr || {};
        childen = childen || [];
        var _this = this;
        // 普通h5节点
        if (isH5Tag(tag)) {
            return new Promise(function (resolve, reject) {
                var dom = document.createElement(tag);

                for (var f in attr) {
                    var at = {name: f, value: attr[f]};

                    if (at.name === 'ref') {
                        _this.$refs = _this.$refs || {};
                        var $refs = _this.$refs[at.value];
                        if ($refs) {
                            if ($.isArray($refs)) {
                                $refs.push(dom);
                            } else {
                                _this.$refs[at.value] = [$refs, dom];
                            }
                        }else {
                            _this.$refs[at.value] = dom;
                        }
                        continue;
                    }

                    if (at.name.indexOf("@") === 0) {
                        // 事件监听

                        var event = at.name.substring(1, at.name.length);
                        dom.addEventListener(event, function (event) {
                            var dom = this;
                            _this.methods[at.value] && _this.methods[at.value].call(_this, dom, event);
                        });

                        continue;
                    }

                    if (at.name === 'class') {
                        dom.className = dom.className + " " + (at.value || "");
                        continue;
                    }

                    if (at.name === 'style') {
                        var style = at.value || "";
                        var sps = style.split(";");
                        for (var j = 0; j < sps.length; j++) {
                            var sp = sps[j].split(":");
                            dom.style[sp[0].trim()] = (sp[1] || "").trim();
                        }
                        continue;
                    }

                    if (at.name === 'id') {
                        dom.id = at.value;
                        continue;
                    }

                    dom.setAttribute(at.name, at.value);
                }

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

            // 加载自定义组件。
            return new Promise(function (resolve, reject) {
                layui.use([tag], function () {
                    var mod = layui[tag];

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

                    // 将当前组件作为子组件的父组件。
                    mod.$parent = _this;

                    mod.render(render).then(function (tagDom) {
                        resolve(tagDom);
                        mod.$el = tagDom;
                    });
                });
            });
        }
    }


    function layspa(option) { return option; }

    /**
     * 注册一个单页组件
     */
    layspa.component = function(render, option) {
        option.render = render;
        if (option.name) {
            exports(option.name, option);
        }
    };

    /**
     * 开始渲染组件树
     */
    layspa.run = function (option) {
        if (option.title) {
            document.title = option.title;
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

        option.render(render).then(function (dom) {
            option.$el = dom;
            if (option.el) {
                var $dom = $(option.el);
                $dom.replaceWith(dom);
                $dom.ready(function () {

                    // 先执行子组件的ready。
                    if (option.$childen) {
                        $.each(option.$childen, function (index, mod) {
                            mod && mod.ready && mod.ready(mod.$el);
                        });
                    }

                    option.ready && option.ready($dom);
                });
            }
        });
    };

    exports("layspa", layspa);
});
