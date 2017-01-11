'use strict';

const voltron = require('./lib/voltron');

module.exports = function(opts) {
  const packageJson = voltron.findPackageJson(opts.cwd);
  const extNames = voltron.getExtensionNames(packageJson, opts);

  return voltron.installDevDeps(extNames, opts.cwd)
    .then(_ => voltron.getConfigs(extNames, opts.cwd))
    .then(configs => {
      return voltron.buildExtensions(configs, opts.buildOpts)
        .then(() => voltron.updateManifest(configs, opts.manifest));
    });
};
