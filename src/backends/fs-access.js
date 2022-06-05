import { findFormat } from '../formats';
import pool from '../pool';
import * as util from '../util';


export default class FSAccessBackend {
  static name = 'fs-access';

  constructor(source, id = crypto.randomUUID()) {
    this.id = id;
    this.tree = null;

    this._source = source;
  }

  /* async findLastModified() {
    let find = async (dir) => {
      // etc.
    };

    return await find(await this.loadTree());
  } */

  async findName() {
    let tree = await this.loadTree();
    let readmeEntry = tree.children.find((child) => (child.kind === 'file') && (child.name.toLowerCase() === 'readme.md'));

    if (readmeEntry?.format) {
      let file = await readmeEntry._handle.getFile();
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
      let file = await child._handle.getFile();
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

  // options: { maxDepth, maxEntryCount }
  async loadTree(options) {
    let index = 0;

    let processHandle = async (handle, depth) => {
      if ((depth > (options?.maxDepth ?? 5)) || (index >= (options?.maxEntryCount ?? 50))) {
        return null;
      }

      let id = (index++).toString();

      switch (handle.kind) {
        case 'directory': {
          if (handle.queryPermission() !== 'granted') {
            await handle.requestPermission();
          }

          let childrenResults = (await util.collectAsync(
            util.mapAsync(handle.values(), (h) => processHandle(h, depth + 1))
          ));

          let children = childrenResults.filter((child) => child !== null);

          let hasFormattableFiles = children.some((entry) => (entry.kind === 'directory') ? entry.hasFormattableFiles : entry.format);
          let childrenWithFormattableFiles = children.filter((entry) => (entry.kind === 'directory') && entry.hasFormattableFiles);

          let entry = {
            kind: 'directory',
            id,
            name: handle.name,
            children,
            blendChild: hasFormattableFiles && (childrenWithFormattableFiles.length === 1)
              ? childrenWithFormattableFiles[0]
              : null,
            hasFormattableFiles,
            parent: null,
            truncated: (children.length !== childrenResults.length)
          };

          for (let child of children) {
            child.parent = entry;
          }

          return entry;
        }

        case 'file': {
          return {
            kind: 'file',
            id,
            format: findFormat(handle.name),
            name: handle.name,
            parent: null,
            getBlob: async () => await handle.getFile(),
            _handle: handle
          };
        }
      }
    };

    let tree = (this._source.type === 'multiple')
      ? {
        kind: 'directory',
        name: null,
        children: await Promise.all(this._source.handles.map((handle) => processHandle(handle, 1)))
      }
      : await processHandle(this._source.handle, 0);

    this.tree = tree;
    return tree;
  }

  async get(fileEntry) {
    return await fileEntry._handle.getFile();
  }

  watch(fileEntry, callback, options = {}) {
    let handle = fileEntry._handle;
    let lastModified = 0;

    let update = (initial) => {
      pool.add(async () => {
        if (handle.queryPermission() !== 'granted') {
          await handle.requestPermission();
        }

        let file = await handle.getFile();

        if (file.lastModified !== lastModified) {
          lastModified = file.lastModified;
          callback(file, initial);
        }
      });
    };

    let intervalId = setInterval(() => {
      update(false);
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
