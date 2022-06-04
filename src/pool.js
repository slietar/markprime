export class Pool {
  #promises = new Set();

  get size() {
    return this.#promises.size;
  }

  add(handler) {
    let promise = handler();
    this.#promises.add(promise);

    promise
      .catch((err) => {
        setTimeout(() => {
          console.error(err);
        }, 0);
      })
      .finally(() => {
        this.#promises.delete(promise);
      });

    return promise;
  }
}


export default new Pool();
