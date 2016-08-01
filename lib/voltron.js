'use strict';

const path = require('path');
const globby = require('globby');
const Promise = require('creed');

function findPackageJson(prefix) {
  try {
    return require(prefix + '/package.json');
  }
  catch(e) {
    return findPackageJson(prefix + '/..');
  }
}

function getExtensionNames(directory) {
  return Object.keys(findPackageJson(directory || '.').dependencies).filter(dep => dep.indexOf('voltron-') >= 0);
}

function prependExtensionNameToPath(name) {
  return function(acc, path) {
    acc.push('**/' + name + '/' + path);
    return acc;
  };
}

const buildPaths = ['**/voltron.js', '**/voltron/{index,build}.js'];
const manifestPaths = [ '**/manifest.{js,json}'];
function getConfigs(extensionNames, directory) {
  directory = directory || process.cwd();

  const configs = extensionNames.map(function(name) {
    const prependCurExtNameToPath = prependExtensionNameToPath(name);
    const extBuildPaths = buildPaths.reduce(prependCurExtNameToPath, []);
    const extManifestPaths = manifestPaths.reduce(prependCurExtNameToPath, []);

    const globOpts = {
      cwd: directory,
      silent: true,
    };
    return Promise.merge(
      function(buildPaths, manifestPaths) {
        return {
          build: require(path.resolve(directory, buildPaths[0])),
          manifest: require(path.resolve(directory, manifestPaths[0]))
        };
      },
      globby(extBuildPaths, globOpts), globby(extManifestPaths, globOpts)
    );
  });

  return Promise.all(configs);
}

const manifestKeyWhitelist = ['content_scripts', 'permissions', 'web_accessible_resources'];
function updateManifest(configs, manifest) {
  let manifestCopy = JSON.parse(JSON.stringify(manifest));

  return configs.reduce(function(baseManifest, config) {
    for (let key in config.manifest) {
      if (manifestKeyWhitelist.indexOf(key) === -1) continue;

      const manifestVal = config.manifest[key];
      if (Array.isArray(manifestVal)) {
        baseManifest[key] = manifestVal.reduce((acc, val) => {
          if(acc.indexOf(val) === -1) {
            acc.push(val);
          }

          return acc;
        }, baseManifest[key]);
      }
      else {
        console.warn('Adding non-Arrays is not currently supported');
      }
    }

    return baseManifest;
  }, manifestCopy);
}

function buildExtensions(configs, outputDir) {
  return configs.reduce(function(acc, opts) {
    acc.push(opts.build(outputDir));
    return acc;
  }, []);
}

module.exports = {
  buildExtensions,
  updateManifest,
  getConfigs,
  getExtensionNames,
  findPackageJson
};
