#!/bin/bash

echo "Building minified TestIt. Use at your own risk."

cat src/test_it.js \
  | sed -e "/^\s*\/\//d" \
  | tr -d '\n' \
  | sed -e "s/\s\+/ /g" \
  | sed -e "s/\s*\(=\|,\|||\|{\|}\|;\|\?\|+\|&&\)\s*/\\1/g" \
  | sed -e "s/ : /:/g" \
  | sed -e "s/ !/!/g" \
  | sed -e "s/ (\([^']\)/(\\1/g" \
  | sed -e "s/;}/}/g" \
  | sed -e "s/global/g/g" \
  | sed -e "s/reportException/z/g" \
  | sed -e "s/T\.Reporter=/var R=T.Reporter=/" \
  | sed -e "s/T\.Reporter\([^=]\)/R\\1/g" \
  | sed -e "s/T\.Context=/var C=T.Context=/" \
  | sed -e "s/T\.Context\([^=]\)/C\\1/g" \
  | sed -e "s/T\.Assertions=/var A=T.Assertions=/" \
  | sed -e "s/T\.Assertions\([^=]\)/A\\1/g" \
  | sed -e "s/T\.waitFor=/var W=T.waitFor=/" \
  | sed -e "s/T\.waitFor\([^=]\)/W\\1/g" \
  | sed -e "s/R\.countWithResult=/var O=R.countWithResult=/" \
  | sed -e "s/R\.countWithResult\([^=]\)/O\\1/g" \
  | sed -e "s/\<results\>\([^']\)/o\\1/g" \
  | sed -e "s/\<name\>/n/g" \
  | sed -e "s/\<tests\>\([^:]\)/t\\1/g" \
  | sed -e "s/\([^.]\)\<result\>/\\1s/g" \
  | sed -e "s/\<reporter\>/r/g" \
  | sed -e "s/\<exception\>/x/g" \
  | sed -e "s/\<contextBefore\>/y/g" \
  | sed -e "s/\<contextAfter\>/w/g" \
  | sed -e "s/\([^.]\)\<assertions\>/\\1v/g" \
  | sed -e "s/\([^']\)\<before\>/\\1u/g" \
  | sed -e "s/\([^']\)\<after\>/\\1q/g" \
  | sed -e "s/\<beforeAll\>/p/g" \
  | sed -e "s/\<afterAll\>/m/g" \
  | sed -e "s/\<testName\>/l/g" \
  | sed -e "s/\<runner\>/k/g" \
  | sed -e "s/\<assertion\>\([^']\)/j\\1/g" \
  | sed -e "s/\<condition\>/h/g" \
  | sed -e "s/\<callback\>/g/g" \
  | sed -e "s/\([^.]\)\<message\>/\\1f/g" \
  | sed -e "s/\([^.']\)\<summary\>/\\1d/g" \
  | sed -e "s/\<runningCount\>/c/g" \
  | sed -e "s/\<passCount\>/b/g" \
  | sed -e "s/\<failCount\>/a/g" \
  | sed -e "s/\<errorCount\>/aa/g" \
  | sed -e "s/\<html\>/ab/g" \
  | sed -e "s/\<details\>/ac/g" \
  | sed -e "s/\<updateSummary\>/ad/g" \
  | sed -e "s/\<count\>/ae/g" \
  | sed -e "s/\<contextName\>/ad/g" \
  | sed -e "s/\([^\"]\)\<expected\>/\\1ae/g" \
  | sed -e "s/\<actual\>/af/g" \
  | sed -e "s/\<subject\>/ag/g" \
  | sed -e "s/\<output\>/ah/g" \
  | sed -e "s/\<interval\>/ai/g" \
  | sed -e "s/\([^.]\)\<log\>/\\1aj/g" \
  > build/test_it.min.js

cat test/run.html | sed -e "s/..\/src\/test_it.js/test_it.min.js/" > build/run.html
