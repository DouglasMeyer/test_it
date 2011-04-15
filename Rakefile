namespace :test do
  desc "Run tests in node"
  task :node do
    test_pattern = "test/test_*.js"
    puts `tests=;for test in #{test_pattern} ; do tests="${tests}require('$(pwd)/${test}');" ; done ; echo $tests > /tmp/test_it_$$.pid && node /tmp/test_it_$$.pid ; rm /tmp/test_it_$$.pid`
  end

  desc "Run tests in browser (uses gnome-open)"
  task :browser do
    %x(mkdir -p build)
    File.open('build/run.html', 'w') do |f|
      f << %Q(<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    #test-it-results { list-style-type: none; margin: 0; padding: 0; }
    #test-it-results .summary { cursor: pointer; padding: 4px; border-width: 2px; border-style: solid; }
    #test-it-results li { margin: 2px 0 0 0; padding: 1px; display: none; }
    #test-it-results.show-passing li { display: block; }
    #test-it-results .summary { font-size: 150%; display: block; }
    #test-it-results .running { background-color: #AAAAAA; border-color: #727272; display: block; }
    #test-it-results .pass  { background-color: #E4FFE4; border-color: #98AA98; }
    #test-it-results .fail  { background-color: #FFB0B0; border-color: #AA7676; display: block; }
    #test-it-results .error { background-color: #FF4040; border-color: #AA2B2B; display: block; }
  </style>
  <script src="../src/test_it.js"></script>
  <script src="../test/lib/mock_it/src/mock_it.js"></script>

)
      Dir['test/*.js'].each do |test|
        f << "  <script src=\"../#{test}\"></script>\n"
      end
      f << %Q(
</head>
<body>
</body>
</html>)

    end
    %x(gnome-open build/run.html)
  end
end

desc "Watch Readme.md and generate Readme.html"
task :watch_readme do
  %x(pwd=$(pwd)
  while inotifywait $pwd/Readme.md ; do
    echo "Readme.md changed"
    rdiscount Readme.md > Readme.html
    echo "Readme.html updated"
  done)
end

task :default => 'test:node'
