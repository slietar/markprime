self.addEventListener('fetch', function (event) {
  let url = new URL(event.request.url);

  if (url.origin === 'https://unpkg.com') {
    event.respondWith(
      caches.open('unpkg').then(function (cache) {
        return cache.match(event.request).then(function (response) {
          return (
            response ||
            fetch(event.request).then(function (response) {
              cache.put(event.request, response.clone());
              return response;
            })
          );
        });
      }),
    );
  }
});
