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

let voltronOpts;
function getVoltronOpts() {
  if (voltronOpts) return voltronOpts;
  voltronOpts = getExtensions().map(function(name) {
    let extensionPath = './node_modules/' + name + '/';
    let package = require(extensionPath + 'package.json');

    package.voltron.build = require(path.resolve(extensionPath, package.voltron.build));
    package.voltron.manifest = require(path.resolve(extensionPath, package.voltron.manifest));
    return package.voltron;
  });

  return voltronOpts;
}

function updateManifest(baseManifest) {
  return getVoltronOpts().reduce(function(opts) {
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
  return getVoltronOpts().reduce(function(acc, opts) {
    acc.push(opts.build());
    return acc;
  }, []);
}

module.exports = function(manifest) {
  return Promise.all(buildVoltronExtensions())
    .then(() => updateManifest(manifest));
};
