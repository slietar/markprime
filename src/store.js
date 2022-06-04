import { createStore, get, set, update } from 'idb-keyval';

import * as util from './util';


export default class Store {
  constructor(onUpdate) {
    this._key = 'workspaces';
    this._store = createStore('markprime', 'keyval');
    this._update = onUpdate;
  }

  async initialize() {
    let data = await get(this._key, this._store);

    if (!data || (data.version !== Version)) {
      data = {
        version: Version,
        workspaces: []
      };

      await set(this._key, data, this._store);
    }

    this._update(data.workspaces);
  }

  async save(workspaces) {
    await update(this._key, (data) => ({
      ...data,
      workspaces
    }), this._store);

    this._update(workspaces);
  }
}
