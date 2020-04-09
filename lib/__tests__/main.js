/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectArrayToContainObjectMatching"] }] */
const module = require('../main');
const emptyDir = require('firost/lib/emptyDir');
const write = require('firost/lib/write');
const exist = require('firost/lib/exist');
const remove = require('firost/lib/remove');
const copy = require('firost/lib/copy');
const readJson = require('firost/lib/readJson');
const imageSize = require('image-size');

const testPath = './tmp/sync';
const sourcePath = `${testPath}/source`;
const mirrorPath = `${testPath}/mirror`;
const fixturePath = 'fixtures';
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
      it('should create thumbnails for images', async () => {
        await copy(`${fixturePath}/image.png`, `${sourcePath}/image.png`);
        await copy(`${fixturePath}/image.jpg`, `${sourcePath}/image.jpg`);
        await copy(`${fixturePath}/image.gif`, `${sourcePath}/image.gif`);
        await module.sync({ ...defaultOptions, resize: 42 });

        const sizePng = await imageSize(`${mirrorPath}/image.png`);
        const sizeJpg = await imageSize(`${mirrorPath}/image.jpg`);
        const sizeGif = await imageSize(`${mirrorPath}/image.gif`);

        expect(sizePng).toHaveProperty('height', 42);
        expect(sizePng).toHaveProperty('width', 42);
        expect(sizeJpg).toHaveProperty('height', 42);
        expect(sizeJpg).toHaveProperty('width', 42);
        expect(sizeGif).toHaveProperty('height', 42);
        expect(sizeGif).toHaveProperty('width', 42);
      });
    });
    describe('📁 source', () => {
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
      describe('files deleted in source', () => {
        it('should delete the file in mirror when deleted in source', async () => {
          await write('foo', `${sourcePath}/foo.txt`);
          await write('bar', `${sourcePath}/bar.txt`);
          await module.sync({ ...defaultOptions });

          await remove(`${sourcePath}/bar.txt`);
          await module.sync({ ...defaultOptions });

          expect(await exist(`${mirrorPath}/bar.txt`)).toEqual(false);
        });
      });
    });
    describe('🗃️  mirror', () => {
      describe('files added to mirror', () => {
        it('should delete the mirrored file if no version in source', async () => {
          await write('foo', `${sourcePath}/foo.txt`);
          await write('bar', `${sourcePath}/bar.txt`);
          await module.sync({ ...defaultOptions });

          await write('baz', `${mirrorPath}/baz.txt`);
          await module.sync({ ...defaultOptions });

          expect(await exist(`${mirrorPath}/baz.txt`)).toEqual(false);
          expect(await exist(`${sourcePath}/baz.txt`)).toEqual(false);
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
    });
    // If re-run with files renamed, should rename them in source
    // Should create image thumbnails of images
  });
});
