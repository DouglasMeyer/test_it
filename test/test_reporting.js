if (typeof TestIt === 'undefined'){
  TestIt = require('./../src/test_it').TestIt;
}
if (typeof MockIt === 'undefined'){
  MockIt = require('./lib/mock_it/src/mock_it').MockIt;
}
if (typeof document === 'undefined'){
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
        },
        '.reportContext': {
          'should call reportTest for every test': function(t){
            var con = TestIt.createReporter(function(){});
            var expected = [
              ['the tests: a test', { assertions: [], running: true }],
              ['the tests: another test', { assertions: [], result: 'fail' }],
              ['the tests: a context: something', { assertions: [], result: 'pass' }],
              ['the tests: yet another test', { assertions: [], running: true }]
            ];
            t.mock(con.prototype, 'reportTest', 4, function(name, testOutput){
              t.assertEqual(expected.shift(), [name, testOutput]);
            });
            var testOutput = {
              'the tests': {
                'a test': { assertions: [], running: true },
                'another test': { assertions: [], result: 'fail' },
                'a context': {
                  'something': { assertions: [], result: 'pass' }
                },
                'yet another test': { assertions: [], running: true },
              }
            };
            var instance = new con(testOutput);
            instance.reportContext(testOutput);
          }
        }
      }
    }
  }, MockIt);

})();

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
