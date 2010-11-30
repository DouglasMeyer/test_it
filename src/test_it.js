(function(global){

  var T = global.TestIt = function(name, tests, callback){
    new T.Context(tests);
    callback();
  };

  T.Context = function(tests, contextBefore, contextAfter){
    var before = (contextBefore || []).concat();
    var after  = (contextAfter  || []).concat();
    var beforeAll  = tests['before all'],
        afterAll   = tests['after all' ];
    if (tests['before each']) { before.push(  tests['before each']); }
    if (tests['after each' ]) { after.unshift(tests['after each' ]); }
    delete(tests['before all' ]);
    delete(tests['before each']);
    delete(tests['after each' ]);
    delete(tests['after all'  ]);
    beforeAll && beforeAll();
    for(var testName in tests){
      var test = tests[testName];
      if (typeof(test) === 'function') {
        for(var i=0,b;b=before[i];i++){ b(); }
        test(new T.Assertions());
        for(var i=0,a;a=after[i ];i++){ a(); }
      } else {
        new T.Context(test, before, after);
      }
    }
    afterAll && afterAll();
  };

  T.Assertions = function(){ };
  T.Assertions.prototype.assert = function(assertion, message){
    if (!assertion) { throw new T.Assertions.Failure(message); }
  };
  T.Assertions.prototype.assertEqual = function(expected, actual, message){
    if (!T.isEqual(expected, actual)) { throw new T.Assertions.Failure(message); }
  };
  T.Assertions.Failure = function(message){ this.message = message; };
  T.isEqual = function(expected, actual){
    if (Array === expected.constructor) {
      if (expected.length !== actual.length) { return false; }
      for (var i=0,e;e=expected[i];i++){ if (e !== actual[i]){ return false; } }
      return true;
    } else {
      return expected === actual;
    }
  };

})(window);
