import CommonBackend from './common';
import { createTree } from '../filesystem';
import pool from '../pool';
import * as util from '../util';


export default class FSAccessBackend extends CommonBackend {
  static name = 'fs-access';

  constructor(source, id = crypto.randomUUID()) {
    super();

    this.id = id;
    this.tree = null;

    this._source = source;
  }

  async getTreeName() {
    return this.tree.name ?? null;
  }

  async saveSource() {
    return this._source;
  }

  async loadTree(options) {
    let initialData = (() => {
      switch (this._source.type) {
        case 'multiple': return this._source.handles;
        case 'single': return this._source.handle;
      }
    })();

    this.tree = await createTree(initialData, {
      getName: (handle) => handle.name,
      processItem: async (handle) => {
        switch (handle.kind) {
          case 'directory': {
            if (handle.queryPermission() !== 'granted') {
              await handle.requestPermission();
            }

            let childHandles = await util.collectAsync(handle.values());

            return {
              kind: 'directory',
              name: handle.name,
              children: childHandles
            };
          }

          case 'file': {
            return {
              kind: 'file',
              name: handle.name,
              getBlob: async () => await handle.getFile(),
              _handle: handle
            };
          }
        }
      },
      ...options
    });
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
