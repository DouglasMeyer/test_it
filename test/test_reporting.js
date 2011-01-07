var TestIt, MockIt;
if (typeof TestIt === 'undefined'){
  TestIt = require('./../src/test_it').TestIt;
  MockIt = require('./lib/mock_it/src/mock_it').MockIt;
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
  TestIt('TestIt.createReporter', {
    'should return a constructor': function(t){
      var con = TestIt.createReporter(function(){});
      t.assertEqual('function', typeof con);
      var x = new con({});
      t.assert(x instanceof con);
    },
    'constructor': {
      'should have [] assigned to testOutputs': function(t){
        var con = TestIt.createReporter(function(){});
        t.assertEqual([], con.testOutputs);
      },
      '.countWithResult': {
        'should return the number of tests with a specific result': function(t){
          var con = TestIt.createReporter(function(){});
          con.testOutputs = [{
            'the tests': {
              'a test': { assertions: [], result: 'pass' },
              'another test': { assertions: [], result: 'fail' },
              'a context': {
                'something': { assertions: [], result: 'pass' }
              },
              'yet another test': { assertions: [], result: 'error' },
            }
          }];
          t.assertEqual(2, con.countWithResult('pass'));
        },
        'should be able to count the number of running tests/contexts': function(t){
          var con = TestIt.createReporter(function(){});
          con.testOutputs = [{
            'the tests': {
              'a test': { assertions: [], running: true },
              'another test': { assertions: [], result: 'fail' },
              'a context': {
                running: true
              },
              'yet another test': { assertions: [], running: true },
            }
          }];
          t.assertEqual(3, con.countWithResult('running'));
        }
      },
      'instance': {
        'should append testOutput to constructor.testOutputs': function(t){
          var con = TestIt.createReporter(function(){}),
              testOutput = { results: true };
          new con(testOutput);
          t.assertEqual([testOutput], con.testOutputs);
        }
      }
    }
  });

})();

//(function(){
//  var count=0;
//  TestIt('reporting', {
//    'before all': function(){
//      TestIt('tests', {
//        '1 test': function(t){ t.assert(true); },
//        '2 test': function(t){ t.assert(false, 'fail message'); },
//        '3 test': function(t){ throw 'out'; }
//      }, fakeTestItReporter);
//    },
//    'should report passing tests': function(t){
//      t.assertEqual('tests: 1 test: pass (1 assertion run)', log[0]['innerHTML']);
//      t.assertEqual('pass', log[0]['className']);
//    },
//    'should report failing tests': function(t){
//      t.assertEqual('tests: 2 test: fail: fail message (1 assertion run)', log[1]['innerHTML']);
//      t.assertEqual('fail', log[1]['className']);
//    },
//    'should report erroring tests': function(t){
//      t.assertEqual('tests: 3 test: error: out (0 assertions run)', log[2]['innerHTML']);
//      t.assertEqual('error', log[2]['className']);
//    }
//  });
//})();

(function(){
  TestIt('TestIt.NodeReporter', {
    'should show one summary for all tests': function(t){
      var lastPuts,
          NodeReporter2 = function(testOutput){
            this.constructor.testOutputs.push(testOutput);
            this.reportContext(testOutput);
            this.constructor.displaySummary();
          };
      (function(origPuts, origDisplaySummary){
        TestIt.NodeReporter.puts = function(){};
        TestIt.NodeReporter.displaySummary = function(){};
        NodeReporter2.prototype = new TestIt.NodeReporter({});
        TestIt.NodeReporter.puts = origPuts;
        TestIt.NodeReporter.displaySummary = origDisplaySummary;
      })(TestIt.NodeReporter.puts, TestIt.NodeReporter.displaySummary);
      NodeReporter2.prototype.constructor = NodeReporter2;
      for(var name in TestIt.NodeReporter){
        NodeReporter2[name] = TestIt.NodeReporter[name];
      }
      NodeReporter2.puts = function(output){ lastPuts = output; };
      NodeReporter2.testOutputs = [];
      delete NodeReporter2.interval;
      new NodeReporter2({
        'tests': {
          'passing test': { assertions: [], result: 'pass' }
        }
      });
      t.assertEqual('tests: passing test: pass (0 assertions run)', lastPuts);
      new NodeReporter2({
        'more tests': {
          'failing test': { assertions: [], result: 'fail' }
        }
      });
      t.waitFor(function(time){ return time > 400; }, function(){
        t.assertEqual('Fail. (2 tests: 1 passed, 1 failed)', lastPuts);
      });
    }
  }, MockIt);
})();
