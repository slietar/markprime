import pool from '../pool';
import * as util from '../util';


export default class FSAccessBackend {
  constructor(source) {
    this._files = null;
    this._source = source;
  }

  async syncStore(store) {
    store.add(...this._source);
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
                  util.filterAsync(handle.values(), (h) => (h.kind !== 'file') || h.name.endsWith('.md') || h.name.endsWith('.mdx')),
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

    return (this._source.length > 1) || (this._source[0] instanceof FileSystemFileHandle)
      ? {
        kind: 'dir',
        name: null,
        children: await Promise.all(this._source.map((handle) => processHandle(handle)))
      }
      : await processHandle(this._source[0]);
  }

  async get(fileId) {
    let { handle } = this._files[fileId];
    let file = await handle.getFile();

    return {
      id: fileId,
      contents: await file.text(),
      lastModified: file.lastModified,
      mdx: file.name.endsWith('.mdx')
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
            lastModified,
            mdx: file.name.endsWith('.mdx')
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
