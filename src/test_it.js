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
    beforeAll();
    for(var testName in tests){
      var test = tests[testName];
      if (typeof(test) === 'function') {
        for(var i=0,b;b=before[i];i++){ b(); }
        test();
        for(var i=0,a;a=after[i ];i++){ a(); }
      } else {
        new T.Context(test, before, after);
      }
    }
    afterAll();
  };

})(window);
