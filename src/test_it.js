(function(global){

  var T = global.TestIt = function(contextName, tests){
    var options = Array.prototype.slice.call(arguments, 2);
    var reporter = T.Reporter;
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

// Reporter
  T.Reporter = function(results){
    if (!T.Reporter.log){
      var log = T.Reporter.log = document.createElement('ul');
      log.id = T.Reporter.elementId;
      T.waitFor(function(){ return document.body; }, function(){
        document.body.appendChild(log);
      });
      T.Reporter.summary = document.createElement('li');
      log.appendChild(T.Reporter.summary);
      T.Reporter.showPassing = false;
      T.Reporter.summary.onclick = function(){
        T.Reporter.showPassing = !T.Reporter.showPassing;
        log.className = T.Reporter.showPassing ? 'show-passing' : '';
      };
    }
    var log = T.Reporter.log,
        summary = T.Reporter.summary;
    summary.className = 'summary running';
    summary.innerHTML = "Running...";
    this.reportContext(results);
    var runningCount, passCount, failCount, errorCount;
    var updateSummary = function(){
      runningCount = T.Reporter.countWithResult('running');
      passCount = T.Reporter.countWithResult('pass');
      failCount = T.Reporter.countWithResult('fail');
      errorCount = T.Reporter.countWithResult('error');
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
  T.Reporter.countWithResult = function(result){
    var count = 0, tests = T.Reporter.log.getElementsByTagName('li');
    for (var i=1,e;e=tests[i];i++){
      if (e.className === result) { count++; }
    }
    return count;
  };
  T.Reporter.elementId = 'test-it-results';
  T.Reporter.prototype.reportContext = function(results, contextName){
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
          T.waitFor(function(){ return result.running === false; }, function(){
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

})(window);
