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

        this.version   = "1.0.0";   // 版本号
        this.option    =  option;   // 配置
        this.remotes   =      [];   // 需要异步加载的组件列表。

        this.eventList =      {};   // 保存监听了的事件列表。

        this.$el       =    null;   // render 方法执行完成后这个值就被初始化。

        this._render();
        this._mount();
        this._ready();
    }

    // 将组件挂载到指定位置。
    Layue.prototype.$mount = function (to) {
        if (!to) {
            return;
        }

        if (typeof to === "string") {
            $(to).replaceWith(this.$el);
        } else if (to.jquery) {
            to.replaceWith(this.$el);
        } else {
            $(to).replaceWith(this.$el);
        }
    }


    // 渲染函数。
    Layue.prototype._render = function () {
        // 渲染dom。
        this.$el = this.option.render.call(this, render.bind(this));
    }

    // 挂载
    Layue.prototype._mount = function () {
        // 将dom显示到指定位置,在指定了el的情况下才有法指定噻。
        if (this.option.el) {
            var element = document.querySelector(this.option.el);
            if (element) {
                $(element).replaceWith(this.$el);
            } else {
                throw new Error("未找到el对应的dom节点。");
            }
        }
    }

    // 渲染完成后再执行本方法。
    Layue.prototype._ready = function () {

        // 没有远程组件的话，那么到这里就可以进行ready回调了。
        if (this.remotes.length <= 0) {
            this.option.ready && this.option.ready.call(this);
        } else {

            // 存在远程组件。这里开始立即加载。
            remoteLoader.call(this, this.remotes);
        }

    }

    function has(arr, key) {
        return (arr || []).indexOf(key) > -1;
    }

    // 渲染实现函数
    function render(tag, attr, childen) {

        attr      = attr    || {};
        childen   = childen || [];
        var _this = this;

        // 要创建的节点是另一个组件，这里先不创建，将其放入任务加载列表。
        if (has(this.option.use, tag)) {

            // 虽然说这里放入了任务列表，但待会儿也会加载这个组件的，
            // 待会儿加载这个组件的时候，这个组件该放在这个位置啊。
            // 就是为了让待会儿加载成功的组件知道自己该放在哪个位置。
            // 所以这里使用一个 注释 节点来占位，所谓 注释 节点，请看:
            // https://developer.mozilla.org/en-US/docs/Web/API/Comment
            var placeComment = document.createComment("");
            placeComment.component        = tag;
            placeComment.componentAttr    = attr;
            placeComment.componentChilden = childen;

            this.remotes.push(placeComment);
            return placeComment;
        } else {
            // 其它的都认为是 html 节点进行创建。
            var dom = document.createElement(tag);

            // 处理属性。
            $.each(attr, function (k, v) {
                var at = {name: k, value: v};

                // ref 属性，将对应 dom 进行注入。方便使用。
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

                // @ 开头的属性，认为是 事件绑定。
                if (at.name.indexOf("@") === 0) {
                    var event = at.name.substring(1, at.name.length);

                    // 保存这个事件，在销毁的时候有必要将其移除。
                    _this.eventList[event] = function (event) {
                        var dom = this;
                        _this.option.methods && _this.option.methods[at.value] && _this.methods[at.value].call(_this, dom, event);
                    };

                    dom.addEventListener(event, _this.eventList[event]);
                } else

                // class 属性，
                if (at.name === 'class') {
                    if (dom.className) {
                        dom.className = dom.className + " " + (at.value || "");
                    } else {
                        dom.className = at.value || "";
                    }
                } else

                // 样式 属性
                if (at.name === 'style') {
                    var style = at.value || "";
                    var sps = style.split(";");
                    for (var j = 0; j < sps.length; j++) {
                        var sp = sps[j].split(":");
                        dom.style[sp[0].trim()] = (sp[1] || "").trim();
                    }

                } else

                // id 属性
                if (at.name === 'id') {
                    dom.id = at.value;
                } else {

                    // 其它属性就都不管了，是什么就原样添加到dom节点上。
                    dom.setAttribute(at.name, at.value);
                }
            });

            // 处理子节点
            if (childen && childen.length > 0) {
                $.each(childen, function (index, item) {
                    var ic;

                    // 字符串类型的 就 为其常见文本节点。
                    var t = typeof item;
                    if (t === "string" || t === "number" || t === "boolean") {
                        ic = document.createTextNode(String(item || ""));
                    } else {

                        // 其它类型的，就认为都是dom节点。
                        ic = item;
                    }

                    dom.appendChild(ic);
                });
            }

            return dom;
        }
    }

    // 远程组件加载
    function remoteLoader (remotes) {
        var mods = {};
        var depends = $.map(remotes, function (placeComment) {
            mods[placeComment.component] = placeComment;
            return placeComment.component;
        });

        // 奥里给，开始加载这些组件。
        layui.use(depends, function () {

            for (var i = 0; i < depends.length; i++) {
                var modOption = layui[depends[i]];
                new Layue(modOption).$mount(mods[depends[i]]);
            }


        });
    }


    exports("Layue", Layue);
});
