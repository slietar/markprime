import { findFormat } from '../formats';
import pool from '../pool';
import * as util from '../util';


export default class FSAccessBackend {
  static name = 'fs-access';

  constructor(source, id = crypto.randomUUID()) {
    this.id = id;
    this.tree = null;

    this._files = null;
    this._source = source;
  }

  async findLastModified() {
    let find = async (dir) => {
      // etc.
    };

    return await find(await this.loadTree());
  }

  async findName() {
    let tree = await this.loadTree();
    let readmeEntry = tree.children.find((child) => (child.kind === 'file') && (child.name.toLowerCase() === 'readme.md'));

    if (readmeEntry?.format) {
      let file = await this._files[readmeEntry.id].handle.getFile();
      let contents = await file.text();

      let name = await readmeEntry.format.findName?.(contents);

      if (name) {
        return name;
      }
    }

    if (this._source.type === 'single') {
      return this._source.handle.name;
    }

    let rootEntries = tree.children.filter((child) => (child.kind === 'file'));
    let rootEntriesFormattable = rootEntries.filter((child) => child.format);

    for (let child of rootEntriesFormattable) {
      let file = await this._files[child.id].handle.getFile();
      let contents = await file.text();

      let name = await child.format.findName?.(contents);

      if (name) {
        let otherFilesCount = rootEntriesFormattable.length - 1;

        if (otherFilesCount > 0) {
          name += ` (+ ${otherFilesCount} file${(otherFilesCount > 1) ? 's' : ''})`;
        }

        return name;
      }
    }

    if (rootEntries.length === 1) {
      return rootEntries[0].name;
    }

    // TODO
    // Add `${rootEntriesFormattable[0].name} (+ n files)`
    // Add `${rootEntries[0].name} (+ n files)`

    return null;
  }

  async saveSource() {
    return this._source;
  }

  async loadTree() {
    let index = 0;
    this._files = {};

    let processHandle = async (handle) => {
      switch (handle.kind) {
        case 'directory': {
          if (handle.queryPermission() !== 'granted') {
            await handle.requestPermission();
          }

          return {
            kind: 'directory',
            name: handle.name,
            children: (
              await util.collectAsync(
                util.mapAsync(
                  util.filterAsync(handle.values(), (h) => (h.kind !== 'file') || h.name.endsWith('.md') || h.name.endsWith('.mdx')),
                  (h) => processHandle(h)
                )
              )
            ).filter((item) => (item.kind !== 'directory') || (item.children.length > 0))
          };
        }
        case 'file': {
          let id = (index++).toString();
          this._files[id] = { handle };

          return {
            kind: 'file',
            id,
            format: findFormat(handle.name),
            name: handle.name
          };
        }
      }
    };

    let tree = (this._source.type === 'multiple')
      ? {
        kind: 'directory',
        name: null,
        children: await Promise.all(this._source.handles.map((handle) => processHandle(handle)))
      }
      : await processHandle(this._source.handle);

    this.tree = tree;
    return tree;
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
        if (handle.queryPermission() !== 'granted') {
          await handle.requestPermission();
        }

        let file = await handle.getFile();

        if (file.lastModified !== lastModified) {
          lastModified = file.lastModified;

          callback(await file.text(), initial);
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


  static fromDirectoryHandle(handle) {
    return new FSAccessBackend({
      type: 'single',
      handle
    });
  }

  static fromHandles(handles) {
    return new FSAccessBackend({
      type: 'multiple',
      handles
    });
  }

  static getWorkspaceIcon(source) {
    return source.type === 'multiple'
      ? 'file'
      : 'directory';
  }
}
