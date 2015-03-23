// Class.js 1.4.4
// author Tangoboy
// http://www.cnblogs.com/tangoboy/archive/2010/08/03/1790412.html
// Dual licensed under the MIT or GPL Version 2 licenses.

(function(root, factory) {

	// Set up $Class appropriately for the environment. Start with AMD or TMD(Im.js)
	if (typeof define === 'function' && (define.amd || define.tmd) ) {

		define([], factory);

	// Next for Node.js or CommonJS.
	} else if (typeof exports !== 'undefined') {

		factory(exports);

	// Finally, as a browser global.
	} else {

		factory(root);

	}

}(this, function(host){

	//不能在严谨代码模式 'use strict';

	var uuid = 0,
	opt = Object.prototype.toString,
	isStr = function(s){return opt.call(s)=="[object String]"},
	isFun = function(f){return opt.call(f)=="[object Function]"},
	isObj = function(o){return opt.call(o)=="[object Object]"},
	isArr = function(a){return opt.call(a)=="[object Array]"},
	isSupport__proto__ = ({}).__proto__ == Object.prototype,//检验__proto__特性
	clone = function(obj){
		var newObj,
			noop = function(){};
		if (Object.create) {
			newObj = Object.create(obj);
		} else {
			noop.prototype = obj;
			newObj = new noop();
		}
		return newObj;
	};
	//创建一个原型对象，创建的是一次克隆
	function createPrototype(proto, constructor) {
		var newProto = clone(proto);
		newProto.constructor = constructor;
		return newProto;
	}
	//混杂
	function mix(r, s) {
		for (var i in s) {
			r[i] = s[i];
		}
		return r;
	}
	//无new实例化 构造函数包裹 使类同时支持 new A() 或 A() 实例化
	function wrapConstructor(constructor){
		return function(){
			var selfConstructor = arguments.callee;
			if(this && this instanceof selfConstructor){// && this.constructor == selfConstructor
				var re = constructor.apply(this, arguments);
				return re&&isObj(re) ? re : this;
			} else {
				return $Class['new'](selfConstructor, arguments);
			}
		};
	}


	var config = {
		constructorName:'__',       //构造方法约定名称，默认约定为双下划线__
		autoSuperConstructor:false, //当子类被实例化时是否先执行父类构造函数 设置后仅对后面声明的类有效
		notUseNew:true,             //是否可以不使用关键字new 直接调用方法实例化对象 如：A()
		useExtend:true,             //是否使用让类拥有拓展继承的方法 如：B = A.$extend({})
		useMixin:true,              //是否使用让类拥有混入其他原型的方法 如：A.$mixin([C.prototype, D.prototype])
		useSuper:true,              //是否让类有$super属性访问父类成员 如：B.$super.foo()
		disguise:false,             //是否让代码生成的构造函数伪装成定义的__:function(){}
		useConstructor:true         //是否使用B.$constructor来保存定义的__构造函数，这里create inherit生成的构造函数是不等于__的
	};


	var $Class = {
		
		/**
		 * UUID方法 生成唯一的id字符串
		 *
		 * @param {String} [prefix] id前缀
		 * @return {String} 唯一的id字符串
		 * @doc
		 */
		uuid:function(prefix){
			return (prefix||"cls_") + (+new Date()).toString( 32 ) + (uuid++).toString( 32 );
		},

		
		Base:null,//作用见后面赋值

		/**
		 * 配置方法 对某些功能设置是否开启.  配置说明见config定义
		 *
		 * @param {String|Object|null} c 某个配置项名|设置配置项|空值
		 * @return {Mixed|Object|Object} 取出某个配置项|混合后的设置配置项|取出所有配置
		 * @doc
		 */
		config:function(c){
			if (isStr(c)){
				return config[c];
			} else if (isObj(c)){
				return config = mix(config, c);
			}
			return config;
		},
		/**
		 * 创建一个类  混合构造函数/原型方式.
		 *
		 * @param {Object} members 定义类成员的对象
		 * @return {Function(Class)} 返回创建的类
		 * @doc
		 */
		create: function(members) {
			return $Class.inherit($Class.Object||Object, members);
		},
		/**
		 * 实例化类 可以替代 new 操作符
		 *
		 * @param {Function(Class)} clas 类
		 * @param {Array} [args] 参数
		 * @return {Object} 返回构建的实例
		 * @doc
		 */
		"new":function(clas, args){
			if (isFun(clas)) {
				var instance = clone(clas.prototype);
				var re = clas.apply(instance, args||[]);
				return re&&isObj(re) ? re : instance;
			} else {
				throw new Error('fatal error: $Class.new expects a constructor of class.');  
			}
		},
		/**
		 * 继承  混合对象冒充原型链方式.
		 *       目前只对构造函数上加上某些属性（如：$super，$constructor，$extend）
		 *       但类的实例是没有任何污染的
		 *
		 * @param {Function(Class)} source 父类
		 * @param {Object} [extendMembers] 定义类成员的对象
		 * @param {Boolean} [autoSuperConstructor] 默认false 当子类被实例化时是否先执行父类构造函数
		 * @return {Function(Class)} 返回创建的子类
		 * @doc
		 *
		 * 差异：
		 *		1.返回类 !== extendMembers.__
		 *		2.不支持__proto__的浏览器下 for in 遍历实例会遍历出constructor
		 */
		inherit:function(source, extendMembers, autoSuperConstructor) {
			if (!isFun(source)) return;
			extendMembers = extendMembers || {};
			autoSuperConstructor = autoSuperConstructor||config.autoSuperConstructor;
			var defineConstructor = extendMembers[config.constructorName] || function(){};
			//过滤构造方法和原型方法
			delete extendMembers[config.constructorName];
			//对象冒充
			var _constructor = function(){
				if(autoSuperConstructor){
					source.apply(this, arguments);
				}
				var re = defineConstructor.apply(this, arguments);
				if(re && isObj(re))return re;
			};

			if (config.notUseNew) {
				//构造函数包裹 new A 和 A() 可以同时兼容
				_constructor = wrapConstructor(_constructor);
			}
			if (config.disguise) {
				_constructor.name = defineConstructor.name;
				_constructor.length = defineConstructor.length;
				_constructor.toString = function(){return defineConstructor.toString()};//屏蔽了构造函数的实现
			}
			//维持原型链 把父类原型赋值到给构造器原型，维持原型链
			if (isSupport__proto__) { 
				_constructor.prototype.__proto__ = source.prototype;
			} else {
				_constructor.prototype = createPrototype(source.prototype, _constructor);
			}
			
			//原型扩展 把最后配置的成员加入到原型上
			this.include(_constructor, extendMembers);

			if (config.useSuper) {
				//添加父类属性
				_constructor.$super = createPrototype(source.prototype, source);
			}

			if (config.useConstructor) {
				//添加定义的构造函数
				_constructor.$constructor = defineConstructor;
			}

			if (config.useExtend) {
				_constructor.$extend = function(extendMembers, execsuperc){
					return $Class.inherit(this, extendMembers, execsuperc);
				};
			}
			
			if (config.useMixin) {
				_constructor.$mixin = function(protos){
					return $Class.include(this, protos);
				};
			}

			return _constructor;
		},
		/**
		 * 原型成员扩展.
		 *
		 * @param {Function(Class)} target 需要被原型拓展的类
		 * @param {Object|Array} [protos] 定义原型成员的对象或多个原型对象的数组
		 * @return {Function(Class)} 返回被拓展的类
		 * @doc
		 */
		include:function(target, protos){
			if (!isFun(target)) { target = function(){}; }
			if (isObj(protos)) {
				mix(target.prototype, protos);
			} else if (isArr(protos)) {
				for (var i = 0; i<protos.length; i++) {
					if (isObj(protos[i])) {
						mix(target.prototype, protos[i]);
					}
				}
			}
			return target;
		},
		/**
		 * 创建一个单例类   无论怎么实例化只有一个实例存在
		 *       此单例类与常用{}作为单例的区别：
		 *       有前者是标准function类，需要实例化，可以拓展原型，可以继承
		 *
		 * @param {Object} members 定义单例类成员的对象 
		 * @return {Object} singletonClass 单例类
		 * @doc
		 */
		singleton:function(members){
			var singletonClass;
			var _constructor = members[config.constructorName] || function(){};
			var newMembers = {};
			newMembers[config.constructorName] = function(){
				_constructor.apply(this, arguments);
				if (singletonClass.$instance instanceof singletonClass) {
					return singletonClass.$instance;
				} else {
					return singletonClass.$instance = this;
				}
			};
			return singletonClass = $Class.create(mix(members||{}, newMembers));
		},
		/**
		 * 克隆对象.
		 *
		 * @param {Object} o 需要克隆的对象
		 * @return {Object} 返回克隆后的对象
		 * @doc
		 */
		clone:clone,
		/**
		 * 获取某个类的成员 会从原型链上遍历获取.
		 *
		 * @param {Object} clas 类
		 * @return {Array} 返回该类整个原型链上的成员
		 * @doc
		 */
		member:function(clas){
			if (!isFun(clas)) return;
			var member = [];
			var m = {constructor:1};
			for (var chain = clas.prototype; chain && chain.constructor; chain = chain.constructor.prototype) {
				for (var k in chain) {
					m[k] = 1;
				}
				if (chain.constructor==clas || chain.constructor==Object) {
					//链为循环 或者 链到达Object 结束
					//不在Object原型上去循环了Object.prototype.constructor == Object
					break;
				}
			};
			for (var i in m) {
				member.push(i);
			}
			return member;
		},
		/**
		 * 混杂
		 *
		 * @param {Object} r 被混杂的Object
		 * @param {Object} s 参入的Object
		 * @return {Object} r 被混杂的Object
		 * @doc
		 */
		mix:mix
	};




	// Events.js
	// Events
    // -----------------
    // From:
    // - https://raw.github.com/aralejs/events/master/src/events.js
    // Thanks to:
    // - https://github.com/documentcloud/backbone/blob/master/backbone.js
    // - https://github.com/joyent/node/blob/master/lib/events.js


    // Regular expression used to split event strings
    var eventSplitter = /\s+/


    // A module that can be mixed in to *any object* in order to provide it
    // with custom events. You may bind with `on` or remove with `off` callback
    // functions to an event; `trigger`-ing an event fires all callbacks in
    // succession.
    //
    // var object = new Events();
    // object.on('expand', function(){ alert('expanded'); });
    // object.trigger('expand');
    //
    function Events() {}


    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    Events.prototype.on = function(events, callback, context) {
        var cache, event, list;
        if (!callback) return this;

        cache = this.__events || (this.__events = {});
        events = events.split(eventSplitter);

        while (event = events.shift()) {
            list = cache[event] || (cache[event] = []);
            list.push({
                callback:callback,
                context:context,
                eventName:event
            });
        }

        return this;
    };
    
    
    Events.prototype.once = function(events, callback, context) {
        var that = this;
        var cb = function() {
            that.off(events, cb);
            callback.apply(context || that, arguments);
        };
        return this.on(events, cb, context);
    };


    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    Events.prototype.off = function(events, callback, context) {
        var cache, event, list, i;

        // No events, or removing *all* events.
        if (!(cache = this.__events)) return this;
        if (!(events || callback || context)) {
            delete this.__events;
            return this;
        }

        events = events ? events.split(eventSplitter) : keys(cache);

        // Loop through the callback list, splicing where appropriate.
        while (event = events.shift()) {
            list = cache[event];
            if (!list) continue;

            if (!(callback || context)) {
                delete cache[event];
                continue;
            }
            for(i = list.length - 1; i >= 0; i -= 1){
                if(!(callback && list[i].callback !== callback || context && list[i].context !== context)){
                    list.splice(i, 1);
                }
            }
        }

        return this;
    }




    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    Events.prototype.trigger = function(events) {
        var cache, event, all, list, i, len, rest = [],
            args;
        if (!(cache = this.__events)) return this;

        events = events.split(eventSplitter);

        // Fill up `rest` with the callback arguments. Since we're only copying
        // the tail of `arguments`, a loop is much faster than Array#slice.
        for (i = 1, len = arguments.length; i < len; i++) {
            rest[i - 1] = arguments[i];
        }

        // For each event, walk through the list of callbacks twice, first to
        // trigger the event, then to trigger any `"all"` callbacks.
        while (event = events.shift()) {
            // Copy callback lists to prevent modification.
            if (all = cache.all) all = all.slice();
            if (list = cache[event]) list = list.slice();

            // Execute event callbacks.
            if (list) {
                for (i = 0, len = list.length; i < len; i += 1) {
                    list[i].callback.apply(list[i].context || this, rest);
                }
            }

            // Execute "all" callbacks.
            if (all) {
                args = [event].concat(rest);
                for (i = 0, len = all.length; i < len; i += 2) {
                    all[i].callback.apply(all[i].context || this, args);
                }
            }
        }

        return this;
    }
    
    
    
    var keys = Object.keys;

    if (!keys) {
      keys = function(o) {
        var result = [];

        for (var name in o) {
          if (o.hasOwnProperty(name)) {
            result.push(name);
          }
        }
        return result;
      };
    }


    $Class.Events = Events;



    //Aspect.js
    //deps: Event
    
    // Aspect
    // ---------------------
    // Thanks to:
    //  - http://yuilibrary.com/yui/docs/api/classes/Do.html
    //  - http://code.google.com/p/jquery-aop/
    //  - http://lazutkin.com/blog/2008/may/18/aop-aspect-javascript-dojo/
    
    
    function Aspect(){};

    // 在指定方法执行前，先执行 callback
    Aspect.prototype.before = function(methodName, callback, context) {
        return weave.call(this, 'before', methodName, callback, context);
    };
    
    // 在指定方法执行后，再执行 callback
    Aspect.prototype.after = function(methodName, callback, context) {
        return weave.call(this, 'after', methodName, callback, context);
    };

    // Helpers
    // -------

    var eventSplitter = /\s+/;

    function weave(when, methodName, callback, context) {
      var names = methodName.split(eventSplitter);
      var name, method;

      while (name = names.shift()) {
        method = getMethod(this, name);
        if (!method.__isAspected) {
          wrap.call(this, name);
        }
        
        this.on(when + ':' + name + "()", callback, context);
      }

      return this;
    }


    function getMethod(host, methodName) {
      var method = host[methodName];
      if (!method) {
        throw new Error('Invalid method name: ' + methodName);
      }
      return method;
    }


    function wrap(methodName) {
      var old = this[methodName];

      this[methodName] = function() {
          var args = Array.prototype.slice.call(arguments);
          var beforeArgs = ['before:' + methodName + '()'].concat(args);

          // prevent if trigger return false
          if (this.trigger.apply(this, beforeArgs) === false) return;

          var ret = old.apply(this, arguments);
          var afterArgs = ['after:' + methodName + '()', ret].concat(args);
          this.trigger.apply(this, afterArgs);

          return ret;
      };

      this[methodName].__isAspected = true;
    }
    
    $Class.Aspect = Aspect;





    //Attributes.js;
    //deps: Event Aspect
    function Attributes(){}
    
    
    var attrRoot = "";
    
    Attributes.prototype.initAttrs = function(root){
        
        if(typeof root == "string"){
            attrRoot = root+".";
        }
        
        this.before("set", function(name, afterValue){
            var beforeValue = getValueByPath(this, name);
            this.trigger("before:"+name, name, beforeValue, afterValue);
        });
        this.after("set", function(beforeValue, name, afterValue){
            this.trigger("after:"+name, name, beforeValue, afterValue)
        });
        
    };
    
    
    
    Attributes.prototype.set = function(name, value){
        
        name = attrRoot + name;
        
        if(!this.set.__isAspected){
            this.initAttrs();
            return this.set.call(this, name, value);
        }
        var oldValue = getValueByPath(this, name);
        setValueByPath(this, name, value);
        return oldValue;
    };
    
    Attributes.prototype.get = function(name){
        
        name = attrRoot + name;
        
        return getValueByPath(this, name);
    };

    
    
    // Helpers
    // -------   
    
    // - from: https://gist.github.com/fengdi/5330459
    
    function setValueByPath(obj, path, value){
        var temp, k, re = obj;

        if(!obj || (typeof obj!="object" && typeof obj!="function"))
        return obj;

        (path+"").replace(/([^.:]+)([.:])?/g, function(m, n, sign){
            temp = obj;
            k = n;
            obj = obj[n] = (obj!=void 0 && (typeof obj=="object" || typeof obj=="function") && n in obj) ? obj[n] : sign ==":" ?  [] : {};
        });

        if(k && temp){
            temp[k] = value;
        }
        return re;
    }
    
    
    // - from: https://gist.github.com/fengdi/5326735
    
    function getValueByPath(obj, path){
        (path+"").replace(/[^.:]+/g,function(n){
        obj = (obj!=void 0 && (typeof obj=="object" || typeof obj=="function") && n in obj) ? obj[n] : void 0;
        });
        return obj;
    }
    
    
    
    $Class.Attributes = Attributes;







    // Spore and Base

    $Class.Spore = $Class.Base = $Class.create({
        __: function(){
            this.uuid = $Class.uuid();
        },
        destroy: function(){
            this.trigger('destroy');
            this.off();
            
            for (var p in this) {
                if (this.hasOwnProperty(p)) {
                    delete this[p];
                }
            }
            this.destroy = function() {};
        }
    }).$mixin([
        Events.prototype,
        Aspect.prototype,
        Attributes.prototype
    ]);



	// Object
	// 所有$Class.create的类Foo都继承自$Class.Object     Foo <= $Class.Object <= Object
	// 因此你可以通过$Class.Object.prototype拓展所有create出来的类
	// 你也可以删除$Class.Object 或者 $Class.Object = null 这样就可以改变继承为 Foo <= Object
	$Class.Object = $Class.inherit(Object);

	if(host){
		host.$Class = $Class;
	}

	return $Class;
	

}));



