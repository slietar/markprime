export default {
  add(handler) {
    let promise = handler();
    promise.catch((err) => {
      setTimeout(() => {
        console.error(err);
      }, 0);
    })

    return promise;
  }
};
