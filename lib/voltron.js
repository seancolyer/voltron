'use strict';

let path = require('path');

function findPackageJson(prefix) {
  try {
    return require(prefix + '/package.json');
  }
  catch(e) {
    return findPackageJson(prefix + '/..');
  }
}

function getExtensions(directory) {
  return Object.keys(findPackageJson(directory || '.').dependencies).filter(dep => dep.indexOf('voltron-') >= 0);
}

function getConfig(path) {
  try {
    return require(path + '/package.json').voltron;
  }
  catch (e) {
    return require(path + '/voltron.js');
  }
}

let voltronOpts;
function getConfigs(extensionNames) {
  if (voltronOpts) return voltronOpts;

  voltronOpts = extensionNames.map(function(name) {
    let extensionPath = './node_modules/' + name;
    let config = getConfig(extensionPath);

    return {
      build: require(path.resolve(extensionPath, config.build)),
      manifest: require(path.resolve(extensionPath, config.manifest))
    };
  });

  return voltronOpts;
}

function updateManifest(configs, baseManifest) {
  return configs.reduce(function(baseManifest, opts) {
    for (let key in opts.manifest) {
      let manifestVal = opts.manifest[key];
      let baseManifestVal = baseManifest[key];

      if (Array.isArray(baseManifestVal)) {
        baseManifestVal.push.apply(baseManifestVal, manifestVal);
      }
      else {
        console.warn('Adding non-Arrays is not currently supported');
      }
    }

    return baseManifest;
  }, baseManifest);
}

function buildExtensions(configs) {
  return configs.reduce(function(acc, opts) {
    acc.push(opts.build());
    return acc;
  }, []);
}

module.exports = {
  buildExtensions,
  updateManifest,
  getConfigs,
  getConfig,
  getExtensions,
  findPackageJson
};
