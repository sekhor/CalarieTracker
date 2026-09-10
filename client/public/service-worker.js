const CACHE_NAME = 'calorieai-v2'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/pwa-192.png',
  '/pwa-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return

  const url = new URL(request.url)

  // Authenticated/user-specific API data must never be stored in a shared
  // service-worker cache. This also prevents stale dashboard and photo data.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const contentType = response.headers.get('content-type') || ''
          if (response.ok && contentType.includes('text/html')) {
            caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone()))
          }
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  const isStaticAsset = url.pathname.startsWith('/assets/')
    || APP_SHELL.includes(url.pathname)

  if (!isStaticAsset) return

  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()))
      }
      return networkResponse
    })),
  )
})
