/* Service worker của Nhật Ký Tài Chính
 * - Lưu sẵn toàn bộ file của bản build -> mở app tức thì, dùng được cả khi mất mạng.
 * - Bản mới được tải ngầm rồi chờ; app hiện thông báo "Cập nhật" để người dùng chủ động tải lại.
 * - Không đụng tới dữ liệu nhật ký (localStorage).
 * vite.config.ts thay BUILD_ID và PRECACHE khi build (xem plugin serviceWorker).
 */
const BUILD_ID = '__BUILD_ID__';
const PRECACHE = self.__PRECACHE__;

const CACHE_PREFIX = 'nktc-app-';
const APP_CACHE = CACHE_PREFIX + BUILD_ID;
const FONT_CACHE = 'nktc-fonts-v1';
const SCOPE = self.registration.scope;
const SHELL_URL = SCOPE; // "./" trả về index.html

// Response bị chuyển hướng không được dùng cho điều hướng trang -> tạo bản sạch
async function clean(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      await Promise.all(
        PRECACHE.map(async (path) => {
          const url = path === 'index.html' ? SHELL_URL : new URL(path, SCOPE).href;
          const response = await fetch(new Request(url, { cache: 'reload' }));
          if (!response.ok) throw new Error(`Không tải được ${url} (${response.status})`);
          await cache.put(url, await clean(response));
        }),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// App gửi lệnh này khi người dùng bấm "Cập nhật"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

  const url = new URL(request.url);

  // Font Google: file font không đổi -> cache-first; file CSS -> dùng bản cũ, cập nhật ngầm
  if (url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }
  if (url.origin === 'https://fonts.googleapis.com') {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  if (url.origin !== self.location.origin || !request.url.startsWith(SCOPE)) return;

  // Mở trang -> luôn trả về giao diện đã lưu (kể cả có ?quick=..., #/funds)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(SHELL_URL, { cacheName: APP_CACHE });
        return cached || fetch(request);
      })(),
    );
    return;
  }

  // File tĩnh của bản build: lấy từ bộ nhớ đệm, thiếu thì tải mạng
  event.respondWith(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && url.pathname.includes('/assets/')) cache.put(request, response.clone());
      return response;
    })(),
  );
});
