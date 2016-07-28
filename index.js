'use strict';

let voltron = require('./lib/voltron');
let Promise = require('creed');

function pipe(fns, val) {
  return fns.reduce((curVal, fn) => fn(curVal), val);
}

module.exports = function(opts) {
  let extNames = pipe([
    voltron.findPackageJson,
    voltron.getExtensionNames
  ], opts.cwd);

  return voltron.installDevDeps(extNames, opts.cwd)
    .then(_ => voltron.getConfigs(extNames, opts.cwd))
    .then(configs => {
      return voltron.buildExtensions(configs, opts.outputDir)
        .then(() => voltron.updateManifest(configs, opts.manifest));
    });
};
