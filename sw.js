// 예워니 맘마기록 - PWA Service Worker (오프라인 지원 & 독립 실행형 앱)
const CACHE_NAME = 'yewon-mamma-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './schema.js',
  './export.js',
  './supabase-client.js',
  './manifest.json',
  './sample/ye.jpg'
];

// 서비스 워커 설치 시 핵심 에셋 캐싱
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 우선(Network-First) 전략: 최신 데이터 우선 요청, 오프라인 시 캐시 활용
self.addEventListener('fetch', (e) => {
  // Supabase API 등 외부 API 요청은 캐시하지 않고 네트워크로 직행
  if (!e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // 성공적인 응답은 캐시 갱신
        if (response && response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시된 리소스 반환
        return caches.match(e.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
  );
});
