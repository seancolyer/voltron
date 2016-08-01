import { unlinkSync, rmdir } from 'fs';
import test from 'ava';
import voltron from '../../index';
import fixture from '../fixtures';

const buildDir = fixture.extOneDir + '/build/';
test('voltron full run', async t => {
  let manifest = await voltron({
    root: fixture.dir,
    outputDir: buildDir,
    manifest: fixture.manifestJson
  });

  t.true(typeof manifest == 'object');
  t.notDeepEqual(manifest, fixture.manifestJson);
});

test.after.always.cb(t => {
  unlinkSync(buildDir + 'voltron-child-content.js');
  rmdir(buildDir, t.end);
});
