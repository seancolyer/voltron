'use strict';

let voltron = require('./lib/voltron');
let Promise = require('creed');

module.exports = function(opts) {
  let configsProm = voltron.getConfigs(voltron.getExtensionNames(opts.root), opts.root);
  return configsProm.then(configs => {
    return Promise.all(voltron.buildExtensions(configs, opts.outputDir))
      .then(() => voltron.updateManifest(configs, opts.manifest));
  });
};
