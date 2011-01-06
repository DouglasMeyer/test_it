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
  var count=0;
  TestIt('reporting', {
    'before all': function(){
      TestIt('tests', {
        '1 test': function(t){ t.assert(true); },
        '2 test': function(t){ t.assert(false, 'fail message'); },
        '3 test': function(t){ throw 'out'; }
      }, fakeTestItReporter);
    },
    'should report passing tests': function(t){
      t.assertEqual('tests: 1 test: pass (1 assertion run)', log[0]['innerHTML']);
      t.assertEqual('pass', log[0]['className']);
    },
    'should report failing tests': function(t){
      t.assertEqual('tests: 2 test: fail: fail message (1 assertion run)', log[1]['innerHTML']);
      t.assertEqual('fail', log[1]['className']);
    },
    'should report erroring tests': function(t){
      t.assertEqual('tests: 3 test: error: out (0 assertions run)', log[2]['innerHTML']);
      t.assertEqual('error', log[2]['className']);
    }
  });
})();

(function(){
  TestIt('TestIt.NodeReporter', {
    'should show one summary for all tests': function(t){
      var lastPuts,
          NodeReporter2 = function(results){
            this.constructor.displaySummary(this.reportContext(results));
          },
          origTestItNodeReporterPuts = TestIt.NodeReporter.puts;
      TestIt.NodeReporter.puts = function(){};
      NodeReporter2.prototype = new TestIt.NodeReporter({});
      TestIt.NodeReporter.puts = origTestItNodeReporterPuts;
      NodeReporter2.prototype.constructor = NodeReporter2;
      for(var name in TestIt.NodeReporter){
        NodeReporter2[name] = TestIt.NodeReporter[name];
      }
      NodeReporter2.puts = function(output){ lastPuts = output; };
      NodeReporter2.testResults = [];
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
      t.waitFor(function(t){ return t > 400; }, function(){
        t.assertEqual('Fail. (2 tests: 1 passed, 1 failed)', lastPuts);
      });
    }
  }, MockIt);
})();
