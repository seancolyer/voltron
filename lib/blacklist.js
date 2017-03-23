'use strict';

module.exports = function isBlacklisted(name) {
  return blacklist.some(str => name === str || name.indexOf(str + '-') >= 0);
};

const blacklist = [
  'karma',
  'phantomjs',
  'mocha',
  'chai',
  'eslint',
  'sinon',
  'ava',
  'chromedriver',
  'selenium',
];
