import test from 'ava';
import voltron from '../../lib/voltron';
import { resolve } from 'path';

const fixturePackageJson = require('../fixtures/package.json');
const fixturesDir = resolve(__dirname, '../fixtures');

function findPackage(t, dir, expected) {
  t.is(voltron.findPackageJson(dir), expected);
}

test('findPackageJson prefix works', findPackage, fixturesDir, fixturePackageJson);
test('findPackageJson traverses up', findPackage, fixturesDir + '/fake/deep/path', fixturePackageJson);

test('getExtensions finds only voltron extensions', t => {
  const extensions = voltron.getExtensions(fixturesDir);
  t.is(extensions.length, 2);
  t.deepEqual(extensions, ['voltron-test', 'voltron-test2']);
});

function getConfig(t, dir, file) {
  const pkgJsonDir = fixturesDir + '/' + dir;
  const config = voltron.getConfig(pkgJsonDir);
  let expectedConfig = require(pkgJsonDir + '/' + file);
  expectedConfig = file === 'package.json' ? expectedConfig.voltron : expectedConfig;

  t.is(config, expectedConfig);
}

test('getConfig for package.json', getConfig, 'child-extension-package-json', 'package.json');
test('getConfig for voltron.js', getConfig, 'child-extension-voltron-js', 'voltron');
test('getConfig gets package.json when both package.json and voltron.js exist', getConfig, 'child-extension-both', 'package.json');
