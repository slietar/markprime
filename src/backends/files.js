import pool from '../pool';
import * as util from '../util';


export default class FilesBackend {
  constructor(files) {
    this._files = Object.fromEntries(
      Array.from(files).map((file, index) => [index.toString(), file])
    );
  }

  async loadTree() {
    return {
      kind: 'dir',
      name: null,
      children: Object.entries(this._files).map(([id, file]) => ({
        kind: 'file',
        id,
        name: file.name
      }))
    };
  }


  async get(fileId) {
    let file = this._files[fileId];

    return {
      id: fileId,
      contents: await file.text(),
      lastModified: file.lastModified
    };
  }

  watch(fileId, callback, options = {}) {
    pool.add(async () => {
      callback(await this.get(fileId));
    });
  }


  static fromDataTransfer(transfer) {
    let files = Array.from(transfer.files).filter((file) => file.name.endsWith('.md'));

    return files.length > 0
      ? new FilesBackend(files)
      : null;
  }
}
