'use strict';

const voltron = require('./lib/voltron');

module.exports = async function(opts) {
  const packageJson = voltron.findPackageJson(opts.cwd);
  const extNames = voltron.getExtensionNames(packageJson, opts);
  console.log('EXTENSIONS' + extNames);

  await voltron.installDevDeps(extNames, opts.cwd);
  const configs = voltron.getConfigs(extNames, opts.cwd);
  await voltron.buildExtensions(configs, opts.buildOpts);
  const manifest = await voltron.updateManifest(configs, opts.manifest);
  console.log('complete');
  return manifest;
};
