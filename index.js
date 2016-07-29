'use strict';

let voltron = require('./lib/voltron');
let Promise = require('creed');

module.exports = function(manifest) {
  let manifestCopy = JSON.parse(JSON.stringify(manifest));
  let conifgs = voltron.getConfigs(voltron.getExtensions());
  return Promise.all(voltron.buildExtensions(configs))
    .then(() => voltron.updateManifest(configs, manifestCopy));
};
