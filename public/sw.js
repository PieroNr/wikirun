const CACHE = 'wikiroad-v1'
const STATIC = ['/', '/manifest.webmanifest', '/favicon.ico', '/icon']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = e.request.url
  // Laisser passer : Supabase, Wikipedia, requêtes non-GET
  if (
    e.request.method !== 'GET' ||
    url.includes('supabase') ||
    url.includes('wikipedia') ||
    url.includes('realtime')
  ) {
    return
  }
  // Network-first pour les pages Next.js, cache-first pour les assets statiques
  if (url.includes('/_next/static/') || url.includes('/favicon') || url.includes('/icon')) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      }))
    )
  }
})
