export function defer() {
  let resolve, reject;
  let promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return { promise, resolve, reject };
}


export function formatClass(...args) {
  return args
    .flatMap((arg) => {
      if (arg.constructor === Object) {
        return Object.entries(arg)
          .filter(([key, value]) => value)
          .map(([key, value]) => key);
      }

      return arg;
    })
    .join(' ');
}


export function isExternalUrl(url) {
  return (/^https?:\/\/|blob:|data:/i).test(url);
}


export async function wrapAbortable(promise) {
  try {
    return await promise;
  } catch (err) {
    if (err.name === 'AbortError') {
      return null;
    }

    throw err;
  }
}


export async function collectAsync(iterable) {
  let items = [];

  for await (let item of iterable) {
    items.push(item);
  }

  return items;
}

export async function* filterAsync(iterable, callback) {
  let index = 0;

  for await (let item of iterable) {
    if (await callback(item, index++)) {
      yield item;
    }
  }
}

export async function* mapAsync(iterable, callback) {
  let index = 0;

  for await (let item of iterable) {
    yield await callback(item, index++);
  }
}

export async function findAsync(arr, fn) {
  for (let index = 0; index < arr.length; index++) {
    let item = arr[index];

    if (await fn(item, index, arr)) {
      return item;
    }
  }

  return undefined;
}
