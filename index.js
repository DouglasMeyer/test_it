jQuery(function($){
  var taglines = [
    'Simply test your JS',
    'Better than your old test framework',
    'Test good javascript with good javascript',
    'Less framework, more testing'
  ];
  $('#tagline').html(taglines[parseInt(Math.random()*taglines.length)]);

  var testingMirror = CodeMirror.fromTextArea($('textarea')[0]);

  var reporter = TestIt.domReporter;
  $('.testing button').click(function(){
    reporter.log = $('#test-it-results').html('')[0];
    reporter.summary = $('<li class="summary"></li>').appendTo(reporter.log)[0];
    delete reporter.runningTests;
    delete reporter.counts;
    try {
      var code = testingMirror.getValue();
      new Function(code)();
    } catch(e) {
      $(reporter.log).html(e.toString());
    }
  }).click();
});
