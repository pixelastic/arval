const path = require('path');
const glob = require('firost/lib/glob');
const write = require('firost/lib/write');
const uuid = require('firost/lib/uuid');
const exist = require('firost/lib/exist');
const remove = require('firost/lib/remove');
const writeJson = require('firost/lib/writeJson');
const readJson = require('firost/lib/readJson');
const pMap = require('golgoth/lib/pMap');
const _ = require('golgoth/lib/lodash');
const sharp = require('sharp');

module.exports = {
  async sync(userOptions) {
    // Init options
    const sourcePath = path.resolve(userOptions.source);
    const mirrorPath = path.resolve(userOptions.mirror);
    this.sourcePath = sourcePath;
    this.mirrorPath = mirrorPath;

    await this.deleteFilesInManifestNoLongerInMirror();
    await this.createNewFilesFromSourceInMirror();
    await this.deleteFilesInMirrorNoLongerInSource();
  },
  /**
   * Create a mirror file of any file in source into the mirror
   **/
  async createNewFilesFromSourceInMirror() {
    // Copy all files from source to mirror
    const sourceFiles = await this.getFileList(this.sourcePath);
    await pMap(
      sourceFiles,
      async relativePath => {
        await this.createMirrorFile(relativePath);
      },
      { concurrency: 1 }
    );
  },
  async createMirrorFile(relativePath) {
    const mirrorFile = path.resolve(this.mirrorPath, relativePath);
    const isFileInMirror = await exist(mirrorFile);

    // We skip files that are already in the mirror
    if (isFileInMirror) {
      return;
    }

    // Adding it to the manifest
    await this.addToManifest({ path: relativePath });

    const isImage = this.isImage(relativePath);
    // Writing a dummy file to disk
    if (!isImage) {
      const randomContent = uuid();
      await write(randomContent, mirrorFile);
      return;
    }

    // Creating a thumbnail to disk
    const sourceFile = path.resolve(this.sourcePath, relativePath);
    await sharp(sourceFile).resize(42, 42).toFile(mirrorFile);
  },
  isImage(relativePath) {
    const imageFormats = ['.jpg', '.png', '.gif'];
    const extname = path.extname(relativePath);
    return _.includes(imageFormats, extname);
  },
  /**
   * Delete any file in source that is no longer in the mirror
   **/
  async deleteFilesInManifestNoLongerInMirror() {
    const manifestPath = this.manifestPath();
    if (!(await exist(manifestPath))) {
      return;
    }

    let manifest = await readJson(manifestPath);
    const manifestFiles = _.map(manifest, 'path');
    const mirrorFiles = await this.getFileList(this.mirrorPath);
    const filesInManifestNoLongerInMirror = _.difference(
      manifestFiles,
      mirrorFiles
    );
    if (_.isEmpty(filesInManifestNoLongerInMirror)) {
      return;
    }

    // Remove those files from the manifest and from the source
    await pMap(filesInManifestNoLongerInMirror, async relativePath => {
      const sourcePath = path.resolve(this.sourcePath, relativePath);
      await remove(sourcePath);
      manifest = _.reject(manifest, { path: relativePath });
    });
    await writeJson(manifest, manifestPath);
  },
  /**
   * Delete files in mirror that have been deleted in source
   **/
  async deleteFilesInMirrorNoLongerInSource() {
    const mirrorFiles = await this.getFileList(this.mirrorPath);
    const sourceFiles = await this.getFileList(this.sourcePath);
    const filesInMirrorNoLongerInSource = _.difference(
      mirrorFiles,
      sourceFiles
    );
    if (_.isEmpty(filesInMirrorNoLongerInSource)) {
      return;
    }

    const manifestPath = this.manifestPath();
    let manifest = await readJson(manifestPath);

    await pMap(filesInMirrorNoLongerInSource, async relativePath => {
      const mirrorPath = path.resolve(this.mirrorPath, relativePath);
      await remove(mirrorPath);
      manifest = _.reject(manifest, { path: relativePath });
    });
    await writeJson(manifest, manifestPath);
  },
  /**
   * Returns a sorted list of all files, recursively, in a given directory
   * @param {string} baseDirectory Directory to inspect
   * @returns {Array} List of relative paths
   **/
  async getFileList(baseDirectory) {
    const filepaths = await glob(`${baseDirectory}/**/*`, {
      directories: false,
    });
    const manifestBasename = path.basename(this.manifestPath());
    return _.chain(filepaths)
      .map(filepath => {
        return path.relative(baseDirectory, filepath);
      })
      .reject(filepath => {
        return filepath === manifestBasename;
      })
      .sort()
      .value();
  },
  /**
   * Add a given file entry to the manifest. Creates the manifest if needed
   * @param {object} data File entry
   **/
  async addToManifest(data) {
    const manifestPath = this.manifestPath();
    const hasManifest = await exist(manifestPath);
    const manifestData = hasManifest ? await readJson(manifestPath) : [];
    manifestData.push(data);
    await writeJson(manifestData, manifestPath);
  },
  /**
   * Returns the path to the manifest file
   * The manifest contains all the metadata for files in the mirror
   * @returns {string} Path to the manifest JSON file
   **/
  manifestPath() {
    return path.resolve(this.mirrorPath, 'mirror-manifest.json');
  },
  /**
   * Check if the mirror has a manifest
   * @returns {boolean} True if such a file is found
   **/
  async hasManifest() {
    return await exist(this.manifestPath());
  },
  sourcePath: null,
  mirrorPath: null,
};
