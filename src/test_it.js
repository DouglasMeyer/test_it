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
      results.running = true;
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
      delete results.running;
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
    this.length++;
    if (!assertion) {
      if (message === undefined) { message = assertion+" is not true"; }
      throw new T.Assertions.Failure(message);
    }
  };
  T.Assertions.prototype.assertEqual = function(expected, actual, message){
    this.length++;
    if (!T.isEqual(expected, actual)) {
      if (message === undefined) { message = "expected "+T.inspect(expected)+" but was "+T.inspect(actual); }
      throw new T.Assertions.Failure(message);
    }
  };
  T.Assertions.Failure = function(message){ this.message = message; };

// Reporting
  var countWithResult = function(result, context){
    var count = 0;
    if (context === undefined) {
      for(var i=0,testOutput;testOutput=this.testOutputs[i];i++){
        count += this.countWithResult(result, testOutput);
      }
    } else {
      for(var name in context){
        if(result === 'running' && context[name].running){
          count++;
        } else {
          if(context[name].result !== undefined) {
            if(context[name].result === result){ count++; }
          } else {
            count += this.countWithResult(result, context[name]);
          }
        }
      }
    }
    return count;
  };
  var reportContext = function(testOutput, contextName){
    contextName = contextName || '';
    for(var name in testOutput){
      if(testOutput[name].assertions){
        this.reportTest(contextName+name, testOutput[name]);
      }else{
        this.reportContext(testOutput[name], contextName+name+': ');
      }
    }
  };
  T.createReporter = function(initialize){
    var constructor = function(testOutput){
      constructor.testOutputs.push(testOutput);
      initialize.apply(this, arguments);
    };
    constructor.testOutputs = [];
    constructor.countWithResult = countWithResult;
    constructor.prototype.reportContext = reportContext;
    return constructor;
  };

// T.NodeReporter
  T.NodeReporter = T.createReporter(function(testOutput){
    this.constructor.puts = this.constructor.puts || require('sys').puts;
    this.reportContext(testOutput);
    this.constructor.displaySummary();
    this.constructor.exit = process.exit;
  });
  T.NodeReporter.color_red   = '\033[31m';
  T.NodeReporter.reset_color = '\033[39m';
  T.NodeReporter.displaySummary = function(){
    var constructor=this;
    if (constructor.interval){ return; }
    constructor.interval = setInterval(function(){
      if (constructor.countWithResult('running') !== 0) { return; }
      clearInterval(constructor.interval);
      delete constructor.interval;
      var passCount = constructor.countWithResult('pass'),
          failCount = constructor.countWithResult('fail'),
          errorCount = constructor.countWithResult('error');
      var output, prefix = '', suffix = '';
      if (errorCount){
        prefix = constructor.color_red;
        suffix = constructor.reset_color;
        output = 'Error! ';
      } else if (failCount){
        prefix = constructor.color_red;
        suffix = constructor.reset_color;
        output = 'Fail. ';
      } else {
        output = 'Pass. ';
      }
      output += '('+(passCount+failCount+errorCount)+' tests: ';
      var details = [];
      if (passCount) { details.push(passCount+' passed'); }
      if (failCount) { details.push(failCount+' failed'); }
      if (errorCount) { details.push(errorCount+' errored'); }
      constructor.puts(prefix + output + details.join(', ') + ')' + suffix);
      constructor.exit((failCount + errorCount) === 0 ? 0 : 1)
    }, 200);
  };
  T.NodeReporter.prototype.reportTest = function(name, testOutput){
    var constructor = this.constructor;
    T.waitFor(function(){ return testOutput.running !== true; }, function(){
      var output = name+': '+testOutput.result,
          prefix = '',
          suffix = '';
      if (testOutput.result !== 'pass'){
        prefix = constructor.color_red;
        suffix = constructor.reset_color;
        if (testOutput.message) {
          output += ': '+testOutput.message;
        }
      }
      output += ' ('+testOutput.assertions.length+' assertion'+(testOutput.assertions.length === 1 ? '' : 's')+' run)';
      constructor.puts(prefix+output+suffix);
    });
  };

// DomReporter
  T.DomReporter = T.createReporter(function(testOutput){
    var constructor = this.constructor;
    if (!constructor.log){
      var log = constructor.log = document.createElement('ul');
      log.id = constructor.elementId;
      T.waitFor(function(){ return document.body; }, function(){
        document.body.appendChild(log);
      });
      constructor.summary = document.createElement('li');
      log.appendChild(constructor.summary);
      constructor.showPassing = false;
      constructor.summary.onclick = function(){
        constructor.showPassing = !constructor.showPassing;
        log.className = constructor.showPassing ? 'show-passing' : '';
      };
    }
    constructor.summary.className = 'summary running';
    constructor.summary.innerHTML = "Running...";
    this.reportContext(testOutput);
    this.constructor.displaySummary();
  });
  T.DomReporter.elementId = 'test-it-results';
  T.DomReporter.displaySummary = function(){
    var constructor = this,
        log = constructor.log,
        summary = constructor.summary,
        runningCount, passCount, failCount, errorCount;
    var updateSummary = function(){
      runningCount = constructor.countWithResult('running');
      passCount = constructor.countWithResult('pass');
      failCount = constructor.countWithResult('fail');
      errorCount = constructor.countWithResult('error');
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
    };
    T.waitFor(function(){
      updateSummary();
      return runningCount === 0;
    }, function(){
      if (errorCount) {
        summary.className = 'summary error';
      } else if (failCount) {
        summary.className = 'summary fail';
      } else {
        summary.className = 'summary pass';
      }
    });
  };
  T.DomReporter.prototype.reportTest = function(name, testOutput){
    var constructor = this.constructor,
        li = document.createElement('li'),
        html = name+': ';
    li.innerHTML = html + 'running...';
    li.className = 'running';
    constructor.log.appendChild(li);
    T.waitFor(function(){ return testOutput.running !== true; }, function(){
      html += testOutput.result;
      if (testOutput.result !== 'pass' && testOutput.message) {
        html += ': '+testOutput.message;
      }
      html += ' ('+testOutput.assertions.length+' assertion'+(testOutput.assertions.length === 1 ? '' : 's')+' run)';
      li.innerHTML = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      li.className = testOutput.result;
    });
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
    stack = stack || [];
    if (indexOf(stack, subject) !== -1){
      return '<recursive>';
    }
    switch(typeof(subject)){
    case 'undefined': return 'undefined';
    case 'string':    return '"'+subject+'"';
    case 'object':
      if (subject === null) {
        return 'null';
      } else if (subject.constructor === Array) {
        var output='[', first=true;
        for(var e in subject){
          if (!first){ output += ','; }
          var newStack = stack.concat();
          newStack.push(subject);
          output += T.inspect(subject[e], newStack);
          first = false;
        }
        return output+']';
      }
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
