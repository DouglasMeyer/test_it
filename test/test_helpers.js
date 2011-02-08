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
    recursiveArray, recursiveArray, true
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
    recursiveArray, '[1,<recursive>]', 'Recursive array'
  ]));
})();
