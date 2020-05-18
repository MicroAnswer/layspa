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
        this.domEvent  =      {};   // 内部dom监听事件列表。

        this.$el       =    null;   // render 方法执行完成后这个值就被初始化。

        // 初始化一些东西
        this._init();

        // 直接指定了挂在位置，则立即处理。
        if (this.option.el) {
            this._mount();
        }
    }

    // 初始化一些相关事情。
    Layue.prototype._init = function () {

        // 目前还没有要处理的事情。[滑稽!]

    };

    // 渲染完成后再执行本方法。
    Layue.prototype._ready = function () {

        // 没有远程组件的话，那么到这里就可以进行ready回调了。
        if (this.remotes.length <= 0) {

            // 发起ready事件。
            this.option.ready && this.option.ready.call(this);
            this.$emit(Layue.EVENT.READY, this);
        } else {
            // 存在远程组件。这里开始立即加载。
            remoteLoader.call(this, this.remotes);
        }

    }

    // 渲染函数。
    Layue.prototype._render = function () {
        // 渲染dom。
        this.$el = this.option.render.call(this, render.bind(this));
    }

    // 挂载
    Layue.prototype._mount = function () {
        this._render();

        // 将dom显示到指定位置,在指定了el的情况下才有法指定噻。
        if (this.option.el) {
            if (typeof this.option.el === "string") {
                var element = $(this.option.el);
                if (element.length > 0) {
                    element.replaceWith(this.$el);
                } else {
                    throw new Error("未找到el对应的dom节点。");
                }
            } else if (this.option.el.jquery) {
                this.option.el.replaceWith(this.$el);
            } else {
                $(this.option.el).replaceWith(this.$el);
            }
        } else {
            // 没有指定目标，啥也不做。
        }


        this._ready();
    }

    // 将组件挂载到指定位置。
    Layue.prototype.$mount = function (to) {
        if (this.option.el) {
            // 如果el是有值的，那么说明一定已经mount过了，不允许再mount。
            throw new Error("无法在已经指定目标el上重新进行mount操作。");
        }
        this.option.el = to;
        this._mount();
    }

    // 发起事件
    Layue.prototype.$emit = function (event, param) {
        if (!event) throw new Error("必须指定要发起的事件名");
        var _this = this;
        this.eventList[event] = this.eventList[event] || [];
        $.each(this.eventList[event], function (i, cb) {
            cb && cb.call(_this, _this.$el, param);
        });
    }

    // 注册事件监听。
    Layue.prototype.$on = function (event, cb) {
        if (!event) throw new Error("必须指定要监听的事件名");
        this.eventList[event] = this.eventList[event] || [];
        this.eventList[event].push(cb);
    }

    // 取消某事件监听，如果没有传入 cb， 那么将移除所有该事件的监听。
    Layue.prototype.$off = function (event, cb) {
        if (!event) throw new Error("必须指定要移除的事件名");
        this.eventList[event] = this.eventList[event] || [];

        var index = this.eventList[event].indexOf(cb);
        if (index > -1) {
            this.eventList[event].splice(index, 1);
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
                    _this.domEvent[event] = function (event) {
                        var dom = this;
                        _this.option.methods && _this.option.methods[at.value] && _this.methods[at.value].call(_this, dom, event);
                    };

                    dom.addEventListener(event, _this.domEvent[event]);
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
        var _this = this;

        var mods = {};
        var depends = $.map(remotes, function (placeComment) {
            mods[placeComment.component] = placeComment;
            return placeComment.component;
        });

        var readyed = [];

        function handleMod (mod) {
            var placeComment = mods[mod];
            var modOption = layui[mod];

            var layue = new Layue(modOption);
            // 监听ready。
            layue.$on(Layue.EVENT.READY, function (layueInstanceDom, layueInstance) {


                // 处理属性。
                $.each(placeComment.componentAttr, function (k, v) {
                    var at = {name: k, value: v};

                    // ref 属性，将对应 dom 进行注入。方便使用。
                    if (at.name === 'ref') {
                        _this.$refs = _this.$refs || {};
                        var $refs = _this.$refs[at.value];
                        if ($refs) {
                            if ($.isArray($refs)) {
                                $refs.push(layueInstance);
                            } else {
                                _this.$refs[at.value] = [$refs, layueInstance];
                            }
                        } else {
                            _this.$refs[at.value] = layueInstance;
                        }
                    } else

                        // @ 开头的属性，认为是 事件绑定。
                    if (at.name.indexOf("@") === 0) {
                        var event = at.name.substring(1, at.name.length);

                        if (_this.option.methods && _this.option.methods[at.value]) {
                            layueInstance.$on(event, _this.option.methods[at.value]);
                        }
                    } else

                        // class 属性，
                    if (at.name === 'class') {
                        console.warn("远程组件不支持设置class");
                        // if (dom.className) {
                        //     dom.className = dom.className + " " + (at.value || "");
                        // } else {
                        //     dom.className = at.value || "";
                        // }
                    } else

                        // 样式 属性
                    if (at.name === 'style') {
                        console.warn("远程组件不支持设置style");

                        // var style = at.value || "";
                        // var sps = style.split(";");
                        // for (var j = 0; j < sps.length; j++) {
                        //     var sp = sps[j].split(":");
                        //     dom.style[sp[0].trim()] = (sp[1] || "").trim();
                        // }

                    } else

                        // id 属性
                    if (at.name === 'id') {

                        console.warn("远程组件不支持设置id");
                        // dom.id = at.value;
                    } else {
                        console.warn("远程组件不支持设置" + at.name);
                        // 其它属性就都不管了，是什么就原样添加到dom节点上。
                        // dom.setAttribute(at.name, at.value);
                    }
                });

                // 处理子节点 - 这里没处理，意味着远程组件不能有子节点。只有实现这里才能够支持。
                // placeComment.componentChilden

                readyed.push(layueInstance);

                // 已经ready的个数和远程组件个数相同了，说明远程组件全部加载并且ready完成，
                // 这里就调起当前组件的ready.
                if (readyed.length === depends.length) {

                    // 发起ready事件。
                    _this.option.ready && _this.option.ready.call(_this);
                    _this.$emit(Layue.EVENT.READY, _this);
                }
            });
            layue.$mount(placeComment);
        }


        // 奥里给，开始加载这些组件。
        layui.use(depends, function () {

            $.each(depends, function (i, mod) {
                handleMod(mod);
            });

        });
    }

    Layue.EVENT = {
        READY: "_ready_",
        MOUNT: "_mount_",
    }


    exports("layue", Layue);
});
