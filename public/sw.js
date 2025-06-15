// Simple Service Worker for native PWA support
const CACHE_NAME = 'beatnexus-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/bn_icon_192.png',
  '/bn_icon_512.png',
  '/vite.svg'
];

// エラーハンドリング強化
const handleError = (context, error) => {
  console.error(`[SW] ${context}:`, error);
};

// Install event - より安全な実装
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    Promise.resolve()
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        
        // 個別にキャッシュを試行（より安全）
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url)
              .then(() => console.log(`[SW] Cached: ${url}`))
              .catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
          )
        );
      })
      .then(() => {
        console.log('[SW] Installation completed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        handleError('Installation', error);
      })
  );
});

// Activate event - シンプル化
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    Promise.resolve()
      .then(() => caches.keys())
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation completed successfully');
        return self.clients.claim();
      })
      .catch((error) => {
        handleError('Activation', error);
      })
  );
});

// Fetch event - エラーハンドリング強化
self.addEventListener('fetch', (event) => {
  // 外部リソースは処理しない
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // GET リクエストのみ処理
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 正常なレスポンスの場合のみキャッシュ
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone))
            .catch((error) => console.warn('[SW] Cache put failed:', error));
        }
        return response;
      })
      .catch(() => {
        // ネットワークエラー時はキャッシュから取得
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            
            // ナビゲーションの場合はindex.htmlを返す
            if (event.request.mode === 'navigate') {
              return caches.match('/') || new Response('Offline', { status: 503 });
            }
            
            // その他は404
            return new Response('Not found', { status: 404 });
          })
          .catch((error) => {
            handleError('Cache match', error);
            return new Response('Service unavailable', { status: 503 });
          });
      })
  );
});

// メッセージイベント
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  try {
    if (event.data?.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    
    if (event.data?.type === 'GET_VERSION') {
      event.ports[0]?.postMessage({ version: CACHE_NAME });
    }
  } catch (error) {
    handleError('Message handling', error);
  }
});

// エラーイベント
self.addEventListener('error', (event) => {
  handleError('Global error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  handleError('Unhandled rejection', event.reason);
});

console.log('[SW] Service Worker script loaded successfully'); 