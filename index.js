let path = require('path');
let Promise = require('creed');

function findPackageJson(prefix) {
  try {
    return require(prefix + 'package.json');
  }
  catch(e) {
    return findPackageJson(prefix + '../');
  }
}

function getExtensions() {
  let package = findPackageJson('');
  return findPackageJson('').dependencies.filter(dep => dep.indexOf('voltron-') >= 0);
}

function getExtensionConfig(path) {
  try {
    return require(path + 'package.json').voltron;
  }
  catch (e) {
    return require(path + 'voltron.js');
  }
}

let voltronOpts;
function getVoltronConfigs() {
  if (voltronOpts) return voltronOpts;

  voltronOpts = getExtensions().map(function(name) {
    let extensionPath = './node_modules/' + name + '/';
    let config = getExtensionConfig(extensionPath);

    return {
      build: require(path.resolve(extensionPath, config.build)),
      manifest: require(path.resolve(extensionPath, config.manifest))
    };
  });

  return voltronOpts;
}

function updateManifest(baseManifest) {
  return getVoltronConfigs().reduce(function(baseManifest, opts) {
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

function buildVoltronExtensions() {
  return getVoltronConfigs().reduce(function(acc, opts) {
    acc.push(opts.build());
    return acc;
  }, []);
}

module.exports = function(manifest) {
  let manifestCopy = JSON.parse(JSON.stringify(manifest));
  return Promise.all(buildVoltronExtensions())
    .then(() => updateManifest(manifestCopy));
};
