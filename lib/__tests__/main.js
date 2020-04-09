/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectArrayToContainObjectMatching"] }] */
const module = require('../main');
const emptyDir = require('firost/lib/emptyDir');
const write = require('firost/lib/write');
const exist = require('firost/lib/exist');
const remove = require('firost/lib/remove');
const readJson = require('firost/lib/readJson');

const testPath = './tmp/sync';
const sourcePath = `${testPath}/source`;
const mirrorPath = `${testPath}/mirror`;
const defaultOptions = {
  source: sourcePath,
  mirror: mirrorPath,
};

/**
 * Expect the specified value to be an array where one of the items is an object
 * matching the partial given
 * @param {Array} actual Array to test
 * @param {object} partial Partial object to find
 */
function expectArrayToContainObjectMatching(actual, partial) {
  expect(actual).toEqual(
    expect.arrayContaining([expect.objectContaining(partial)])
  );
}

describe('midnightMirror', () => {
  beforeEach(async () => {
    await emptyDir(testPath);
  });
  describe('sync', () => {
    describe('new run', () => {
      it('should create same tree structure', async () => {
        await write('xxx', `${sourcePath}/foo.txt`);
        await write('xxx', `${sourcePath}/subdir/foo.txt`);

        await module.sync({ ...defaultOptions });

        expect(await exist(`${mirrorPath}/foo.txt`)).toEqual(true);
        expect(await exist(`${mirrorPath}/subdir/foo.txt`)).toEqual(true);
      });
      it('should create a manifest on first run', async () => {
        await write('xxx', `${sourcePath}/foo.txt`);
        await module.sync({ ...defaultOptions });

        const actual = await readJson(`${mirrorPath}/mirror-manifest.json`);
        expectArrayToContainObjectMatching(actual, { path: 'foo.txt' });
      });
    });
    describe('files added to source', () => {
      it('should add new files between two runs', async () => {
        await write('xxx', `${sourcePath}/foo.txt`);
        await module.sync({ ...defaultOptions });
        await write('xxx', `${sourcePath}/subdir/foo.txt`);
        await module.sync({ ...defaultOptions });

        expect(await exist(`${mirrorPath}/foo.txt`)).toEqual(true);
        expect(await exist(`${mirrorPath}/subdir/foo.txt`)).toEqual(true);
      });
      it('should update manifest on following runs with new files', async () => {
        await write('foo', `${sourcePath}/foo.txt`);
        await module.sync({ ...defaultOptions });

        await write('bar', `${sourcePath}/bar.txt`);
        await module.sync({ ...defaultOptions });

        const actual = await readJson(`${mirrorPath}/mirror-manifest.json`);
        expectArrayToContainObjectMatching(actual, { path: 'foo.txt' });
        expectArrayToContainObjectMatching(actual, { path: 'bar.txt' });
      });
    });
    describe('files deleted in mirror', () => {
      it('should delete the file in source when deleted in mirror', async () => {
        await write('foo', `${sourcePath}/foo.txt`);
        await write('bar', `${sourcePath}/bar.txt`);
        await module.sync({ ...defaultOptions });

        await remove(`${mirrorPath}/bar.txt`);
        await module.sync({ ...defaultOptions });

        expect(await exist(`${sourcePath}/bar.txt`)).toEqual(false);
      });
    });
    describe('files deleted in source', () => {
      it('should delete the file in mirror when deleted in mirror', async () => {
        await write('foo', `${sourcePath}/foo.txt`);
        await write('bar', `${sourcePath}/bar.txt`);
        await module.sync({ ...defaultOptions });

        await remove(`${sourcePath}/bar.txt`);
        await module.sync({ ...defaultOptions });

        expect(await exist(`${mirrorPath}/bar.txt`)).toEqual(false);
      });
    });
    // If re-run with files in mirror deleted, should delete them in source
    // If re-run with files renamed, should rename them in source
    // Should create image thumbnails of images
  });
});
