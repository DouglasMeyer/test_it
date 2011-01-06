(function(global){

  var T = global.TestIt = function(contextName, tests){
    var options = Array.prototype.slice.call(arguments, 2);
    var reporter = typeof window === 'undefined' ? T.NodeReporter : T.DomReporter;
    if (options.length > 0 && options[options.length-1].constructor === Function){
      reporter = options.pop();
    }
    var extension;
    while(extension = options.pop()){
      tests = { '': tests };
      for (var name in extension){
        tests[name] = extension[name];
      }
    }
    var results = {};
    results[contextName] = new T.Context(tests);
    new reporter(results);
    return results;
  };

  var reportException = function(result, exception){
    if (exception.constructor === T.Assertions.Failure) {
      result.result = 'fail';
      result.message = exception.message;
    } else {
      result.result = 'error';
      result.message = exception;
    }
  };
  T.Context = function(tests, contextBefore, contextAfter){
    var results = {}, assertions;
    var before = (contextBefore || []).concat();
    var after  = (contextAfter  || []).concat();
    var beforeAll  = tests['before all'] || function(){},
        afterAll   = tests['after all' ] || function(){};
    if (tests['before each']) { before.push(  tests['before each']); }
    if (tests['after each' ]) { after.unshift(tests['after each' ]); }
    delete(tests['before all' ]);
    delete(tests['before each']);
    delete(tests['after each' ]);
    delete(tests['after all'  ]);
    try {
      results['before all'] = { };
      assertions = new T.Assertions(results['before all']);
      beforeAll(assertions);
      delete results['before all'];
    } catch (e) {
      results['before all'].assertions = assertions;
      reportException(results['before all'], e);
      afterAll && afterAll(assertions);
      return results;
    }
    T.waitFor(function(){
      return assertions === undefined || assertions.waitForCount === 0;
    }, function(){
      for(var testName in tests){
        var test = tests[testName];
        if (typeof(test) === 'function') {
          results[testName] = new T.Runner(before, test, after);
        } else {
          var result = new T.Context(test, before, after);
          if (testName === '') {
            results = result;
          } else {
            results[testName] = result;
          }
        }
      }
      T.waitFor(function(){
        for(var name in results){
          if (results[name].running === true){ return false; }
        }
        return true;
      }, function(){
        try {
          results['after all'] = { };
          assertions = new T.Assertions(results['after all']);
          afterAll(assertions);
          delete results['after all'];
        } catch (e) {
          results['after all'].assertions = assertions;
          reportException(results['after all'], e);
        }
      });
    });
    return results;
  };

// Runner
  T.Runner = function(before, test, after){
    var runner = this;
    this.running = true;
    this.assertions = new T.Assertions(this);
    try {
      for(var i=0,b;b=before[i];i++){ b(this.assertions); }
    } catch (e) {
      reportException(this, e);
    }
    T.waitFor(function(){ return runner.assertions.waitForCount === 0; }, function(){
      if (runner.result === undefined) {
        try {
          test(runner.assertions);
        } catch (e) {
          reportException(runner, e);
        }
      }
      T.waitFor(function(){ return runner.assertions.waitForCount === 0; }, function(){
        for(var i=0,a;a=after[i];i++){
          try {
            a(runner.assertions);
          } catch (e) {
            if (runner.result === undefined) {
              reportException(runner, e);
            }
          }
        }
        T.waitFor(function(){ return runner.assertions.waitForCount === 0; }, function(){
          if (runner.result === undefined) {
            runner.result = 'pass';
          }
          runner.running = false;
        });
      });
    });
  };

// Assertions
  T.Assertions = function(result){
    this.result = result;
    this.length = 0;
    this.waitForCount = 0;
  };
  T.Assertions.prototype.waitFor = function(condition, callback){
    var assertion = this;
    this.waitForCount += 1;
    T.waitFor(condition, function(){
      try {
        callback();
      } catch(e) {
        reportException(assertion.result, e);
      }
      assertion.waitForCount -= 1;
    });
  };
  T.Assertions.prototype.assert = function(assertion, message){
    this.length = this.length + 1;
    if (!assertion) {
      if (message === undefined) { message = assertion+" is not true"; }
      throw new T.Assertions.Failure(message);
    }
  };
  T.Assertions.prototype.assertEqual = function(expected, actual, message){
    this.length = this.length + 1;
    if (!T.isEqual(expected, actual)) {
      if (message === undefined) { message = "expected "+T.inspect(expected)+" but was "+T.inspect(actual); }
      throw new T.Assertions.Failure(message);
    }
  };
  T.Assertions.Failure = function(message){ this.message = message; };

// NodeReporter
  T.NodeReporter = function(results){
    var class = this.constructor;
    class.puts = class.puts || require('sys').puts;
    class.displaySummary(this.reportContext(results));
  };
  T.NodeReporter.testResults = [];
  T.NodeReporter.displaySummary = function(results){
    if (T.isEqual(results, {})){ return; }
    var class=this;
    class.testResults.push(results);
    if (class.interval){ return; }
    class.interval = setInterval(function(){
      if (class.countWithResult('running') !== 0) { return; }
      clearInterval(class.interval);
      delete class.interval;
      var passCount = class.countWithResult('pass'),
          failCount = class.countWithResult('fail'),
          errorCount = class.countWithResult('error');
      var output;
      if (errorCount){
        output = 'Error! ';
      } else if (failCount){
        output = 'Fail. ';
      } else {
        output = 'Pass. ';
      }
      output += '('+(passCount+failCount+errorCount)+' tests: ';
      var details = [];
      if (passCount) { details.push(passCount+' passed'); }
      if (failCount) { details.push(failCount+' failed'); }
      if (errorCount) { details.push(errorCount+' errored'); }
      class.puts(output + details.join(', ') + ')');
    }, 200);
  };
  T.NodeReporter.countWithResult = function(result){
    var count = 0;
    for(var i=0,results;results=this.testResults[i];i++){
      count += this.countContextWithResult(results, result);
    }
    return count;
  };
  T.NodeReporter.countContextWithResult = function(results, result){
    var count = 0;
    for(var name in results) {
      if (results[name].constructor === String) {
        if (results[name] === result){ count++; }
      } else {
        count += this.countContextWithResult(results[name], result);
      }
    }
    return count;
  };
  T.NodeReporter.prototype.reportContext = function(results, contextName){
    contextName = contextName || '';
    var class = this.constructor,
        testResults = {};
    for(var name in results){
      if(results[name].assertions) {
        (function(){
          var result = results[name];
          testResults[name] = 'running';
          T.waitFor(function(){ return result.running !== true; }, function(){
            testResults[name] = result.result;
            var output = contextName+name+': '+result.result;
            if (result.result !== 'pass' && result.message) {
              output += ': '+result.message;
            }
            output += ' ('+result.assertions.length+' assertion'+(result.assertions.length === 1 ? '' : 's')+' run)';
            class.puts(output);
          });
        })();
      } else {
        testResults[name] = this.reportContext(results[name], contextName+name+': ');
      }
    }
    return testResults;
  };

// DomReporter
  T.DomReporter = function(results){
    var klass = this.constructor;
    if (!klass.log){
      var log = klass.log = document.createElement('ul');
      log.id = klass.elementId;
      T.waitFor(function(){ return document.body; }, function(){
        document.body.appendChild(log);
      });
      klass.summary = document.createElement('li');
      log.appendChild(klass.summary);
      klass.showPassing = false;
      klass.summary.onclick = function(){
        klass.showPassing = !klass.showPassing;
        log.className = klass.showPassing ? 'show-passing' : '';
      };
    }
    var log = klass.log,
        summary = klass.summary;
    summary.className = 'summary running';
    summary.innerHTML = "Running...";
    this.reportContext(results);
    var runningCount, passCount, failCount, errorCount;
    var updateSummary = function(){
      runningCount = klass.countWithResult('running');
      passCount = klass.countWithResult('pass');
      failCount = klass.countWithResult('fail');
      errorCount = klass.countWithResult('error');
      var html;
      if (runningCount === 0){
        if (errorCount){
          html = 'Error! ';
        } else if (failCount){
          html = 'Fail. ';
        } else {
          html = 'Pass. ';
        }
      } else {
        html = 'Running... ';
      }
      html += '<small>('+(runningCount+passCount+failCount+errorCount)+" tests: ";
      var details = [];
      if (runningCount) { details.push(runningCount+' running'); }
      if (passCount) { details.push(passCount+' passed'); }
      if (failCount) { details.push(failCount+' failed'); }
      if (errorCount) { details.push(errorCount+' errored'); }
      html += details.join(', ');
      summary.innerHTML = html+')</small>';
      return runningCount === 0;
    };
    T.waitFor(function(){
      return updateSummary();
    }, function(){
      updateSummary();
      if (errorCount) {
        summary.className = 'summary error';
      } else if (failCount) {
        summary.className = 'summary fail';
      } else {
        summary.className = 'summary pass';
      }
    });
  };
  T.DomReporter.countWithResult = function(result){
    var count = 0, tests = this.log.getElementsByTagName('li');
    for (var i=1,e;e=tests[i];i++){
      if (e.className === result) { count++; }
    }
    return count;
  };
  T.DomReporter.elementId = 'test-it-results';
  T.DomReporter.prototype.reportContext = function(results, contextName){
    contextName = contextName || '';
    var reporter = this;
    for(var name in results){
      if(results[name].assertions) {
        (function(){
          var result = results[name],
              li = document.createElement('li'),
              html = contextName+name+': ';
          li.innerHTML = html + 'running...';
          li.className = 'running';
          reporter.constructor.log.appendChild(li);
          T.waitFor(function(){ return result.running !== true; }, function(){
            html += result.result;
            if (result.result !== 'pass' && result.message) {
              html += ': '+result.message;
            }
            html += ' ('+result.assertions.length+' assertion'+(result.assertions.length === 1 ? '' : 's')+' run)';
            li.innerHTML = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            li.className = result.result;
          });
        })();
      } else {
        this.reportContext(results[name], contextName+name+': ');
      }
    }
  };

// Helpers
  var indexOf = function(array, el){
    for(var i=0,e;e=array[i];i++){
      if (e === el){ return i; }
    }
    return -1;
  };
  T.isEqual = function(expected, actual){
    return T.inspect(expected) === T.inspect(actual);
  };
  T.inspect = function(subject, stack){
    if (subject === undefined) { return 'undefined'; }
    if (subject === null) { return 'null'; }
    stack = stack || [];
    if (indexOf(stack, subject) !== -1){
      return '<recursive>';
    }
    switch(subject.constructor){
    case String: return '"'+subject+'"';
    case Array:
      var output='[', first=true;
      for(var e in subject){
        if (!first){ output += ','; }
        var newStack = stack.concat();
        newStack.push(subject);
        output += T.inspect(subject[e], newStack);
        first = false;
      }
      return output+']';
    case Object:
      var output = '{', first=true;
      for(var e in subject){
        if (!first){ output += ','; }
        var newStack = stack.concat();
        newStack.push(subject);
        output += e+':'+T.inspect(subject[e], newStack);
        first = false;
      }
      return output+'}';
    }
    return subject.toString();
  };
  T.waitFor = function(condition, callback){
    var startTime = new Date();
    if (condition((new Date()) - startTime)){
      callback();
    } else {
      var interval = setInterval(function(){
        if (condition((new Date()) - startTime)){
          clearInterval(interval);
          callback();
        }
      }, 100);
    }
  };

})(typeof window === 'undefined' ? exports : window);
