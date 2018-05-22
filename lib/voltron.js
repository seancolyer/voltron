'use strict';

const path = require('path');
const glob = require('glob');
const Promise = require('creed');
const isBlacklisted = require('./blacklist');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

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

async function installDevDeps(voltronExtensions, directory) {
  console.log(`npm --version : ${JSON.stringify(await exec('npm --version'))}`);
  console.log(`Installing devDependencies for: ${voltronExtensions}`);
  directory = directory || process.cwd();

  const isNodeModules = directory.indexOf('node_modules') >= 0;
  for (const voltronExtension of voltronExtensions) {
    const extPath = directory + (isNodeModules ? '/' : '/node_modules/') + voltronExtension;
    const pkg = findPackageJson(extPath);
    let devDeps;
    if (pkg.devDependencies) {
      devDeps = Object.keys(pkg.devDependencies)
        .filter(name => !isBlacklisted(name))
        .reduce((acc, name) => {
          acc[name] = pkg.devDependencies[name];
          return acc;
        }, {});
    }

    const installs = [];
    // let parallel = 0;
    let installCommand = 'npm install ';
    for (const devDep of Object.keys(devDeps)) {
      installCommand += `${devDep}@${devDeps[devDep]} `;
    }
    installCommand += ' --no-package-lock --no-save'
    console.log(`Running install command for ${voltronExtension}: ${installCommand}`);
    await exec(installCommand);
  }
}

/**
 * Retrieves the name of all voltron compatible extensions
 *
 * @param {PackageJson}  - package.json to pull voltron extension names from
 * @param {Object} - include and exclude specific extensions
 *
 * @return {Array<String>}
 */
function getExtensionNames(packageJson, opts) {
  opts = opts || {};

  return Object.keys(packageJson.dependencies).filter(dep => {
    let isVoltronExt = dep.indexOf('voltron-') >= 0;
    if (!isVoltronExt) return false;

    if (opts.include) isVoltronExt = opts.include.some(inc => dep.indexOf(inc) >= 0);
    if (opts.exclude) isVoltronExt = opts.exclude.every(exc => dep.indexOf(exc) <= 0);

    return isVoltronExt;
  });
}

function prependExtensionNameToPath(name) {
  return function(acc, path) {
    acc.push('**/' + name + '/' + path);
    return acc;
  };
}

function createGlobs(patterns, opts) {
  for (const pattern of patterns) {
    const matches = glob.sync(pattern, opts);
    if (matches.length > 0) {
      return matches[0];
    }
  }
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
  console.log(`Getting voltron configurations for: ${extensionNames}`);
  directory = directory || process.cwd();

  const globOpts = {
    cwd: directory,
    cache: {},
    statCache: {},
    realpath: true,
    ignore: ['**/test?(s)/**']
  };

  const configs = extensionNames.map(function(name) {
    const prependCurExtNameToPath = prependExtensionNameToPath(name);
    const extBuildPaths = buildPatterns.reduce(prependCurExtNameToPath, []);
    const extManifestPaths = manifestPatterns.reduce(prependCurExtNameToPath, []);

    const buildPath = createGlobs(extBuildPaths, globOpts);
    const manifestPath = createGlobs(extManifestPaths, globOpts);

    return {
      build: require(buildPath),
      manifest: require(manifestPath)
    };
  });
  return configs;
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
  console.log(`Updating manifest: ${JSON.stringify(manifest)}`);
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
  console.log('Voltron: building extensions');
  return configs.reduce(function(prom, opts) {
    return prom.then(_ => opts.build(buildOpts));
  }, Promise.resolve(true)).catch((e) => {
    console.warn(`Voltron build failed. Retrying. ${e}`);
    return buildExtensions(configs, buildOpts);
  });
}

module.exports = {
  buildExtensions,
  updateManifest,
  getConfigs,
  getExtensionNames,
  findPackageJson,
  installDevDeps
};
