namespace :test do
  task :node do
    test_pattern = "test/test_*.js"
    puts `tests=;for test in #{test_pattern} ; do tests="${tests}require('$(pwd)/${test}');" ; done ; echo $tests | node /proc/self/fd/0`
  end
end

task :default => 'test:node'
