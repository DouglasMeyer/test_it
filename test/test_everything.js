var TestIt;
if (typeof TestIt === 'undefined'){
  TestIt = require('./../src/test_it').TestIt;
  var element = {
    appendChild: function(){},
    getElementsByTagName: function(){ return []; }
  };
  document = {
    body: element,
    createElement: function(){
      return element;
    }
  };
}

var log,
    fakeTestItReporter = function(results){
      log = this.constructor.log = [];
      log.appendChild = log.push;
      this.reportContext(results);
      return results;
    };
fakeTestItReporter.prototype = new TestIt.DomReporter({});
fakeTestItReporter.prototype.constructor = fakeTestItReporter;

(function(){
  var calls, results;

  TestIt('before/after tests and contexts', {
    'before all': function(t){
      calls = [];
      results = TestIt('the tests', {
        'before all':  function(){ calls.push('before all');  },
        'before each': function(){ calls.push('before each'); },
        'after all':   function(){ calls.push('after all');   },
        'after each':  function(){ calls.push('after each');  },
        'should work': function(){ calls.push('should work'); },
        'context name': {
          'before all':       function(){ calls.push('context before all');  },
          'before each':      function(){ calls.push('context before each'); },
          'after all':        function(){ calls.push('context after all');   },
          'after each':       function(){ calls.push('context after each');  },
          'should work':      function(){ calls.push('context should work'); },
          'should also work': function(){ calls.push('context should also work'); },
          'should not work':  function(t){ calls.push('context should not work'); t.assert(false, 'nope'); },
          'should raise':     function(){ calls.push('context should raise'); throw 'ouch'; }
        },
        'should also work': function(){ calls.push('should also work'); }
      }, fakeTestItReporter);
    },
    'should be in order': function(t){
      var expected = [];
      expected.push('before all');
        expected.push('before each');
        expected.push('should work');
        expected.push('after each');

        expected.push('context before all');
          expected.push('before each');
          expected.push('context before each');
          expected.push('context should work');
          expected.push('context after each');
          expected.push('after each');

          expected.push('before each');
          expected.push('context before each');
          expected.push('context should also work');
          expected.push('context after each');
          expected.push('after each');

          expected.push('before each');
          expected.push('context before each');
          expected.push('context should not work');
          expected.push('context after each');
          expected.push('after each');

          expected.push('before each');
          expected.push('context before each');
          expected.push('context should raise');
          expected.push('context after each');
          expected.push('after each');
        expected.push('context after all');

        expected.push('before each');
        expected.push('should also work');
        expected.push('after each');
      expected.push('after all');
      t.assertEqual(expected, calls);
    },
    'should return results': function(t){
      var keys;

      keys = [];
      for (var key in results) { keys.push(key); }
      t.assertEqual(['the tests'], keys);

      keys = [];
      for (var key in results['the tests']) { keys.push(key); }
      t.assertEqual(['should work', 'context name', 'should also work'], keys);

      t.assertEqual('pass',  results['the tests']['should work']['result']);
      t.assertEqual('pass',  results['the tests']['context name']['should work']['result']);
      t.assertEqual('fail',  results['the tests']['context name']['should not work']['result']);
      t.assertEqual('nope',  results['the tests']['context name']['should not work']['message']);
      t.assertEqual('error', results['the tests']['context name']['should raise']['result']);
      t.assertEqual('ouch',  results['the tests']['context name']['should raise']['message']);
    }
  });
})();

(function(){
  var results, calls = [];

  TestIt('extensions', {
    'before all': function(t){
      var extension1 = {
        'before all': function(){ calls.push('extension1 before all'); },
        'before each': function(){ calls.push('extension1 before each'); },
        'after all': function(){ calls.push('extension1 after all'); },
        'after each': function(){ calls.push('extension1 after each'); }
      };
      var extension2 = {
        'before all': function(){ calls.push('extension2 before all'); },
        'before each': function(){ calls.push('extension2 before each'); },
        'after all': function(){ calls.push('extension2 after all'); },
        'after each': function(){ calls.push('extension2 after each'); }
      };
      results = TestIt('testing', {
        'before all': function(){ calls.push('before all'); },
        'before each': function(){ calls.push('before each'); },
        'after all': function(){ calls.push('after all'); },
        'after each': function(){ calls.push('after each'); },
        'test something': function(){ calls.push('test something'); },
        'test something else': function(){ calls.push('test something else'); }
      }, extension1, extension2, fakeTestItReporter);
    },
    'should include before/after all/each': function(t){
      var expected = [
        'extension1 before all',
        'extension2 before all',
        'before all',

          'extension1 before each',
          'extension2 before each',
          'before each',
          'test something',
          'after each',
          'extension2 after each',
          'extension1 after each',

          'extension1 before each',
          'extension2 before each',
          'before each',
          'test something else',
          'after each',
          'extension2 after each',
          'extension1 after each',

        'after all',
        'extension2 after all',
        'extension1 after all'
      ];
      t.assertEqual(expected, calls);
    },
    'should not change results': function(t){
      var keys;

      keys = [];
      for (var key in results){ keys.push(key); }
      t.assertEqual(['testing'], keys);

      t.assert(results['testing']['test something']);
    }
  });
})();

(function(){
  var calls, results;
  TestIt('exceptions', {
    'in "before all"': {
      'before all': function(t){
        calls = [];
        results = TestIt('tests', {
          'before all': function(){ throw 'out'; },
          'after all': function(){ calls.push('after all'); },
          'a test': function(){ calls.push('a test'); }
        }, fakeTestItReporter);
      },
      'should be reported': function(t){
        t.assertEqual('error', results['tests']['before all']['result']);
        t.assertEqual('out', results['tests']['before all']['message']);
      },
      'should run the "after all"': function(t){
        t.assertEqual(1, calls.length);
        t.assertEqual('after all', calls[0]);
      },
      'should not run test': function(t){
        t.assertEqual(1, calls.length);
        t.assert(calls[0] !== 'a test');
      }
    },
    'in "before each"': {
      'before all': function(t){
        calls = [];
        results = TestIt('tests', {
          'before each': function(){ throw 'out'; },
          'after each': function(){ calls.push('after each'); },
          'after all': function(){ calls.push('after all'); },
          'a test': function(){ calls.push('a test'); }
        }, fakeTestItReporter);
      },
      'should be reported': function(t){
        t.assertEqual('error', results['tests']['a test']['result']);
        t.assertEqual('out', results['tests']['a test']['message']);
      },
      'should run the "after each"': function(t){
        t.assertEqual(2, calls.length);
        t.assertEqual('after each', calls[0]);
      },
      'should run the "after all"': function(t){
        t.assertEqual(2, calls.length);
        t.assertEqual('after all', calls[1]);
      },
      'should not run test': function(t){
        t.assertEqual(2, calls.length);
        t.assert(calls[0] !== 'a test' && calls[1] !== 'a test');
      }
    },
    'in "after each"': {
      'before all': function(t){
        calls = [];
        results = TestIt('tests', {
          'after each': function(){ throw 'out'; },
          'after all': function(){ calls.push('after all'); },
          'a test': function(){ }
        }, fakeTestItReporter);
      },
      'should be reported': function(t){
        t.assertEqual('error', results['tests']['a test']['result']);
        t.assertEqual('out', results['tests']['a test']['message']);
      },
      'should run the "after all"': function(t){
        t.assertEqual(1, calls.length);
        t.assertEqual('after all', calls[0]);
      }
    }
  });
})();

(function(){
  var results;
  TestIt('running assertions', {
    'in "before all"': {
      'before all': function(){
        results = TestIt('tests', {
          'before all': function(t){ t.assert(false); },
          'a test': function(){ }
        }, fakeTestItReporter);
      },
      'should be reported': function(t){
        t.assertEqual(1, results['tests']['before all']['assertions']['length']);
      }
    },
    'in "before each"': {
      'before all': function(){
        results = TestIt('tests', {
          'before each': function(t){ t.assert(false); },
          'a test': function(){ }
        }, fakeTestItReporter);
      },
      'should be reported': function(t){
        t.assertEqual(1, results['tests']['a test']['assertions']['length']);
      }
    },
    'in "after each"': {
      'before all': function(){
        results = TestIt('tests', {
          'after each': function(t){ t.assert(false); },
          'a test': function(){ }
        }, fakeTestItReporter);
      },
      'should be reported': function(t){
        t.assertEqual(1, results['tests']['a test']['assertions']['length']);
      }
    },
    'in "after all"': {
      'before all': function(){
        results = TestIt('tests', {
          'after all': function(t){ t.assert(false); },
          'a test': function(){ }
        }, fakeTestItReporter);
      },
      'should be reported': function(t){
        t.assertEqual(1, results['tests']['after all']['assertions']['length']);
      }
    }
  });
})();

(function(){
  var origTestItIsEqual = TestIt.isEqual;
  TestIt('assertions', {
    'assert': {
      'should not raise if passed true': function(t){
        var raised = 'did not raise';
        try {
          t.assert(true);
        } catch (e) {
          raised = 'did raise';
        }
        t.assertEqual('did not raise', raised);
      },
      'should raise if passed false': function(t){
        var raised = 'did not raise';
        try {
          t.assert(false);
        } catch (e) {
          raised = 'did raise';
        }
        t.assertEqual('did raise', raised);
      },
      'should raise with a TestIt.Assertions.Failure': function(t){
        var exception;
        try {
          t.assert(false);
        } catch (e) {
          exception = e;
        }
        t.assertEqual(TestIt.Assertions.Failure, exception.constructor);
      },
      'should raise with a default message': function(t){
        var exception;
        try {
          t.assert(false);
        } catch (e) {
          exception = e;
        }
        t.assertEqual('false is not true', exception.message);
      },
      'should raise with a message': function(t){
        var exception;
        try {
          t.assert(false, 'it should have been true');
        } catch (e) {
          exception = e;
        }
        t.assertEqual('it should have been true', exception.message);
      }
    },
    'assertEqual': {
      'after all': function(t){
        TestIt.isEqual = origTestItIsEqual;
      },
      'should check using TestIt.isEqual': function(t){
        var isEqualWasCalled = false;
        TestIt.isEqual = function(){ isEqualWasCalled = true; return true; };
        try {
          t.assertEqual();
        } catch(e) {}
        t.assert(isEqualWasCalled);
      },
      'should not raise when equal': function(t){
        var didRaise = false;
        TestIt.isEqual = function(){ return true; };
        try {
          t.assertEqual();
        } catch(e) {
          didRaise = true;
        }
        t.assert(!didRaise);
      },
      'should raise when not equal': function(t){
        var didRaise = false;
        TestIt.isEqual = function(){ return false; };
        try {
          t.assertEqual();
        } catch(e) {
          didRaise = true;
        }
        t.assert(didRaise);
      },
      'should raise with a default message': function(t){
        var defaultMessage;
        TestIt.isEqual = function(){ return false; };
        try {
          t.assertEqual(1, [3,2,1]);
        } catch (e) {
          defaultMessage = e.message;
        }
        TestIt.isEqual = origTestItIsEqual;
        t.assertEqual('expected 1 but was [3,2,1]', defaultMessage);
      }
    }
  });
})();

(function(){
  var isEqualTests = function(input){
    var tests = {};
    while(input.length >= 3){
      (function(obj1, obj2, isEqual){
        tests[TestIt.inspect(obj1)+' and '+TestIt.inspect(obj2)+' should '+(isEqual ? '' : 'not ')+'be equal'] = function(t){
          t.assertEqual(isEqual, TestIt.isEqual(obj1, obj2), null);
        };
      })(input.shift(), input.shift(), input.shift());
    }
    return tests;
  };

  var recursiveObject = {a:1};
  recursiveObject.self = recursiveObject;
  var recursiveArray = [1];
  recursiveArray.push(recursiveArray);
  TestIt('TestIt.isEqual', isEqualTests([
    // obj1, obj2, are equal?
    undefined, undefined, true,
    null, null, true,
    null, 'not null', false,
    {}, {}, true,
    {a: 1}, {b: 2}, false,
    {a: [1,2]}, {a: [1,2]}, true,
    [{a:1}], [{a:1}], true,
    recursiveObject, recursiveObject, true,
    recursiveArray, recursiveArray, true
  ]));
})();

(function(){
  var inspectTests = function(input){
    var tests = {};
    while(input.length >= 3){
      (function(){
        var subject = input.shift(),
            outcome = input.shift(),
            description = input.shift();
        tests[description+" '"+subject+"' should yield '"+outcome+"'"] = function(t){
          t.assertEqual(outcome, TestIt.inspect(subject));
        };
      })();
    }
    return tests;
  };

  var recursiveObject = {a:1};
  recursiveObject.self = recursiveObject;
  var recursiveArray = [1];
  recursiveArray.push(recursiveArray);
  TestIt('TestIt.inspect', inspectTests([
//  subject, outcome, subject description
    1, '1', 'Integer',
    '1', '"1"', 'String',
    [1,2,3], '[1,2,3]', 'Array',
    ['a','b'], '["a","b"]', 'Array of Strings',
    undefined, 'undefined', 'Undefined',
    null, 'null', 'null',
    {a:1,b:2}, '{a:1,b:2}', 'Object',
    recursiveObject, '{a:1,self:<recursive>}', 'Recursive object',
    recursiveArray, '[1,<recursive>]', 'Recursive array'
  ]));
})();

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
          counter = 0,
          start,
          isDone = function(){ return counter === 100 || (new Date()) - start > 3000; },
          steps = ['before all', 'before each', 'test', 'after each', 'after all'],
          tests = {};
      for (var i=0,n; s=steps[i]; i++){
        (function(index, step){
          tests[step] = function(t){
            calls.push(step);
            t.waitFor(function(){
              return counter++ > index*5;
            }, function(){
              calls.push(step+' callback');
            });
          }
        })(i,s);
      };
      start = new Date();
      TestIt('tests', tests, fakeTestItReporter);
      t.waitFor(isDone, function(){
        var expected = [
          'before all', 'before all callback',
          'before each', 'before each callback',
          'test', 'test callback',
          'after each', 'after each callback',
          'after all', 'after all callback'
        ];
        t.assertEqual(expected, calls);
      });
    },
    'in "before all"': {
      'should mark the context as running': function(t){
        var callbackCalled = false,
            results = TestIt('tests', {
              'before all': function(t){
                t.waitFor(function(time){ return time > 100; }, function(){
                  callbackCalled = true;
                });
              },
              'a test': function(){}
            }, fakeTestItReporter);
        t.assert(results['tests'].running);
        t.waitFor(function(time){ return callbackCalled; }, function(){
          t.assert(!results['tests'].running)
        });
      }
    }
  });
})();
