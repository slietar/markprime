import pool from '../pool';
import * as util from '../util';


export default class FSAccessBackend {
  constructor(source) {
    this._files = null;
    this._source = source;
  }

  async loadTree() {
    let index = 0;
    this._files = {};

    let processHandle = async (handle) => {
      switch (handle.kind) {
        case 'directory': {
          return {
            kind: 'dir',
            name: handle.name,
            children: (
              await util.collectAsync(
                util.mapAsync(
                  util.filterAsync(handle.values(), (h) => (h.kind !== 'file') || h.name.endsWith('.md')),
                  (h) => processHandle(h)
                )
              )
            ).filter((item) => (item.kind !== 'dir') || (item.children.length > 0))
          };
        }
        case 'file': {
          let id = (index++).toString();
          this._files[id] = { handle };

          return {
            kind: 'file',
            id,
            name: handle.name
          };
        }
      }
    };

    return Array.isArray(this._source)
      ? {
        kind: 'dir',
        name: null,
        children: await Promise.all(this._source.map((handle) => processHandle(handle)))
      }
      : await processHandle(this._source);

    for (let handle of this._source) {
      let contents = await (await handle.getFile()).text();
      let titleLine = contents.split('\n')
        .find((line) => line.startsWith('#'));

      let name = titleLine
        ? titleLine.substring(1).trim()
        : handle.name;

      files.push({
        id: handle.name,
        name,
        contents
      });
    }

    return files;
  }

  async get(fileId) {
    let { handle } = this._files[fileId];
    let file = await handle.getFile();

    return {
      id: fileId,
      contents: await file.text(),
      lastModified: file.lastModified
    };
  }

  async watch(fileId, callback, options = {}) {
    let { handle } = this._files[fileId];
    let lastModified = 0;

    let update = (initial) => {
      pool.add(async () => {
        let file = await handle.getFile();

        if (file.lastModified !== lastModified) {
          lastModified = file.lastModified;

          callback({
            id: fileId,
            contents: await file.text(),
            lastModified
          }, initial);
        }
      });
    };

    let intervalId = setInterval(() => {
      update();
    }, options.interval ?? 1000);

    options.signal?.addEventListener('abort', () => {
      clearInterval(intervalId);
    });

    update(true);
  }
}
