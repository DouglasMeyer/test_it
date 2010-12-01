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
    try {
      assertions = new TestIt.Assertions();
      beforeAll && beforeAll(assertions);
    } catch (e) {
      results['before all'] = { assertions: assertions };
      reportException(results['before all'], e);
      afterAll && afterAll(); // FIXME: pass this the assertions.
      return results;
    }
    for(var testName in tests){
      var test = tests[testName];
      if (typeof(test) === 'function') {
        results[testName] = new T.Runner(before, test, after);
      } else {
        results[testName] = new T.Context(test, before, after);
      }
    }
    try {
      assertions = new TestIt.Assertions();
      afterAll && afterAll(assertions);
    } catch (e) {
      results['after all'] = { assertions: assertions };
      reportException(results['after all'], e);
    }
    return results;
  };

// Runner
  T.Runner = function(before, test, after){
    this.assertions = new T.Assertions();
    try {
      for(var i=0,b;b=before[i];i++){ b(this.assertions); }
      test(this.assertions);
    } catch (e) {
      reportException(this, e);
    }
    for(var i=0,a;a=after[i];i++){
      try {
        a(this.assertions);
      } catch (e) {
        if (this.result === undefined) {
          reportException(this, e);
        }
      }
    }
    if (this.result === undefined) {
      this.result = 'pass';
    }
  };

// Assertions
  T.Assertions = function(){ this.length = 0; };
  T.Assertions.prototype.assert = function(assertion, message){
    this.length = this.length + 1;
    if (!assertion) { throw new T.Assertions.Failure(message); }
  };
  T.Assertions.prototype.assertEqual = function(expected, actual, message){
    this.length = this.length + 1;
    if (!T.isEqual(expected, actual)) { throw new T.Assertions.Failure(message); }
  };
  T.Assertions.Failure = function(message){ this.message = message; };

// Reporter
  T.Reporter = function(results){
    this.log = document.getElementById(T.Reporter.elementId);
    if (this.log === null){
      this.log = document.createElement('ul');
      this.log.id = T.Reporter.elementId;
      //log.style = "position:absolute;top:0;left:0;";
      document.body.appendChild(this.log);
    }
    this.reportContext(results);
  };
  T.Reporter.elementId = 'test-it-results';
  T.Reporter.prototype.reportContext = function(results, contextName){
    contextName = contextName || '';
    for(var name in results){
      var result = results[name];
      if(result.assertions) {
        var li = document.createElement('li'),
            html = contextName+name+': '+result.result;
        if (result.result !== 'pass' && result.message) {
          html += ': '+result.message;
        }
        html += ' ('+result.assertions.length+' assertion'+(result.assertions.length === 1 ? '' : 's')+' run)';
        li.innerHTML = html;
        li.className = result.result;
        this.log.appendChild(li);
      } else {
        this.reportContext(result, contextName+name+': ');
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

})(window);
