if (typeof TestIt === 'undefined'){
  TestIt = require('./../src/test_it');
}

(function(){
  var isEqualTests = function(input){
    var tests = {};
    while(input.length >= 3){
      (function(obj1, obj2, isEqual){
        tests[TestIt.inspect(obj1)+' and '+TestIt.inspect(obj2)+' should '+(isEqual ? '' : 'not ')+'be equal'] = function(t){
          t.assertEqual(isEqual, TestIt.isEqual(obj1, obj2), null);
        };
      })(input.shift(), input.shift(), input.shift());
    }
    return tests;
  };

  var recursiveObject = {a:1};
  recursiveObject.self = recursiveObject;
  var recursiveArray = [1];
  recursiveArray.push(recursiveArray);
  TestIt('TestIt.isEqual', isEqualTests([
    // obj1, obj2, are equal?
    undefined, undefined, true,
    null, null, true,
    null, 'not null', false,
    {}, {}, true,
    {a: 1}, {b: 2}, false,
    {a: [1,2]}, {a: [1,2]}, true,
    [{a:1}], [{a:1}], true,
    recursiveObject, recursiveObject, true,
    recursiveArray, recursiveArray, true,
    {a:1, b:2}, {b:2, a:1}, true
  ]));
})();

(function(){
  var inspectTests = function(input){
    var tests = {};
    while(input.length >= 3){
      (function(){
        var subject = input.shift(),
            outcome = input.shift(),
            description = input.shift();
        tests[description+" '"+subject+"' should yield '"+outcome+"'"] = function(t){
          t.assertEqual(outcome, TestIt.inspect(subject));
        };
      })();
    }
    return tests;
  };

  var recursiveObject = {a:1};
  recursiveObject.self = recursiveObject;
  var recursiveArray = [1];
  recursiveArray.push(recursiveArray);
  var modifiedArray = [3,4,5];
  modifiedArray.extraProperty = 'hello';
  TestIt('TestIt.inspect', inspectTests([
//  subject, outcome, subject description
    1, '1', 'Integer',
    '1', '"1"', 'String',
    [1,2,3], '[1,2,3]', 'Array',
    ['a','b'], '["a","b"]', 'Array of Strings',
    undefined, 'undefined', 'Undefined',
    null, 'null', 'null',
    {a:1,b:2}, '{a:1,b:2}', 'Object',
    recursiveObject, '{a:1,self:<recursive>}', 'Recursive object',
    recursiveArray, '[1,<recursive>]', 'Recursive array',
    modifiedArray, '[3,4,5]', 'Modified array'
  ]));
})();

(function(){
  var differentContextArray;
  if (typeof require !== 'undefined'){
    //NOTE: I would like to actually grab an Array from a different JS context,
    //      but I don't know how to do that in node.js. Essentially, I'm trying
    //      to satisfy these conditions:
    //      `differentContextArray.constructor !== Array` and
    //      `Object.prototype.toString.call(differentContextArray) === '[object Array]'`.
    var MyArray = function(){
      var arraylike = Array.apply(this, arguments);
      arraylike.constructor = MyArray;
      return arraylike;
    };
    differentContextArray = new MyArray();
  }
  if (typeof document !== 'undefined'){
    var iframe = document.createElement('iframe');
    TestIt.waitFor(function(){ return document.body }, function(){
      document.body.appendChild(iframe);
      differentContextArray = new iframe.contentWindow.Array();
      document.body.removeChild(iframe);
    });
  }

  TestIt('TestIt.inspect for array from different JS context', {
    'before all': function(t){
      t.waitFor(function(time){
        return differentContextArray || time > 2000;
      }, function(){});
    },
    'should still look like an array': function(t){
      t.assertEqual('[]', TestIt.inspect(differentContextArray));
    }
  });
})();
