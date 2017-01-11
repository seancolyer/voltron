'use strict';
import test from 'ava';
import voltron from '../../lib/voltron';
import { resolve } from 'path';
import globby from 'globby';
import { unlinkSync, rmdir } from 'fs';
import fixture from '../fixtures';

function findPackage(t, dir, expected) {
  t.is(voltron.findPackageJson(dir), expected);
}

test('findPackageJson prefix works', findPackage, fixture.dir, fixture.packageJson);
test('findPackageJson traverses up', findPackage, fixture.dir + '/fake/deep/path', fixture.packageJson);

test('getExtensionNames finds only voltron extensions', t => {
  const extensions = voltron.getExtensionNames(fixture.packageJson);
  t.is(extensions.length, 2);
  t.deepEqual(extensions, ['voltron-test', 'voltron-test2']);
});

test('getExtensionNames finds only voltron extensions explicity included', t => {
  const extensions = voltron.getExtensionNames(fixture.packageJson, { include: ['test2'] });
  t.is(extensions.length, 1);
  t.deepEqual(extensions, ['voltron-test2']);
});

test('getExtensionNames finds only voltron extensions not excluded ', t => {
  const extensions = voltron.getExtensionNames(fixture.packageJson, { exclude: ['test2'] });
  t.is(extensions.length, 1);
  t.deepEqual(extensions, ['voltron-test']);
});

const config = {
  build: fixture.build,
  manifest: fixture.manifest
};

const voltronTestDir = fixture.extOneDir + '/voltron-test';
const voltronTestTwoDir = fixture.extTwoDir + '/voltron-test2';

test('getConfigs for all voltron extensions', async t => {
  const configs = await voltron.getConfigs(['voltron-test', 'voltron-test2'], fixture.dir + '/');

  t.is(configs[0].build.toString(), config.build(voltronTestDir).toString());
  t.is(configs[0].manifest, config.manifest);
  t.is(configs[1].build.toString(), config.build(voltronTestTwoDir).toString());
  t.is(configs[1].manifest, config.manifest);
});

const baseManifest = fixture.manifestJson;
const manifestWhitelist = ['permissions', 'content_scripts', 'web_accessible_resources'];
test('updateManifest ', t => {
  let newManifest = voltron.updateManifest([config], baseManifest);

  t.notDeepEqual(baseManifest, newManifest);
  for (var key in baseManifest) {
    if (manifestWhitelist.indexOf(key) >= 0) {
      t.notDeepEqual(baseManifest[key], newManifest[key]);
    }
    else {
      t.deepEqual(baseManifest[key], newManifest[key]);
    }
  }
});

test('buildExtensions', async t => {
  const configs = await voltron.getConfigs(['voltron-test'], fixture.dir + '/');
  const stats = await voltron.buildExtensions(configs, { outputDir: voltronTestDir + '/build' });

  const matches = await globby(['**/build/voltron-*.js'], { cwd: voltronTestDir });
  t.is(matches.length, 1);
});

test.after.always.cb(t => {
  const build = voltronTestDir + '/build/';
  unlinkSync(build + 'voltron-child-content.js');
  rmdir(build, t.end);
});
