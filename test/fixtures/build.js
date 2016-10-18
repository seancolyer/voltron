'use strict';

const creed = require('creed');
const webpack = require('webpack');

const config = {
  context: __dirname,
  // swig needs this fs module to exist, even if it is 'empty'
  node: { fs: 'empty' },
  entry: {
    'child-extension': './index.js'
  },
  output: {
    path: './build/js',
    filename: 'voltron-child-content.js',
    libraryTarget: 'var',
    library: 'childExtension'
  },
};

module.exports = function(dirname) {
  return function(opts) {
    const configCopy = Object.assign({}, config);

    configCopy.context = dirname;
    configCopy.output.path = opts.outputDir;

    const deferred = creed.future();
    // run webpack
    webpack(configCopy, (err, stats) => {
	    if(err) console.error("webpack:build", err);

      deferred.resolve(stats);
    });

    return deferred.promise;
  };
};
