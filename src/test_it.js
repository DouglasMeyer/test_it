(function(global){

  var T = global.TestIt = function(name, tests){
    var results = {};
    results[name] = new T.Context(tests);
    return results;
  };

  T.Context = function(tests, contextBefore, contextAfter){
    var results = {};
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
    try {
      beforeAll && beforeAll();
    } catch (e) {
      return { 'before all': { result: 'error', message: e } };
    }
    for(var testName in tests){
      var test = tests[testName];
      if (typeof(test) === 'function') {
        results[testName] = {};
        try {
          for(var i=0,b;b=before[i];i++){ b(); }
          test(new T.Assertions());
        } catch (e) {
          if (e.constructor === T.Assertions.Failure) {
            results[testName].result = 'fail';
            results[testName].message = e.message;
          } else {
            results[testName].result = 'error';
            results[testName].message = e;
          }
        }
        for(var i=0,a;a=after[i];i++){ a(); }
        if (results[testName].result === undefined) {
          results[testName].result = 'pass';
        }
      } else {
        results[testName] = new T.Context(test, before, after);
      }
    }
    afterAll && afterAll();
    return results;
  };

// Assertions
  T.Assertions = function(){ };
  T.Assertions.prototype.assert = function(assertion, message){
    if (!assertion) { throw new T.Assertions.Failure(message); }
  };
  T.Assertions.prototype.assertEqual = function(expected, actual, message){
    if (!T.isEqual(expected, actual)) { throw new T.Assertions.Failure(message); }
  };
  T.Assertions.Failure = function(message){ this.message = message; };

// Helpers
  T.isEqual = function(expected, actual){
    if (Array === expected.constructor) {
      if (expected.length !== actual.length) { return false; }
      for (var i=0,e;e=expected[i];i++){ if (e !== actual[i]){ return false; } }
      return true;
    } else {
      return expected === actual;
    }
  };
  T.try = function(){
    var i=1,e=arguments[0];
    while (e && arguments[i]) {
      e = e[arguments[i]];
      i = i + 1;
    }
    return e;
  };

})(window);
