if (typeof TestIt === 'undefined'){
  TestIt = require('./../src/test_it').TestIt;
}

(function(){
  var calls = [],
      reports = [],
      testReporter = function(){
        var args = [];
        for(var i=0,e;e=arguments[i];i++){ args.push(e); }
        reports.push(args);
      };

  TestIt('extensions', {
    'the calls': {
      'before all': function(t){
        var extension1 = {
          'before all': function(){ calls.push('x1 before all'); },
          'before each': function(){ calls.push('x1 before each'); },
          'after all': function(){ calls.push('x1 after all'); },
          'after each': function(){ calls.push('x1 after each'); }
        };
        var extension2 = {
          'before all': function(){ calls.push('x2 before all'); },
          'before each': function(){ calls.push('x2 before each'); },
          'after all': function(){ calls.push('x2 after all'); },
          'after each': function(){ calls.push('x2 after each'); }
        };
        TestIt('testing', {
          'before all': function(){ calls.push('before all'); },
          'before each': function(){ calls.push('before each'); },
          'after all': function(){ calls.push('after all'); },
          'after each': function(){ calls.push('after each'); },
          'test something': function(){ calls.push('test something'); },
          'test something else': function(){ calls.push('test something else'); }
        }, extension1, extension2, testReporter);
      },
      'should include before/after all/each': function(t){
        var expected = [
          'x1 before all',
          'x2 before all',
          'before all',

            'x1 before each',
            'x2 before each',
            'before each',
            'test something',
            'after each',
            'x2 after each',
            'x1 after each',

            'x1 before each',
            'x2 before each',
            'before each',
            'test something else',
            'after each',
            'x2 after each',
            'x1 after each',

          'after all',
          'x2 after all',
          'x1 after all'
        ];
        t.assertEqual(expected, calls);
      },
      'should not change reporting': function(t){
        t.assertEqual([
          [['testing', 'test something'], 'pass'],
          [['testing', 'test something else'], 'pass']
        ], reports);
      }
    },
    'with waitFor': {
      'before all': function(t){
        reports = [];
        var extension = {
          'before all': function(t){
            t.waitFor(function(time){ return time > 500; }, function(){})
          }
        };
        TestIt('testing', {
          'a test': function(t){ }
        }, extension, testReporter);
      },
      'should still report': function(t){
        t.waitFor(function(time){ return time > 900; }, function(){
          t.assertEqual([
            [['testing'], 'running'],
            [['testing', 'a test'], 'pass'],
            [['testing'], 'done']
          ], reports);
        });
      }
    }
  });
})();
