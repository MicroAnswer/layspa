const Transform = require("readable-stream").Transform;
const util = require("util");

function makeMap (str, expectsLowerCase) {
    var map = Object.create(null);
    var list = str.split(',');
    for (var i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase
        ? function (val) { return map[val.toLowerCase()]; }
        : function (val) { return map[val]; }
}

var isUnaryTag = makeMap(
    'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
    'link,meta,param,source,track,wbr'
);
function decodeAttr (value, shouldDecodeNewlines) {
    var re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
    return value.replace(re, function (match) { return decodingMap[match]; })
}


var unicodeRegExp = /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
var attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
var dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
var ncname = "[a-zA-Z_][\\-\\.0-9_a-zA-Z" + (unicodeRegExp.source) + "]*";
var qnameCapture = "((?:" + ncname + "\\:)?" + ncname + ")";
var startTagOpen = new RegExp(("^<" + qnameCapture));
var startTagClose = /^\s*(\/?)>/;
var endTag = new RegExp(("^<\\/" + qnameCapture + "[^>]*>"));
var doctype = /^<!DOCTYPE [^>]+>/i;
var comment = /^<!\--/;
var conditionalComment = /^<!\[/;

// Special Elements (can contain anything)
var isPlainTextElement = makeMap('script,style,textarea', true);
var reCache = {};

var decodingMap = {
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&amp;': '&',
    '&#10;': '\n',
    '&#9;': '\t',
    '&#39;': "'"
};
var encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
var encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;

// #5992
var isIgnoreNewlineTag = makeMap('pre,textarea', true);
var shouldIgnoreFirstNewline = function (tag, html) { return tag && isIgnoreNewlineTag(tag) && html[0] === '\n'; };

function Parser (file) {
    Transform.call(this);

    this._file = file;
    this._sfc = {
        template: null,
        script: null,
        styles: [],
        customBlocks: [],
        errors: []
    };

    this._file.extname = ".js";

    this._jsResult = "";
    this._views = null;

    this.cssNode = null;
    this.scriptNode = null;
}



util.inherits(Parser, Transform);

// 解析文件内容
Parser.prototype.parseHtml = function(html, option) {

    var options = Object.assign({
        shouldKeepComment: false,
        comment: function () {},
        shouldDecodeNewlines: false,
        shouldDecodeNewlinesForHref: false,
    }, option);
    var stack = [];
    var isUnaryTag$$1 = isUnaryTag;
    var index = 0;
    var last, lastTag;
    while (html) {
        last = html;
        // Make sure we're not in a plaintext content element like script/style
        if (!lastTag || !isPlainTextElement(lastTag)) {
            var textEnd = html.indexOf('<');
            if (textEnd === 0) {
                // Comment:
                if (comment.test(html)) {
                    var commentEnd = html.indexOf('-->');

                    if (commentEnd >= 0) {
                        if (options.shouldKeepComment) {
                            options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3);
                        }
                        advance(commentEnd + 3);
                        continue
                    }
                }

                // http://en.wikipedia.org/wiki/Conditional_comment#Downlevel-revealed_conditional_comment
                if (conditionalComment.test(html)) {
                    var conditionalEnd = html.indexOf(']>');

                    if (conditionalEnd >= 0) {
                        advance(conditionalEnd + 2);
                        continue
                    }
                }

                // Doctype:
                var doctypeMatch = html.match(doctype);
                if (doctypeMatch) {
                    advance(doctypeMatch[0].length);
                    continue
                }

                // End tag:
                var endTagMatch = html.match(endTag);
                if (endTagMatch) {
                    var curIndex = index;
                    advance(endTagMatch[0].length);
                    parseEndTag(endTagMatch[1], curIndex, index);
                    continue
                }

                // Start tag:
                var startTagMatch = parseStartTag();
                if (startTagMatch) {
                    handleStartTag(startTagMatch);
                    if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
                        advance(1);
                    }
                    continue
                }
            }

            var text = (void 0), rest = (void 0), next = (void 0);
            if (textEnd >= 0) {
                rest = html.slice(textEnd);
                while (
                    !endTag.test(rest) &&
                    !startTagOpen.test(rest) &&
                    !comment.test(rest) &&
                    !conditionalComment.test(rest)
                    ) {
                    // < in plain text, be forgiving and treat it as text
                    next = rest.indexOf('<', 1);
                    if (next < 0) { break }
                    textEnd += next;
                    rest = html.slice(textEnd);
                }
                text = html.substring(0, textEnd);
            }

            if (textEnd < 0) {
                text = html;
            }

            if (text) {
                advance(text.length);
            }

            if (options.chars && text) {
                options.chars(text, index - text.length, index);
            }
        } else {
            var endTagLength = 0;
            var stackedTag = lastTag.toLowerCase();
            var reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'));
            var rest$1 = html.replace(reStackedTag, function (all, text, endTag) {
                endTagLength = endTag.length;
                if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
                    text = text
                        .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
                        .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1');
                }
                if (shouldIgnoreFirstNewline(stackedTag, text)) {
                    text = text.slice(1);
                }
                if (options.chars) {
                    options.chars(text);
                }
                return ''
            });
            index += html.length - rest$1.length;
            html = rest$1;
            parseEndTag(stackedTag, index - endTagLength, index);
        }

        if (html === last) {
            options.chars && options.chars(html);
            options.warn(("Mal-formatted tag at end of template: \"" + html + "\""), { start: index + html.length });
            break
        }
    }

    // Clean up any remaining tags
    parseEndTag();

    function advance (n) {
        index += n;
        html = html.substring(n);
    }

    function parseStartTag () {
        var start = html.match(startTagOpen);
        if (start) {
            var match = {
                tagName: start[1],
                attrs: [],
                start: index
            };
            advance(start[0].length);
            var end, attr;
            while (!(end = html.match(startTagClose)) && (attr = html.match(dynamicArgAttribute) || html.match(attribute))) {
                attr.start = index;
                advance(attr[0].length);
                attr.end = index;
                match.attrs.push(attr);
            }
            if (end) {
                match.unarySlash = end[1];
                advance(end[0].length);
                match.end = index;
                return match
            }
        }
    }

    function handleStartTag (match) {
        var tagName = match.tagName;
        var unarySlash = match.unarySlash;

        var unary = isUnaryTag$$1(tagName) || !!unarySlash;

        var l = match.attrs.length;
        var attrs = new Array(l);
        for (var i = 0; i < l; i++) {
            var args = match.attrs[i];
            var value = args[3] || args[4] || args[5] || '';
            var shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
                ? options.shouldDecodeNewlinesForHref
                : options.shouldDecodeNewlines;
            attrs[i] = {
                name: args[1],
                value: decodeAttr(value, shouldDecodeNewlines)
            };
           /* if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
                attrs[i].start = args.start + args[0].match(/^\s*\/).length;
                attrs[i].end = args.end;
            }*/
        }

        if (!unary) {
            stack.push({ tag: tagName, lowerCasedTag: tagName.toLowerCase(), attrs: attrs, start: match.start, end: match.end });
            lastTag = tagName;
        }

        if (options.start) {
            options.start(tagName, attrs, unary, match.start, match.end);
        }
    }

    function parseEndTag (tagName, start, end) {
        var pos, lowerCasedTagName;
        if (start == null) { start = index; }
        if (end == null) { end = index; }

        // Find the closest opened tag of the same type
        if (tagName) {
            lowerCasedTagName = tagName.toLowerCase();
            for (pos = stack.length - 1; pos >= 0; pos--) {
                if (stack[pos].lowerCasedTag === lowerCasedTagName) {
                    break
                }
            }
        } else {
            // If no tag name is provided, clean shop
            pos = 0;
        }

        if (pos >= 0) {
            // Close all the open elements, up the stack
            for (var i = stack.length - 1; i >= pos; i--) {
                if (process.env.NODE_ENV !== 'production' &&
                    (i > pos || !tagName) &&
                    options.warn
                ) {
                    options.warn(
                        ("tag <" + (stack[i].tag) + "> has no matching end tag."),
                        { start: stack[i].start, end: stack[i].end }
                    );
                }
                if (options.end) {
                    options.end(stack[i].tag, start, end);
                }
            }

            // Remove the open elements from the stack
            stack.length = pos;
            lastTag = pos && stack[pos - 1].tag;
        } else if (lowerCasedTagName === 'br') {
            if (options.start) {
                options.start(tagName, [], true, start, end);
            }
        } else if (lowerCasedTagName === 'p') {
            if (options.start) {
                options.start(tagName, [], false, start, end);
            }
            if (options.end) {
                options.end(tagName, start, end);
            }
        }
    }

    this._elements = stack;
};

Parser.prototype.converUse = function (arr) {
    let news = [];
    arr.forEach((value, index) => {

        if (Array.isArray(value)) {
            news.push(value[0]);
        } else {
            news.push(value);
        }
    });

    return news;
};

// 转换为定义js。
Parser.prototype.convertJs = function () {
    let trhjcmeorjgeorfgjcmeirghvrghvnhergfneugcvnerihugv = this._views;
    let liegjnverghrcmlogjwecmoicgregihvmrthgcwemrc;

    for (let i = 0; i < trhjcmeorjgeorfgjcmeirghvrghvnhergfneugcvnerihugv.chillden.length; i++) {
        let node = trhjcmeorjgeorfgjcmeirghvrghvnhergfneugcvnerihugv.chillden[i];
        if (node.type === "template") {
            liegjnverghrcmlogjwecmoicgregihvmrthgcwemrc = node.chillden.filter(val=> typeof val === "object")[0];
            continue;
        }
        if (node.type === "script") {
            this.scriptNode = node;
            continue;
        }
        if (node.type === "style") {
            this.cssNode = node;
        }
    }

    function makeRenderJs (an) {

        if (typeof an ==="string") {
            return JSON.stringify(an);
        }
        return "r(\"" + an.type + "\", "+ JSON.stringify(an.attrs) +", " + (function () {
            let str = "[";
            if (an.chillden && an.chillden.length>0) {
                for (let i = 0; i < an.chillden.length; i++) {
                    str += makeRenderJs(an.chillden[i]);

                    if (i + 1 < an.chillden.length) {
                        str += ",";
                    }
                }
            }
            return str + "]";
        })() + ")";
    }

    let result = makeRenderJs(liegjnverghrcmlogjwecmoicgregihvmrthgcwemrc);

    // console.log("javascript:", this.scriptNode.chillden);

    // console.log("解析完试图:", result);
    // console.log("模板：", this._sfc);
    let option;
    let optionJsSrc;
    if (this.scriptNode && this.scriptNode.chillden.length > 0) {
        function layspa(obj){return obj;}
        optionJsSrc = this.scriptNode.chillden[0];
        option = eval(optionJsSrc);
    }

    this._file.stem = option.name;

    option.use = option.use || [];
    option.use.push("layspa");

    let uses = this.converUse(option.use);


    this._jsResult = "layui.define(" + JSON.stringify(uses) + ", function(exports) {\n" +
        (function () {
            let str = "";
            for (let i = 0; i < option.use.length; i++) {
                let mod = option.use[i];
                if (Array.isArray(mod)) {
                    str += "var " + mod[1] + "=" + "layui." + mod[0] + ";";
                } else {
                    str += "var " + mod + "=" + "layui." + mod + ";";
                }
            }
            return str + "\n";
        })() +
        optionJsSrc.replace("layspa(", "var option=layspa(") +
        ";" +
        "option.render=function(r){return "+ result + "};" +
        "layspa.component(option);"+
        "})";
};


Parser.prototype._transform = function (chunk, enc, done) {
    var _this = this;
    try {
        let content = chunk.toString("utf-8");

        var parent = {
            type: "root",
            chillden: [],
            start: 0,
            parent: null,
            attrs: {}
        };

        function warn(msg) {_this._sfc.errors.push(msg);};
        function start (tag, attrs, unary, start, end) {

            let newblock = {
                type: tag,
                chillden: [],
                start: end,
                parent: parent,
                attrs: attrs.reduce(function (cumulated, ref) {
                    var name = ref.name;
                    var value = ref.value;

                    cumulated[name] = value;
                    return cumulated
                }, {})
            };
            parent.chillden.push(newblock);

            if (unary) { // 自开自闭节点
            } else {
                // 开节点
                parent = newblock;
            }
        }
        function chars(text, start, index) {
            if (parent && text) {
                parent.chillden.push(text);
            }
        }
        function end (tag, start) {
            if (parent && parent.parent) {
                parent = parent.parent;
            }
        }

        this.parseHtml(content, {
            warn: warn,
            start: start,
            end: end,
            chars: chars
        });

        this._views = parent;

        this.convertJs();

    }catch (e) {
        done(e, null);
        return;
    }
    done(null, _this._jsResult);
};

module.exports = function (option) {
    return new Transform({
        objectMode: true,
        transform (file, enc, callback) {

            file.dirname = option.output;

            let parser = new Parser(file);

            if (file.isBuffer()) {
                parser.write(file.contents);
                parser.end();

                let contents = new Buffer(0);
                parser.on('data', function (data) {
                    contents = Buffer.concat([contents, data]);
                });
                parser.once('end', function () {
                    file.contents = contents;
                    callback(null, file);
                });
                return;
            }

            if (file.isStream()) {
                file.contents = file.contents.pipe(parser);
            }
            callback(null, file);
        }
    })
};
