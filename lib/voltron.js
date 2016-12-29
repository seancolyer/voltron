'use strict';

const path = require('path');
const glob = require('glob');
const Promise = require('creed');
const npminstall = require('npminstall');
const co = require('co');
const isBlacklisted = require('./blacklist');

/**
 * Searches for the root package.json in the parent/host extension.
 * This will infinitely try going up the directory chain until it succeeds
 *
 * @param {String} [prefix=process.cwd()] - Path to try to require package.json from (relative or absolute)
 *
 * @return {PackageJson}
 */
function findPackageJson(prefix) {
  prefix = prefix || process.cwd();

  try {
    return require(prefix + '/package.json');
  }
  catch(e) {
    return findPackageJson(prefix + '/..');
  }
}

function installDevDeps(voltronExtensions, directory) {
  directory = directory || process.cwd();

  let isNodeModules = directory.indexOf('node_modules') >= 0;
  return co(function* () {
    for (let ext of voltronExtensions) {
      const extPath = directory + (isNodeModules ? '/' : '/node_modules/') + ext;
      const pkg = findPackageJson(extPath);
      let devDeps = [];
      if (pkg.devDependencies) {
        devDeps = Object.keys(pkg.devDependencies)
          .filter(name => !isBlacklisted(name))
          .map(name => ({ name, version: pkg.devDependencies[name] }));
      }
      yield npminstall({
        root: extPath,
        pkgs: devDeps
      });
    }
  }).catch(_ => {
    console.error(`Error installing packages: ${_}. Reattempting.`);
    installDevDeps(voltronExtensions, directory);
  });
}

/**
 * Retrieves the name of all voltron compatible extensions
 *
 * @param {PackageJson}  - package.json to pull voltron extension names from
 *
 * @return {Array<String>}
 */
function getExtensionNames(packageJson) {
  return Object.keys(packageJson.dependencies).filter(dep => dep.indexOf('voltron-') >= 0);
}

function prependExtensionNameToPath(name) {
  return function(acc, path) {
    acc.push('**/' + name + '/' + path);
    return acc;
  };
}

function removeEventListeners(globs) {
  globs.forEach(g => g.removeAllListeners('match'));
}

function abortGlobs(globs) {
  //@NOTE: `.abort()` kills other independent globs as well
  globs.forEach(g => g.abort());
}

function createGlobsPromise(patterns, opts) {
  const deferred = Promise.future();
  const globs = patterns.reduce((acc, pattern) => {
    acc.push(new glob.Glob(pattern, opts));
    return acc;
  }, []);

  globs.forEach((g) => {
    g.on('match', (path) => {
      deferred.resolve({globs, path});
      removeEventListeners(globs);
      g.abort();
    });
  });

  return deferred.promise;
}

const buildPatterns = ['**/voltron.js', '**/voltron/{index,build}.js'];
const manifestPatterns = [ '**/manifest.{js,json}'];
/**
 * Gets the configs of all voltron extensions
 *
 * @param {Array<String>} extensionNames - All voltron extensions
 * @param {String} [directory=process.cwd()] - Where to start searching from
 *
 * @return {Promise<Array<Object>>} Contains build function & manifest object
 */
function getConfigs(extensionNames, directory) {
  directory = directory || process.cwd();

  const globOpts = {
    cwd: directory,
    cache: {},
    statCache: {},
    ignore: ['**/test?(s)/**']
  };

  const configs = extensionNames.map(function(name) {
    const prependCurExtNameToPath = prependExtensionNameToPath(name);
    const extBuildPaths = buildPatterns.reduce(prependCurExtNameToPath, []);
    const extManifestPaths = manifestPatterns.reduce(prependCurExtNameToPath, []);

    const buildPathProm = createGlobsPromise(extBuildPaths, globOpts);
    const manifestPathProm = createGlobsPromise(extManifestPaths, globOpts);

    return Promise.merge(
      function(buildPath, manifestPath) {
        abortGlobs(buildPath.globs);
        abortGlobs(manifestPath.globs);
        return {
          build: require(path.resolve(directory, buildPath.path)),
          manifest: require(path.resolve(directory, manifestPath.path))
        };
      },
      buildPathProm, manifestPathProm
    );
  });

  return Promise.all(configs);
}

const manifestKeyWhitelist = ['content_scripts', 'permissions', 'web_accessible_resources'];
/**
 * Updates a manifest based on provided configs and their manifests. Original manifest is unaltered.
 *
 * @param {Array<Object>} configs - All extension configs
 * @param {Object} manifest - Original manifest to base new manifest off of
 *
 * @return {Object} New manifest with all extension manifests merged in
 */
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

/**
 * Runs each extension's build process
 *
 * @param {Array<Object>} configs - All extension configs
 * @param {Object} buildOpts - All options needed for the build, such as output directory
 *
 * @return {Promise<Array>} An array of build results, which may not contain anything
 */
function buildExtensions(configs, buildOpts) {
  // Could also just return Promise.all(configs.reduce)
  return Promise.all(configs.reduce(function(acc, opts) {
    acc.push(opts.build(buildOpts));
    return acc;
  }, []));
}

module.exports = {
  buildExtensions,
  updateManifest,
  getConfigs,
  getExtensionNames,
  findPackageJson,
  installDevDeps
};
