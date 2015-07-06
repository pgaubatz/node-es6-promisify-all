//
// DISCLAIMER:
//
// The following tests have been "borrowed" from Bluebird!
// (see, https://github.com/petkaantonov/bluebird/blob/master/test/mocha/promisify.js)
//

'use strict';

var assert = require('assert');

var promisify = require('es6-promisify');

var promisifyAll = require('../lib/promisify-all');

describe('promisifyAll', function () {

  describe('object promisification', function () {

    var o = {
      value: 15,

      f: function (a, b, c, d, e, f, g, cb) {
        cb(null, [a, b, c, d, e, f, g, this.value])
      }

    };

    var objf = function () {
    };

    objf.value = 15;
    objf.f = function (a, b, c, d, e, f, g, cb) {
      cb(null, [a, b, c, d, e, f, g, this.value])
    };

    function Test(data) {
      this.data = data;
    }

    Test.prototype.get = function (a, b, c, cb) {
      cb(null, a, b, c, this.data);
    };

    Test.prototype.getMany = function (a, b, c, d, e, f, g, cb) {
      cb(null, a, b, c, d, e, f, g, this.data);
    };

    promisifyAll(o);
    promisifyAll(objf);
    promisifyAll(Test.prototype);

    it('should not repromisify', function () {
      var f = o.f;
      var fAsync = o.fAsync;
      var getOwnPropertyNames = Object.getOwnPropertyNames(o);
      var ret = promisifyAll(o);
      assert.equal(f, o.f);
      assert.equal(fAsync, o.fAsync);
      assert.deepEqual(Object.getOwnPropertyNames(o), getOwnPropertyNames);
      assert.equal(ret, o);
    });

    it('should not repromisify function object', function () {
      var f = objf.f;
      var fAsync = objf.fAsync;
      var getOwnPropertyNames = Object.getOwnPropertyNames(objf);
      var ret = promisifyAll(objf);
      assert.equal(f, objf.f);
      assert.equal(fAsync, objf.fAsync);
      assert.deepEqual(getOwnPropertyNames, Object.getOwnPropertyNames(objf));
      assert.equal(ret, objf);
    });

    it('should work on function objects too', function () {
      objf.fAsync(1, 2, 3, 4, 5, 6, 7).then(function (result) {
        assert.deepEqual(result, [1, 2, 3, 4, 5, 6, 7, 15]);
      });
    });

    it('should work on prototypes and not mix-up the instances', function () {
      var a = new Test(15);
      var b = new Test(30);
      var c = new Test(45);
      return Promise.all([
        a.getAsync(1, 2, 3).then(function (result) {
          assert.deepEqual(result, [1, 2, 3, 15]);
        }),

        b.getAsync(4, 5, 6).then(function (result) {
          assert.deepEqual(result, [4, 5, 6, 30]);
        }),

        c.getAsync(7, 8, 9).then(function (result) {
          assert.deepEqual(result, [7, 8, 9, 45]);
        })
      ]);
    });

    it('should work on prototypes and not mix-up the instances with more than 5 arguments', function () {
      var a = new Test(15);
      var b = new Test(30);
      var c = new Test(45);

      return Promise.all([
        a.getManyAsync(1, 2, 3, 4, 5, 6, 7).then(function (result) {
          assert.deepEqual(result, [1, 2, 3, 4, 5, 6, 7, 15]);
        }),

        b.getManyAsync(4, 5, 6, 7, 8, 9, 10).then(function (result) {
          assert.deepEqual(result, [4, 5, 6, 7, 8, 9, 10, 30]);
        }),

        c.getManyAsync(7, 8, 9, 10, 11, 12, 13).then(function (result) {
          assert.deepEqual(result, [7, 8, 9, 10, 11, 12, 13, 45]);
        })
      ]);
    });

    it('should fail to promisify Async suffixed methods', function () {
      var o = {
        x: function (cb) {
          cb(null, 13);
        },
        xAsync: function (cb) {
          cb(null, 13);
        },

        xAsyncAsync: function (cb) {
          cb(null, 13)
        }
      };
      try {
        promisifyAll(o);
      }
      catch (e) {
        assert(e instanceof Promise.TypeError);
      }
    });

    it('should call overridden methods', function () {
      function Model() {
        this.save = function () {
        };
      }

      Model.prototype.save = function () {
        throw new Error('');
      };

      promisifyAll(Model.prototype);
      var model = new Model();
      model.saveAsync();
    });

    it('should lookup method dynamically if "this" is given', function () {
      var obj = {
        fn: function (cb) {
          cb(null, 1);
        }
      };
      promisifyAll(obj);
      obj.fn = function (cb) {
        cb(null, 2);
      };
      return obj.fnAsync().then(function (val) {
        assert.strictEqual(2, val);
      });
    });

    it('gh335', function () {
      function HasArgs() {
      }

      HasArgs.prototype.args = function (cb) {
        return cb(null, 'ok');
      };

      promisifyAll(HasArgs.prototype);
      var a = new HasArgs();
      return a.argsAsync().then(function (res) {
        assert.equal(res, 'ok');
      });
    });
    it('should not promisify Object.prototype methods', function () {
      var o = {};
      var keys = Object.keys(o);
      promisifyAll(o);
      assert.deepEqual(keys.sort(), Object.keys(o).sort());
    });

    it('should not promisify Object.prototype methods', function () {
      var o = {
        method: function () {
        }
      };
      promisifyAll(o);
      assert.deepEqual(['method', 'methodAsync'].sort(), Object.keys(o).sort());
    });

  });

  describe('module promisification', function () {
    it('should promisify module with direct property classes', function () {
      function RedisClient() {
      }

      RedisClient.prototype.query = function () {
      };
      function Multi() {
      }

      Multi.prototype.exec = function () {
      };
      Multi.staticMethod = function () {
      };

      var redis = {
        RedisClient: RedisClient,
        Multi: Multi,
        moduleMethod: function () {
        }
      };
      redis.Multi.staticMethod.tooDeep = function () {
      };

      promisifyAll(redis);

      assert(typeof redis.moduleMethodAsync === 'function');
      assert(typeof redis.Multi.staticMethodAsync === 'function');
      assert(typeof redis.Multi.prototype.execAsync === 'function');
      assert(typeof redis.RedisClient.prototype.queryAsync === 'function');
      assert(typeof redis.Multi.staticMethod.tooDeepAsync === 'undefined');
    });

    it('should promisify module with inherited property classes', function () {
      function Mongoose() {
      }

      var Model = Mongoose.prototype.Model = function () {
      };
      Model.prototype.find = function () {
      };
      var Document = Mongoose.prototype.Document = function () {
      };
      Document.prototype.create = function () {
      };
      Document.staticMethod = function () {
      };
      var mongoose = new Mongoose();

      promisifyAll(mongoose);

      assert(typeof mongoose.Model.prototype.findAsync === 'function');
      assert(typeof mongoose.Document.prototype.createAsync === 'function');
      assert(typeof mongoose.Document.staticMethodAsync === 'function')
    });

    it('should promisify classes that have static methods', function () {
      function MongoClient() {
        this.connect = 3;
      }

      MongoClient.connect = function () {
      };
      var module = {};
      module.MongoClient = MongoClient;
      promisifyAll(module);

      assert(typeof MongoClient.connectAsync === 'function');
    });
  });

  describe('promisification from prototype to object', function () {
    var getterCalled = 0;

    function makeClass() {
      var Test = (function () {

        function Test() {

        }

        var method = Test.prototype;

        method.test = function () {

        };

        method['---invalid---'] = function () {
        };

        Object.defineProperty(method, 'thrower', {
          enumerable: true,
          configurable: true,
          get: function () {
            throw new Error('getter called');
          },
          set: function () {
            throw new Error('setter called');
          }
        });
        Object.defineProperty(method, 'counter', {
          enumerable: true,
          configurable: true,
          get: function () {
            getterCalled++;
          },
          set: function () {
            throw new Error('setter called');
          }
        });

        return Test;
      })();

      return Test;
    }

    it('shouldn\'t touch the prototype when promisifying instance', function () {
      var Test = makeClass();

      var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
      var a = new Test();
      promisifyAll(a);

      assert(typeof a.testAsync === 'function');
      assert(a.hasOwnProperty('testAsync'));
      assert.deepEqual(Object.getOwnPropertyNames(Test.prototype).sort(), origKeys);
      assert(getterCalled === 0);
    });

    it('shouldn\'t touch the method', function () {
      var Test = makeClass();

      var origKeys = Object.getOwnPropertyNames(Test.prototype.test).sort();
      var a = new Test();
      promisifyAll(a);


      assert(typeof a.testAsync === 'function');
      assert.deepEqual(Object.getOwnPropertyNames(Test.prototype.test).sort(), origKeys);
      assert(promisify(a.test) !== a.testAsync);
      assert(getterCalled === 0);
    });

    it('should promisify own method even if a promisified method of same name already exists somewhere in proto chain', function () {
      var Test = makeClass();
      var instance = new Test();
      promisifyAll(instance);
      var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
      var origInstanceKeys = Object.getOwnPropertyNames(instance).sort();
      instance.test = function () {
      };
      promisifyAll(instance);
      assert.deepEqual(origKeys, Object.getOwnPropertyNames(Test.prototype).sort());
      assert.notDeepEqual(origInstanceKeys, Object.getOwnPropertyNames(instance).sort());
      assert(getterCalled === 0);
    });

    it('shouldn\'t promisify the method closest to the object if method of same name already exists somewhere in proto chain', function () {
      //IF the implementation is for-in, this pretty much tests spec compliance
      var Test = makeClass();
      var origKeys = Object.getOwnPropertyNames(Test.prototype).sort();
      var instance = new Test();
      instance.test = function () {
      };
      promisifyAll(instance);

      assert.deepEqual(Object.getOwnPropertyNames(Test.prototype).sort(), origKeys);
      assert(instance.test === instance.test);
      assert(getterCalled === 0);
    });

  });

});
