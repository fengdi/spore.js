spore.js
========

一个支持现代浏览器微型的库 孢子

        var WidgetClass = $Class.Base.$extend({
          __:function(){

          },
          barFn:function(s){   // 相当于：WidgetClass.prototype.barFn
            console.log("barFn Run! parm:"+s);
          }
        });


        var w = WidgetClass(); //实例化类


        //---------------------------------------
        w.on("customEvent", function(a){
          console.log('customEvent事件被触发, 数据：',a);
        });
        w.trigger("customEvent", {d:1});



        //---------------------------------------
        w.on("before:fooName", function(propName, beforeValue, afterValue){
          console.log(propName+"属性被改变, 变化值", beforeValue, afterValue)
        });
        w.set('fooName', "string hello!");


        //---------------------------------------
        w.set('a.b.c.d', 'dddd');
        console.log('设置a.b.c.d属性名后的a的数据', w.get('a'));


        //---------------------------------------
        //前面类中定义了barFn方法

        w.before("barFn", function(s){
          console.log("barFn 方法将被调用, 参数：", s);
        });
        w.after("barFn", function(s){
          console.log("barFn 方法调用完成");
        });

        w.barFn("pppppp!");


