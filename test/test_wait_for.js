if (typeof TestIt === 'undefined'){
  TestIt = require('./../src/test_it').TestIt;
}

(function(){
  var waitForCallbackCalled = false,
      start = new Date(),
      arg;

  TestIt.waitFor(function(time){
    arg = time;
    return (new Date()) - start > 500;
  }, function(){
    waitForCallbackCalled = true;
  });
  setTimeout(function(){
    TestIt('TestIt.waitFor', {
      'should have waited for condition, then ran callback': function(t){
        t.assert(waitForCallbackCalled);
      },
      'should pass-in the time elapsed': function(t){
        t.assert(arg > 500);
      }
    });
  }, 1000);
})();

(function(){
  TestIt('t.waitFor', {
    'should delay each call until the callbacks are called': function(t){
      var calls = [],
          tests = {},
          addStep = function(context, key, name){
            name = name || key;
            context[key] = function(t){
              calls.push(name);
              t.waitFor(function(time){
                return time > 300;
              }, function(){
                calls.push(name+' callback');
              });
            }
          };
      addStep(tests, 'before all');
      addStep(tests, 'after all');
      addStep(tests, 'before each');
      addStep(tests, 'after each');
      tests['context'] = {};
      addStep(tests['context'], 'before all', 'context: before all');
      addStep(tests['context'], 'after all',  'context: after all');
      addStep(tests['context'], 'before each','context: before each');
      addStep(tests['context'], 'after each', 'context: after each');
      addStep(tests['context'], 'test',       'context: test');
      TestIt('tests', tests, function(){});

      t.waitFor(function(time){
        return time > 9*300*1.5;
      }, function(){
        var expected = [
          'before all',           'before all callback',
          'context: before all',  'context: before all callback',
          'before each',          'before each callback',
          'context: before each', 'context: before each callback',
          'context: test',        'context: test callback',
          'context: after each',  'context: after each callback',
          'after each',           'after each callback',
          'context: after all',   'context: after all callback',
          'after all',            'after all callback'
        ];
        t.assertEqual(expected, calls);
      });
    }
  });
})();
