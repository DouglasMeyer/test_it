(function(){

  var T = function(contextName, tests){
    var options = Array.prototype.slice.call(arguments, 2);
    var callback = typeof window === 'undefined' ? T.nodeReporter : T.domReporter;
    if (options.length > 0 && options[options.length-1].constructor === Function){
      callback = options.pop();
    }
    var extension;
    while(extension = options.pop()){
      tests = { '': tests };
      for (var name in extension){
        tests[name] = extension[name];
      }
    }
    T.Context([contextName], tests, [], [], callback);
  };

  var reportException = function(name, callback, assertionCount, exception){
    if (exception.constructor === T.Assertions.Failure) {
      callback(name, 'fail', assertionCount, exception.message);
    } else {
      callback(name, 'error', assertionCount, exception);
    }
  };
  T.Context = function(contextName, tests, contextBefore, contextAfter, callback){
    var assertions;
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
      assertions = new T.Assertions({ name: contextName.concat('before all'), callback: callback });
      beforeAll(assertions);
    } catch (e) {
      reportException(contextName.concat('before all'), callback, assertions.length, e);
      afterAll && afterAll(assertions);
      return;
    }
    var noWait = function(){ return assertions === undefined || assertions.waitForCount === 0; },
        didWait = false;
    if (!noWait()){
      didWait = true;
      callback(contextName, 'running');
    }
    T.waitFor(noWait, function(){
      var originalCallback = callback,
          runningChildren = [],
          observeChildren = function(name, status){
            var index = indexOf(runningChildren, name);
            if (status === 'running' && index === -1){
              runningChildren.push(name);
            } else if (status !== 'running' && index !== -1){
              runningChildren.splice(index, 1);
            }
            originalCallback.apply(null, arguments);
          };
      for(var testName in tests){
        var test = tests[testName];
        if (typeof(test) === 'function') {
          new T.Runner(contextName.concat(testName), before, test, after, observeChildren);
        } else {
          var newContextName = contextName;
          if (testName !== '') {
            newContextName = newContextName.concat(testName);
          }
          T.Context(newContextName, test, before, after, observeChildren);
        }
      }
      T.waitFor(function(){
        return runningChildren.length === 0;
      }, function(){
        try {
          assertions = new T.Assertions({ name: contextName.concat('after all'), callback: callback });
          afterAll(assertions);
        } catch (e) {
          reportException(contextName.concat('after all'), callback, assertions.length, e);
        }
        if (!noWait()){
          didWait = true;
          callback(contextName, 'running');
        }
        T.waitFor(noWait, function(){
          if (didWait) {
            callback(contextName, 'done');
          }
        });
      });
    });
  };

// Runner
  T.Runner = function(testName, beforeCalls, test, afterCalls, callback){
    var runner = this;
    runner.name = testName;
    runner.callback = callback;
    runner.assertions = new T.Assertions(this);
    runner.passing = true;
    var noWait = function(){ return runner.assertions.waitForCount === 0; };
    try {
      for(var i=0;beforeCalls[i];i++){
        var beforeCall = beforeCalls[i];
        T.waitFor(noWait, function(){
          beforeCall(runner.assertions);
        });
      }
    } catch (e) {
      runner.passing = false;
      reportException(runner.name, runner.callback, runner.assertions.length, e);
    }
    if (!noWait()){
      runner.callback(runner.name, 'running', runner.assertions.length);
    }
    T.waitFor(noWait, function(){
      if (runner.passing === true) {
        try {
          test(runner.assertions);
        } catch (e) {
          runner.passing = false;
          reportException(runner.name, runner.callback, runner.assertions.length, e);
        }
      }
      if (!noWait()){
        runner.callback(runner.name, 'running', runner.assertions.length);
      }
      T.waitFor(noWait, function(){
        for(var i=0;a=afterCalls[i];i++){
          var afterCall = afterCalls[i];
          T.waitFor(noWait, function(){
            try {
              afterCall(runner.assertions);
            } catch (e) {
              if (runner.passing === true) {
                runner.passing = false;
                reportException(runner.name, runner.callback, runner.assertions.length, e);
              }
            }
          });
        }
        T.waitFor(noWait, function(){
          if (runner.passing) {
            runner.callback(runner.name, 'pass', runner.assertions.length);
          }
        });
      });
    });
  };

// Assertions
  T.Assertions = function(runner){
    this.runner = runner;
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
        assertion.runner.passing = false;
        reportException(assertion.runner.name, assertion.runner.callback, assertion.length, e);
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
// NodeReporter
  T.nodeReporter = function(testName, status, assertionCount, message){
    var reporter = T.nodeReporter, prefix = '', suffix = '',
        testName = testName.join(': '),
        puts = reporter.puts = reporter.puts || require('sys').puts,
        timeout = reporter.timeout,
        counts = reporter.counts = reporter.counts || { tests: 0, pass: 0, fail: 0, error: 0 };
    reporter.runningTests = reporter.runningTests || [];
    var index = indexOf(reporter.runningTests, testName);
    if (status === 'running' && index === -1){
      reporter.runningTests.push(testName);
    } else if (status !== 'running' && index !== -1){
      reporter.runningTests.splice(index, 1);
    }

    if (status !== 'running' && status !== 'done'){
      if (status !== 'pass'){ prefix = reporter.redColor; suffix = reporter.resetColor; }
      var output = testName+': '+status
      if (status !== 'pass' && message) { output += ': '+message; }
      output += ' ('+assertionCount+' assertion'+(assertionCount === 1 ? '' : 's')+' run)';
      puts(prefix + output + suffix);
      counts.tests++;
      counts[status]++;
    }

    if (timeout){
      clearTimeout(timeout);
      delete timeout;
    }
    if (reporter.runningTests.length){ return; }
    reporter.timeout = setTimeout(function(){
      delete timeout;

      var output, prefix = '', suffix = '', details = [];
      if (counts.error > 0){
        prefix = reporter.redColor;
        suffix = reporter.resetColor;
        output = 'Error!';
      } else if (counts.fail > 0){
        prefix = reporter.redColor;
        suffix = reporter.resetColor;
        output = 'Fail.';
      } else {
        output = 'Pass.';
      }
      output += ' ('+counts.tests+' tests: ';
      if (counts.pass > 0){ details.push(counts.pass+' passed'); }
      if (counts.fail > 0){ details.push(counts.fail+' failed'); }
      if (counts.error > 0){ details.push(counts.error+' errored'); }
      puts(prefix + output + details.join(', ')+')' + suffix);
      process.exit((counts.fail || counts.error) ? 1 : 0)
    }, 200);
  };
  T.nodeReporter.redColor   = '\033[31m';
  T.nodeReporter.resetColor = '\033[39m';

// DomReporter
  T.domReporter = function(testName, status, assertionCount, message){
    var testName = testName.join(': '),
        reporter = T.domReporter;
    reporter.showPassing = reporter.showPassing || false;
    if (!reporter.log){
      reporter.log = document.createElement('ul');
      reporter.log.id = 'test-it-results';
      T.waitFor(function(){ return document.body; }, function(){
        document.body.appendChild(reporter.log);
      });
      reporter.summary = document.createElement('li');
      reporter.summary.onclick = function(){
        reporter.showPassing = !reporter.showPassing;
        reporter.log.className = reporter.showPassing ? 'show-passing' : '';
      };
      reporter.log.appendChild(reporter.summary);
    }
    reporter.runningTests = reporter.runningTests || {}
    reporter.counts = reporter.counts || {
      tests: 0,
      running: 0,
      pass: 0,
      fail: 0,
      error: 0
    };
    reporter.counts.tests++;
    reporter.counts[status]++;

    var testLog = reporter.runningTests[testName];
    if (testLog) {
      reporter.counts.tests--;
      reporter.counts.running--;
    } else {
      testLog = document.createElement('li');
      reporter.log.appendChild(testLog);
      if (status !== 'running'){
        delete reporter.runningTests[testName];
      }
    }
    if (status === 'done'){
      reporter.counts.tests--;
      reporter.log.removeChild(testLog);
    } else {
      testLog.className = status;
      var html = testName + ': ' + status;
      if (status !== 'pass' && message){
        html += ': '+message;
      }
      html += ' ('+assertionCount+' assertion'+(assertionCount === 1 ? '' : 's')+' run)';
      testLog.innerHTML = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (status === 'running'){
        reporter.runningTests[testName] = testLog;
      }
    }

    if (reporter.counts.running){
      html = 'Running... ';
      reporter.summary.className = 'summary running';
    } else if (reporter.counts.error){
      html = 'Error! ';
      reporter.summary.className = 'summary error';
    } else if (reporter.counts.fail){
      html = 'Fail. ';
      reporter.summary.className = 'summary fail';
    } else {
      html = 'Pass. ';
      reporter.summary.className = 'summary pass';
    }
    html += '<small>('+reporter.counts.tests+' test'+(reporter.counts.tests === 1 ? '' : 's')+': ';
    var details = [];
    if (reporter.counts.pass) { details.push(reporter.counts.pass+' passed'); }
    if (reporter.counts.running) { details.push(reporter.counts.running+' running'); }
    if (reporter.counts.fail) { details.push(reporter.counts.fail+' failed'); }
    if (reporter.counts.error) { details.push(reporter.counts.error+' errored'); }
    html += details.join(', ');
    reporter.summary.innerHTML = html+')</small>';
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
        var newStack = stack.concat();
        newStack.push(subject);
        for(var i=0,e;e=subject[i];i++){
          if (!first){ output += ','; }
          output += T.inspect(e, newStack);
          first = false;
        }
        return output+']';
      }
      var output = '{', first=true;
      var newStack = stack.concat();
      newStack.push(subject);
      
      var keys = [];
      for(var key in subject) {
        keys.push(key);
      }
      keys.sort();
      
      for(var i=0;i<keys.length;++i){
        if (!first){ output += ','; }
        output += keys[i]+':'+T.inspect(subject[keys[i]], newStack);
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

  if (typeof module !== 'undefined') module.exports = T;
  if (typeof window !== 'undefined') window.TestIt = T;
})();
