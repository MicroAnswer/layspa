layui.define(["layer","form","table","layspa"],function(l){var t=layui.layer,a=(layui.form,layui.table);l("testpage",(0,layui.layspa)({render:function(l){return l.call(this,"div",{},[l.call(this,"h1",{class:"layui-nav-title"},["Layui 单文件页面示例"]),l.call(this,"div",{},[" ",l.call(this,"p",{},["我看啊可能"])," 呵呵？",l.call(this,"a",{href:"https://www.microanswer.cn"},["Microanswer"])," "]),l.call(this,"p",{},["你好，我是来自lay-spa单文件页面的某个局部文件布局内容。"]),l.call(this,"button",{class:"layui-btn layui-btn-sm","@click":"doclick"},["hello"]),l.call(this,"hr",{},[]),l.call(this,"table",{"lay-filter":"demo"},[" ",l.call(this,"thead",{},[" ",l.call(this,"tr",{},[" ",l.call(this,"th",{"lay-data":"{field:'username', width:100}"},["昵称"])," ",l.call(this,"th",{"lay-data":"{field:'experience', width:80, sort:true}"},["积分"])," ",l.call(this,"th",{"lay-data":"{field:'sign'}"},["签名"])," "])," "])," ",l.call(this,"tbody",{},[" ",l.call(this,"tr",{},[" ",l.call(this,"td",{},["贤心1"])," ",l.call(this,"td",{},["66"])," ",l.call(this,"td",{},["人生就像是一场修行a"])," "])," ",l.call(this,"tr",{},[" ",l.call(this,"td",{},["贤心2"])," ",l.call(this,"td",{},["88"])," ",l.call(this,"td",{},["人生就像是一场修行b"])," "])," ",l.call(this,"tr",{},[" ",l.call(this,"td",{},["贤心3"])," ",l.call(this,"td",{},["33"])," ",l.call(this,"td",{},["人生就像是一场修行c"])," "])," "])," "])])},title:"测试页面",el:"#target",name:"testpage",use:["layer","form","table"],ready:function(l){console.log(this.title+"页面打开成功！"),l.find("span").text(this.title+"界面打开成功！"),a.init("demo",{height:315,limit:10})},methods:{doclick:function(){t.alert("你好！"+this.title)}}}))});