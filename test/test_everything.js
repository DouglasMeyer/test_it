if (typeof TestIt === 'undefined'){
  TestIt = require('./../src/test_it');
}

var testReporter = function(name, result, assertionCount, message){ };

(function(){
  var calls;

  TestIt('before/after tests and contexts', {
    'before all': function(t){
      calls = [];
      TestIt('the tests', {
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
      }, testReporter);
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
    }
  });
})();

(function(){
  var calls;
  TestIt('exceptions', {
    'in "before all"': {
      'before all': function(t){
        calls = [];
        TestIt('tests', {
          'before all': function(){ throw 'out'; },
          'after all': function(){ calls.push('after all'); },
          'a test': function(){ calls.push('a test'); }
        }, testReporter);
      },
      'should run the "after all"': function(t){
        t.assertEqual(['after all'], calls);
      },
      'should not run test': function(t){
        t.assertEqual(1, calls.length);
        t.assert(calls[0] !== 'a test');
      }
    },
    'in "before each"': {
      'before all': function(t){
        calls = [];
        TestIt('tests', {
          'before each': function(){ throw 'out'; },
          'after each': function(){ calls.push('after each'); },
          'after all': function(){ calls.push('after all'); },
          'a test': function(){ calls.push('a test'); }
        }, testReporter);
      },
      'should run the "after each"': function(t){
        t.assertEqual(['after each', 'after all'], calls);
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
        TestIt('tests', {
          'after each': function(){ throw 'out'; },
          'after all': function(){ calls.push('after all'); },
          'a test': function(){ }
        }, testReporter);
      },
      'should run the "after all"': function(t){
        t.assertEqual(1, calls.length);
        t.assertEqual('after all', calls[0]);
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
        var isEqualWasCalled = false,
            assertions = new TestIt.Assertions({});
        TestIt.isEqual = function(){ isEqualWasCalled = true; return true; };
        try {
          assertions.assertEqual();
        } catch(e) {}
        t.assert(isEqualWasCalled);
      },
      'should not raise when equal': function(t){
        var didRaise = false,
            assertions = new TestIt.Assertions({});
        TestIt.isEqual = function(){ return true; };
        try {
          assertions.assertEqual();
        } catch(e) {
          didRaise = true;
        }
        t.assert(!didRaise);
      },
      'should raise when not equal': function(t){
        var didRaise = false,
            assertions = new TestIt.Assertions({});
        TestIt.isEqual = function(){ return false; };
        try {
          assertions.assertEqual();
        } catch(e) {
          didRaise = true;
        }
        t.assert(didRaise);
      },
      'should raise with a default message': function(t){
        var assertions = new TestIt.Assertions({}),
            defaultMessage;
        TestIt.isEqual = function(){ return false; };
        try {
          assertions.assertEqual(1, [3,2,1]);
        } catch (e) {
          defaultMessage = e.message;
        }
        TestIt.isEqual = origTestItIsEqual;
        t.assertEqual('expected 1 but was [3,2,1]', defaultMessage);
      }
    }
  });
})();
