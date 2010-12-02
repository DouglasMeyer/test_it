(function(global){

  var T = global.TestIt = function(name, tests, reporter){
    reporter = reporter || T.Reporter;
    var results = {};
    results[name] = new T.Context(tests);
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
    var beforeAll  = tests['before all'],
        afterAll   = tests['after all' ];
    if (tests['before each']) { before.push(  tests['before each']); }
    if (tests['after each' ]) { after.unshift(tests['after each' ]); }
    delete(tests['before all' ]);
    delete(tests['before each']);
    delete(tests['after each' ]);
    delete(tests['after all'  ]);
    if (beforeAll){
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
    }
    T.waitFor(function(){
      return assertions === undefined || assertions.waitForCount === 0;
    }, function(){
      for(var testName in tests){
        var test = tests[testName];
        if (typeof(test) === 'function') {
          results[testName] = new T.Runner(before, test, after);
        } else {
          results[testName] = new T.Context(test, before, after);
        }
      }
      if (afterAll) {
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
      }
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
    if (!assertion) { throw new T.Assertions.Failure(message || assertion+" is not true"); }
  };
  T.Assertions.prototype.assertEqual = function(expected, actual, message){
    this.length = this.length + 1;
    if (!T.isEqual(expected, actual)) { throw new T.Assertions.Failure(message || "expected "+T.inspect(expected)+" but was "+T.inspect(actual)); }
  };
  T.Assertions.Failure = function(message){ this.message = message; };

// Reporter
  T.Reporter = function(results){
    this.log = document.getElementById(T.Reporter.elementId);
    if (this.log === null){
      this.log = document.createElement('ul');
      this.log.id = T.Reporter.elementId;
      document.body.appendChild(this.log);
    }
    this.reportContext(results);
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
          reporter.log.appendChild(li);
          T.waitFor(function(){ return result.running === false; }, function(){
            html += result.result;
            if (result.result !== 'pass' && result.message) {
              html += ': '+result.message;
            }
            html += ' ('+result.assertions.length+' assertion'+(result.assertions.length === 1 ? '' : 's')+' run)';
            li.innerHTML = html;
            li.className = result.result;
          });
        })();
      } else {
        this.reportContext(results[name], contextName+name+': ');
      }
    }
  };

// Helpers
  T.isEqual = function(expected, actual){
    if (Array === expected.constructor) {
      if (expected.length !== actual.length) { return false; }
      for (var i=0,e;e=expected[i];i++){ if (e !== actual[i]){ return false; } }
      return true;
    } else {
      return expected === actual;
    }
  };
  T.try = function(){
    var i=1,e=arguments[0];
    while (e && arguments[i]) {
      e = e[arguments[i]];
      i = i + 1;
    }
    return e;
  };
  T.inspect = function(subject){
    if (subject === undefined) { return 'undefined'; }
    switch(subject.constructor){
    case String: return '"'+subject+'"';
    case Array:
      var output='[', first=true;
      for(var e in subject){
        if (!first){ output += ','; }
        output += T.inspect(subject[e]);
        first = false;
      }
      return output+']';
    }
    return subject.toString();
  };
  T.waitFor = function(condition, callback){
    if (condition()){
      callback();
    } else {
      var interval = setInterval(function(){
        if (condition()){
          clearInterval(interval);
          callback();
        }
      }, 100);
    }
  };

})(window);
