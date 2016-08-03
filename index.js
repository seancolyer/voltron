'use strict';

let voltron = require('./lib/voltron');
let Promise = require('creed');

function pipe(fns, val) {
  return fns.reduce((curVal, fn) => fn(curVal), val);
}

module.exports = function(opts) {
  let configsProm = pipe([
    voltron.findPackageJson,
    voltron.getExtensionNames,
    (extensionNames) => voltron.getConfigs(extensionNames, opts.cwd)
  ], opts.cwd);

  return configsProm.then(configs => {
    return voltron.buildExtensions(configs, opts.outputDir)
      .then(() => voltron.updateManifest(configs, opts.manifest));
  });
};
