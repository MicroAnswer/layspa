layui.define(["jquery"], function (exports) {
    var $ = layui.jquery;

    function makeMap (str, expectsLowerCase) {
        var map = {};
        var list = str.split(',');
        for (var i = 0; i < list.length; i++) {map[list[i]] = true;}
        return expectsLowerCase ? function (val) { return map[val.toLowerCase()]; } : function (val) { return map[val]; }
    }

    var isH5Tag = makeMap(
        'a,address,article,aside,base,blockquote,body,button,caption,center,col,colgroup,dd,' +
        'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
        'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
        'optgroup,option,param,rp,rt,span,source,style,summary,table,tbody,td,tfoot,th,thead,' +
        'title,tr,track,area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
        'link,meta,param,source,track,wbr,colgroup,dd,dt,li,options,p,td,tfoot,th,' +
        'thead,tr,source,image');

    function render (tag, attr, chillden) {
        var _this = this;
        // 普通h5节点
        if (isH5Tag(tag)) {
            var dom = document.createElement(tag);

            for (var f in attr) {
                var at = {name: f, value: attr[f]};

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


            if (chillden && chillden.length > 0) {
                for (var i = 0; i < chillden.length; i++) {
                    var t = typeof chillden[i];

                    if (t === "string") {
                        dom.appendChild(document.createTextNode(chillden[i]));
                    } else {
                        dom.appendChild(chillden[i]);
                    }
                }
            }

            return dom;
        } else {

        }
    }

    /**
     * 单页组件加载器。
     *
     * @author Micranswer.cn
     * @date 2020年4月8日10点05分
     */
    function layspa(option) {
        if (option.title) {
            document.title = option.title;
        }

        var dom = option.render(render);
        var $dom = $(option.el);
        $dom.append(dom);
        $dom.ready(function () {
            option.ready && option.ready($dom);
        });
    }

    exports("layspa", layspa);
});
