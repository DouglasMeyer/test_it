if (typeof TestIt === 'undefined'){
  TestIt = require('../src/test_it').TestIt;
}
if (typeof MockIt === 'undefined'){
  MockIt = require('./lib/mock_it/src/mock_it').MockIt;
}
if (typeof process === 'undefined'){
  process = {};
}

var runTestsOneAtATime = (function(){
  var aTestIsRunning = false;
  return {
    'before each': function(t){
      t.waitFor(function(){ return !aTestIsRunning; }, function(){
        aTestIsRunning = true;
      });
    },
    'after each': function(t){
      aTestIsRunning = false;
    }
  };
})();

(function(){
  var createReporter = function(){
    var reporter = function(name, status, assertionCount, message){
          var args = [];
          for(var i=0,e;e=arguments[i];i++){ args.push(e); }
          reporter.calls.push(args);
        };
    reporter.calls = [];
    return reporter;
  };
  TestIt('TestIt Reporting', {
    'for standard tests': {
      'should call callback for each test with result': function(t){
        var testReporter = createReporter();
        TestIt('tests', {
          'a test': function(t){ t.assert(true); },
          'a context': {
            'failing test': function(t){ t.assert(false); }
          }
        }, testReporter);
        t.assertEqual([
          [ 'tests: a test', 'pass', 1 ],
          [ 'tests: a context: failing test', 'fail', 1, 'false is not true' ]
        ], testReporter.calls);
      }
    },
    'for tests with wait for': {
      'should call callback when test is running': function(t){
        var testReporter = createReporter(),
            aBit = function(time){ return time > 300; },
            noop = function(){};
        TestIt('tests', {
          'before all': function(t){
            t.waitFor(aBit,noop);
          },
          'a test': function(t){ t.waitFor(aBit,function(){ t.assert(true) }); },
          'a context': {
            'before all': function(t){
              t.waitFor(aBit,noop);
            },
            'failing test': function(t){ t.waitFor(aBit,function(){ t.assert(false); }); t.assert(true); }
          }
        }, testReporter);

        var expectedCalls,
            callsMet = function(time){
              return testReporter.calls.length === expectedCalls.length || time > 1000;
            };
        expectedCalls = [
          [ 'tests', 'running' ]
        ];
        t.assertEqual(expectedCalls, testReporter.calls);
        testReporter.calls = [];
        expectedCalls = [
          [ 'tests: a test', 'running' ],
          [ 'tests: a context', 'running' ]
        ];
        t.waitFor(callsMet, function(){
          t.assertEqual(expectedCalls, testReporter.calls);
          testReporter.calls = [];
          expectedCalls = [
            [ 'tests: a test', 'pass', 1 ],
            [ 'tests: a context: failing test', 'running', 1 ]
          ];
          t.waitFor(callsMet, function(){
            t.assertEqual(expectedCalls, testReporter.calls);
            testReporter.calls = [];
            expectedCalls = [
              [ 'tests: a context: failing test', 'fail', 2, 'false is not true' ],
              [ 'tests: a context', 'done' ],
              [ 'tests', 'done' ]
            ];
            t.waitFor(callsMet, function(){
              t.assertEqual(expectedCalls, testReporter.calls);
            });
          });
        });
      }
    }
  }, runTestsOneAtATime);
})();

(function(){
  var lastPuts;
  if (typeof require === 'undefined'){
    testNodeReporter = TestIt.nodeReporter;
  } else {
    require('vm').runInThisContext('var T = {}, testNodeReporter = T.nodeReporter = '+TestIt.nodeReporter.toString());
    testNodeReporter.redColor   = '\033[31m';
    testNodeReporter.resetColor = '\033[39m';
  }
  TestIt('TestIt.nodeReporter', {
    'before each': function(t){
      t.mock(testNodeReporter, 'puts', function(out){ lastPuts = out; });
      t.mock(testNodeReporter, 'exit', function(code){ });
      lastPuts = undefined;
      delete testNodeReporter.counts;
    },
    'should show one summary for all tests': function(t){
      testNodeReporter('tests: passing test', 'pass', 0);
      t.assertEqual('tests: passing test: pass (0 assertions run)', lastPuts);
      testNodeReporter('more tests: failing test', 'fail', 0, 'failure message');
      t.waitFor(function(time){ return time > 600; }, function(){
        t.assertEqual('Fail. (2 tests: 1 passed, 1 failed)', lastPuts.replace(/\033\[..m/g, ''));
      });
    },
    'should color failed tests red': function(t){
      testNodeReporter('tests: failing test', 'fail', 1, 'failure message');
      t.assertEqual('\033[31mtests: failing test: fail: failure message (1 assertion run)\033[39m', lastPuts);
      t.waitFor(function(time){ return time > 400; }, function(){
        t.assertEqual('\033[31mFail. (1 tests: 1 failed)\033[39m', lastPuts);
      });
    },
    'should color errored tests red': function(t){
      testNodeReporter('tests: erroring test', 'error', 0, 'ERR');
      t.assertEqual('\033[31mtests: erroring test: error: ERR (0 assertions run)\033[39m', lastPuts);
      t.waitFor(function(time){ return time > 400; }, function(){
        t.assertEqual('\033[31mError! (1 tests: 1 errored)\033[39m', lastPuts);
      });
    },
    'should exit with 1 if there are errors or failures': function(t){
      t.mock(testNodeReporter, 'exit', 1, function(code){
        t.assertEqual(1, code);
      });
      testNodeReporter('tests: erroring test', 'error', 0, 'ERR');
      t.waitFor(function(time){ return time > 400; }, function(){ });
    },
    'should work with tests that are running': function(t){
      testNodeReporter('running test', 'running', 1);
      t.assertEqual(undefined, lastPuts);

      testNodeReporter('running test', 'pass', 2);
      t.assertEqual('running test: pass (2 assertions run)', lastPuts.replace(/\033\[..m/g, ''));
    },
    'should handle tests running "before all"s': function(t){
      testNodeReporter('before all', 'running', 0);
      t.assertEqual(undefined, lastPuts);

      testNodeReporter('before all', 'done', 0);
      t.assertEqual(undefined, lastPuts);
    }
  }, MockIt, runTestsOneAtATime);
})();

(function(){
  if (typeof document === 'undefined'){
    document = { body: { } };
    testDomReporter = TestIt.domReporter;
  } else {
    eval('var T = {}, testDomReporter = T.domReporter = '+TestIt.domReporter.toString());
    T.waitFor = TestIt.waitFor;
  }
  var origLog, origSummary, origRunningTests, origCounts;
  TestIt('TestIt.domReporter', {
    'before each': function(t){
      delete testDomReporter.log;
      delete testDomReporter.summary;
      delete testDomReporter.runningTests;
      delete testDomReporter.counts;
    },
    'should create a log and a summary': function(t){
      var count = 0, fakeLog = {}, fakeSummary = {};
      t.mock(document, 'createElement', 3, function(tagName){
        count++;
        if (count === 1){
          t.assertEqual('ul', tagName);
          return fakeLog;
        } else if (count === 2) {
          t.assertEqual('li', tagName);
          return fakeSummary;
        } else {
          return { appendChild: function(){} }; // some element
        }
      });
      var appendCount = 0;
      t.mock(fakeLog, 'appendChild', 2, function(elem){
        appendCount++;
        if (appendCount === 1){
          t.assert(fakeSummary === elem, 'did not append summary to log');
        }
      });
      t.mock(document.body, 'appendChild', 1, function(elem){
        t.assert(fakeLog === elem, 'did not append log to body');
      });

      testDomReporter('test', 'pass', 0);

      t.assertEqual('test-it-results', fakeLog.id);
    },
    'should log test results': function(t){
      var count = 0, fakeLog = {}, resultLog = {};
      t.mock(document, 'createElement', function(tagName){
        count++;
        if (count === 1) {
          return fakeLog;
        } else if (count === 2) {
          return {}; // some element
        } else {
          t.assert('li', tagName);
          return resultLog;
        }
      });
      t.mock(document.body, 'appendChild', function(){});
      t.mock(fakeLog, 'appendChild', 3, function(){});

      testDomReporter('good test', 'pass', 0);
      t.assertEqual('pass', resultLog.className);
      t.assertEqual('good test: pass (0 assertions run)', resultLog.innerHTML);

      testDomReporter('bad test', 'fail', 1, 'failure message');
      t.assertEqual('fail', resultLog.className);
      t.assertEqual('bad test: fail: failure message (1 assertion run)', resultLog.innerHTML);
    },
    'should update the summary': function(t){
      var elementCount = 0, fakeSummary = {};
      t.mock(document, 'createElement', function(){
        elementCount++;
        if (elementCount === 2) {
          return fakeSummary
        } else {
          return { appendChild: function(){} }; // some element
        }
      });
      t.mock(document.body, 'appendChild', function(){});

      testDomReporter('good test', 'pass', 0);
      t.assertEqual('summary pass', fakeSummary.className);
      t.assertEqual('Pass. <small>(1 test: 1 passed)</small>', fakeSummary.innerHTML);

      testDomReporter('bad test', 'fail', 0);
      t.assertEqual('summary fail', fakeSummary.className);
      t.assertEqual('Fail. <small>(2 tests: 1 passed, 1 failed)</small>', fakeSummary.innerHTML);
    },
    'should handle tests that are still running': function(t){
      var count = 0, fakeSummary = {}, resultLog = {};
      t.mock(document, 'createElement', function(tagName){
        count++;
        if (count === 2) {
          return fakeSummary;
        } else if (count === 3) {
          return resultLog;
        } else {
          return { appendChild: function(){} }; // some element
        }
      });
      t.mock(document.body, 'appendChild', function(){});

      testDomReporter('running test', 'running', 1);
      t.assertEqual('running', resultLog.className);
      t.assertEqual('running test: running (1 assertion run)', resultLog.innerHTML);
      t.assertEqual('summary running', fakeSummary.className);
      t.assertEqual('Running... <small>(1 test: 1 running)</small>', fakeSummary.innerHTML);

      testDomReporter('running test', 'pass', 2);
      t.assertEqual('pass', resultLog.className);
      t.assertEqual('running test: pass (2 assertions run)', resultLog.innerHTML);
      t.assertEqual('summary pass', fakeSummary.className);
      t.assertEqual('Pass. <small>(1 test: 1 passed)</small>', fakeSummary.innerHTML);
    },
    'should handle tests running "before all"s': function(t){
      var count = 0, fakeLog = {}, fakeSummary = {}, beforeAllLog = {};
      t.mock(document, 'createElement', function(tagName){
        count++;
        if (count === 1) {
          return fakeLog;
        } else if (count === 2) {
          return fakeSummary;
        } else if (count === 3) {
          return beforeAllLog;
        } else {
          return { appendChild: function(){} }; // some element
        }
      });
      t.mock(document.body, 'appendChild', function(){});
      t.mock(fakeLog, 'appendChild', function(e){});
      t.mock(fakeLog, 'removeChild', 1, function(e){
        t.assert(beforeAllLog === e, 'log did not remove before all log');
      });

      testDomReporter('before all', 'running', 0);
      t.assertEqual('running', beforeAllLog.className);
      t.assertEqual('before all: running (0 assertions run)', beforeAllLog.innerHTML);
      t.assertEqual('summary running', fakeSummary.className);
      t.assertEqual('Running... <small>(1 test: 1 running)</small>', fakeSummary.innerHTML);

      testDomReporter('before all', 'done', 0);
      t.assertEqual('summary pass', fakeSummary.className);
      t.assertEqual('Pass. <small>(0 tests: )</small>', fakeSummary.innerHTML);
    }
  }, MockIt, runTestsOneAtATime);
})();
