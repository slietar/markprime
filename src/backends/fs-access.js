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

    if (tree.name) {
      return tree.name;
    }

    let formatOtherFilesCount = (count) => (count > 0)
      ? ` (+ ${count} file${(count > 1) ? 's' : ''})`
      : '';

    let rootEntries = tree.children.filter((child) => (child.kind === 'file'));
    let rootEntriesFormattable = rootEntries.filter((child) => child.format);

    for (let child of rootEntriesFormattable) {
      let file = await child._handle.getFile();
      let contents = await file.text();

      let name = await child.format.findName?.(contents);

      if (name) {
        return name + formatOtherFilesCount(rootEntriesFormattable.length - 1);
      }
    }

    if (rootEntriesFormattable.length > 0) {
      return rootEntriesFormattable[0].name + formatOtherFilesCount(rootEntriesFormattable.length - 1);
    }

    return null;
  }

  async saveSource() {
    return this._source;
  }

  // options: { maxDepth, maxEntryCount }
  async loadTree(options) {
    let index = 0;
    let createId = () => (index++).toString();

    let createDirectoryEntry = async (id, name, childHandles, depth) => {
      let childrenRaw = await Promise.all(
        childHandles
          .filter((handle) => !handle.name.startsWith('.'))
          .map(async (handle) => await processHandle(handle, depth + 1))
      );

      let children = childrenRaw.filter((child) => (child !== null));

      let hasFormattableFiles = children.some((entry) => (entry.kind === 'directory') ? entry.hasFormattableFiles : entry.format);
      let hasImmediateFormattableFiles = children.some((entry) => (entry.kind === 'file') && entry.format);
      let childrenWithFormattableFiles = children.filter((entry) => (entry.kind === 'directory') && entry.hasFormattableFiles);

      let entry = {
        kind: 'directory',
        id,
        name,
        get path() {
          return this.parent
            ? (this.parent.path + this.name + '/')
            : '/';
        },
        children,
        collapseChild: hasFormattableFiles && !hasImmediateFormattableFiles && (childrenWithFormattableFiles.length === 1)
          ? childrenWithFormattableFiles[0]
          : null,
        hasFormattableFiles,
        parent: null,
        truncated: (children.length !== childrenRaw.length)
      };

      for (let child of children) {
        child.parent = entry;
      }

      return entry;
    };

    let processHandle = async (handle, depth) => {
      if ((depth > (options?.maxDepth ?? 5)) || (index >= (options?.maxEntryCount ?? 100))) {
        return null;
      }

      let id = createId();

      switch (handle.kind) {
        case 'directory': {
          if (handle.queryPermission() !== 'granted') {
            await handle.requestPermission();
          }

          let childHandles = await util.collectAsync(handle.values());
          return await createDirectoryEntry(id, handle.name, childHandles, depth);
        }

        case 'file': {
          return {
            kind: 'file',
            id,
            format: findFormat(handle.name),
            name: handle.name,
            get path() {
              return (this.parent?.path ?? '/') + this.name;
            },
            parent: null,
            getBlob: async () => await handle.getFile(),
            _handle: handle
          };
        }
      }
    };

    let tree;

    switch (this._source.type) {
      case 'multiple': {
        tree = await createDirectoryEntry(createId(), null, this._source.handles, 0);
        break;
      }

      case 'single': {
        tree = await processHandle(this._source.handle, 0);
        break;
      }
    }

    this.tree = tree;
    return tree;
  }

  async get(fileEntry) {
    return await fileEntry._handle.getFile();
  }

  watch(fileEntry, callback, options) {
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
    }, options?.interval ?? 1000);

    options?.signal?.addEventListener('abort', () => {
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
