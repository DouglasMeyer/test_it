# TestIt

Quickly and easily test your JS.  Supports node.js and all the major browsers.


## But how do I use it?

    TestIt('Math', {
      'should be defined': function(t){
        t.assert(Math);
      },
      '.floor': {
        'should round 1.6 to 1': function(t){
          t.assertEqual(1, Math.floor(1.6));
        },
        'should round -1.6 to -2': function(t){
          t.assertEqual(-2, Math.floor(-1.6));
        }
      }
    });

And if you are testing in node.js remember to require it `var TestIt = require('./test_it').TestIt;` and you'll be good to go.

### Assertions

There are currently 2 assertions:

*    `t.assert(bool, [message]) # message defaults to: bool+" is not true"`
*    `t.assertEqual(expected, actual, [message]) # message defaults to: "expected "+TestIt.inspect(expected)+" but was "+T.inspect(actual)`

It should be easy enough to add new assertions:
    TestIt.Assertions.prototype.assertZero = function(val, message){
      this.length++; // Increment the number of assertions run for this test.
      if (val !== 0){
        if (message === undefined){ message = TestIt.inspect(val)+" is not 0"; }
        throw new TestIt.Assertions.Failure(message);
      }
    }

### Helpers

You may have noticed `TestIt.inspect` in the previous example. It is one of the helpers that TestIt uses, and is available for consumption or modification. Here are the helpers and their uses:

* `T.isEqual(expected, actual)` returns true if the two objects are equal. This is used by the `t.assertEqual` assertion and relies heavily on `T.inspect`.
* `T.inspect(subject)` returns a string that represents the subject.
* `T.waitFor(condition, callback)` calls `callback` once the `condition` function returns true. `t.waitFor` is nearly the same, but further steps in the testing process will not get called until the `t.waitFor` has completed. The `waitFor` functions will pass the milliseconds elapsed to the condition function, as this is handy for timing-out the condition.

### 'before all', 'before each', 'after each', 'after all'

If these are defined in your tests, as such:
    TestIt('my tests', {
      'before all': function(t){ ... },
      'after all': function(t){ ... },
      'a test': function(t){ ... }
    });
they should get run before all, after all, ... tests. If an exception (or failure) occurs in a test, the 'after each', and 'after all' functions will still get called.

## What else can it do?

### Custom reporters

If you want more than the minimal reporting that TestIt provides by default, feel free to use your own. You can create a reporter like such:
    MyReporter = TestIt.createReporter(function(contextOutput){
      this.reportContext(contextOutput);
    });
`reportContext` will be defined and will make calls to `MyReporter.prototype.reportTest` passing it the test name and the test's output.
You will also have access to `myReporter.countWithResult(result)` which will count all the `contextOutput`s that have a matching result ('running', 'pass', 'fail', 'error').
contextOutput will have a format similar to:
    { 'my tests': {
      'a test': {
        assertions: { length: 2 }
        result: 'pass'
      },
      'running test': {
        assertions: { length: 0 },
        running: true
      },
      'failing test': {
        assertions: { length: 1 },
        result: 'fail',
        message: 'expected 1 but was 0'
      }
    }}

Then you can use your reporter like so:
    TestIt('my tests', {
      ...
    }, myReporter);

### Extensions

Extensions provide a way for you to extend your tests with additional functionality.
    SubmitFormExtension = {
      'before each': function(t){
        t.submit = function(form, options){
          for(var name in options){
            jQuery(form, name).val(options[name]);
          }
          form.submit();
        }
      }
    };
    TestIt('test the forms': {
      'the tests': ...
    }, SubmitFormExtension, myReporter);

A few notes

1. Extensions work about the same as nesting the tests in a new context.
2. The `t` variable is a new object each test; so if you are modifying it, make sure you do so before each test.
3. The `t` variable is a new object in 'before all' and 'after all', so I wouldn't plan on modifying it there.

#### Existing Extensions

* [MockIt](http://github.com/DouglasMeyer/mock_it) - A mocking framework for TestIt


## Now what?

Get testing, create extensions, and give me feedback. I'm always looking for ways to improve TestIt, as long as it still makes it easy to test your JS.
