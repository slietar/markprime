import { get, set, update } from 'idb-keyval';

import * as util from './util';


const Key = 'main';

export default class Store {
  constructor(onUpdate) {
    this._update = onUpdate;
  }

  async initialize() {
    let data = await get(Key);

    if (!data || (data.version !== Version)) {
      let data = {
        files: [],
        nextId: 0,
        version: Version
      };

      set(Key, data);
    }

    this._update(data.files);
  }

  async add(...handles) {
    let data = await get(Key);

    for (let handle of handles) {
      let info = await util.findAsync(data.files, async (info) => await info.handle.isSameEntry(handle));

      if (!info) {
        info = {
          id: data.nextId++,
          date: null,
          handle
        };

        data.files.push(info);
      }

      info.date = Date.now();
    }

    await set(Key, data);
  }

  async remove(id) {
    await update(Key, (data) => ({
      ...data,
      files: data.files.filter((info) => info.id !== id)
    }));

    this._update((await get(Key)).files);
  }
}
