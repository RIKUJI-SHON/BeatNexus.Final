// BeatNexus Service Worker - 動画/開発環境干渉排除対応
// 要件定義: docs/ServiceWorker_動画再生干渉排除_要件定義.md

const SW_VERSION = 'v5.0-video-interference-fix';
const CACHE_NAMES = {
  ASSETS: `beatnexus-assets-${SW_VERSION}`,
  HTML: `beatnexus-html-${SW_VERSION}`,
  API: `beatnexus-api-${SW_VERSION}`
};

// 最小限の静的アセット事前キャッシュ
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/bn_icon_192.png',
  '/bn_icon_512.png'
];

// HMR/Vite系パス判定（要件RQ-03-3）
const isHmrPath = (url) => {
  return url.pathname.startsWith('/@vite')
    || url.pathname.startsWith('/@react-refresh')
    || url.pathname.startsWith('/vite/dist/client')
    || url.pathname.startsWith('/__vite_ping')
    || url.pathname.startsWith('/node_modules/.vite')
    || url.pathname.includes('/chunk-')
    || url.search.includes('t='); // Vite HMR timestamp
};

// ハッシュ付き静的アセット判定
const isHashedAsset = (url) => {
  return /\/(assets\/.*\.[a-f0-9]{8,}\.\w+)$/.test(url.pathname)
    || /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)\?[a-f0-9]+$/.test(url.pathname);
};

// install イベント（要件RQ-05）
self.addEventListener('install', (event) => {
  console.info('[SW] Installing Service Worker version:', SW_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAMES.ASSETS)
      .then((cache) => {
        console.info('[SW] Opened cache:', CACHE_NAMES.ASSETS);
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.info('[SW] Precache completed');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// activate イベント（要件RQ-05）
self.addEventListener('activate', (event) => {
  console.info('[SW] Activating Service Worker version:', SW_VERSION);
  
  event.waitUntil(
    Promise.all([
      // 古いキャッシュを削除
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(name => !Object.values(CACHE_NAMES).includes(name))
            .map(name => {
              console.info('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // クライアントを制御
      self.clients.claim()
    ])
      .then(() => {
        console.info('[SW] Activation completed successfully');
      })
      .catch((error) => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// fetch イベント（要件RQ-03, RQ-04, RQ-07）
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 外部リソースは処理しない
  if (!req.url.startsWith(self.location.origin)) {
    return;
  }

  // バイパス条件チェック（要件RQ-03）
  const isBypass = req.method !== 'GET'                    // RQ-03-1
    || req.headers.has('range')                           // RQ-03-2: Range リクエスト
    || isHmrPath(url)                                     // RQ-03-3: HMR/Vite 系パス
    || req.destination === 'video'                        // RQ-03-4: 動画取得
    || req.destination === 'audio'                        // RQ-03-4: 音声取得
    || url.pathname.endsWith('.mp4')                      // 動画ファイル直接
    || url.pathname.endsWith('.webm')                     // 動画ファイル直接
    || url.pathname.endsWith('.m3u8')                     // HLS プレイリスト
    || url.pathname.endsWith('.ts');                      // HLS セグメント

  if (isBypass) {
    // バイパス理由をログ出力（要件RQ-06）
    const reason = req.method !== 'GET' ? 'non-GET'
      : req.headers.has('range') ? 'range-request'
      : isHmrPath(url) ? 'hmr-path'
      : (req.destination === 'video' || req.destination === 'audio') ? 'media-destination'
      : url.pathname.match(/\.(mp4|webm|m3u8|ts)$/) ? 'media-file'
      : 'unknown';
    
    console.info('[SW] Bypassing fetch for:', url.pathname, 'reason:', reason);
    return; // デフォルトのネットワーク取得
  }

  // キャッシュ戦略適用（要件RQ-04）
  
  // HTML は NetworkFirst（要件RQ-04-2）
  if (req.destination === 'document' || req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAMES.HTML)
              .then((cache) => cache.put(req, responseClone))
              .catch((error) => console.warn('[SW] HTML cache put failed:', error));
          }
          return response;
        })
        .catch(() => {
          // ネットワークエラー時はキャッシュから取得
          return caches.match(req).then((cached) => {
            if (cached) {
              console.info('[SW] Serving HTML from cache:', url.pathname);
              return cached;
            }
            // フォールバック: ルートページ
            return caches.match('/').then((indexPage) => {
              return indexPage || new Response(
                '<!DOCTYPE html><html><head><title>BeatNexus - Offline</title></head><body><h1>オフライン</h1><p>インターネット接続を確認してください。</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
          });
        })
    );
    return;
  }

  // ハッシュ付き静的アセットは CacheFirst（要件RQ-04-1）
  if (isHashedAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAMES.ASSETS)
        .then((cache) => {
          return cache.match(req).then((cached) => {
            if (cached) {
              console.info('[SW] Serving asset from cache:', url.pathname);
              return cached;
            }
            
            return fetch(req).then((response) => {
              if (response && response.ok) {
                cache.put(req, response.clone());
                console.info('[SW] Cached new asset:', url.pathname);
              }
              return response;
            });
          });
        })
        .catch((error) => {
          console.error('[SW] Asset cache error:', error);
          return fetch(req);
        })
    );
    return;
  }

  // API/JSON は StaleWhileRevalidate（要件RQ-04-3、任意）
  if (req.url.includes('/api/') || req.headers.get('accept')?.includes('application/json')) {
    event.respondWith(
      caches.open(CACHE_NAMES.API)
        .then((cache) => {
          return cache.match(req).then((cached) => {
            const fetchPromise = fetch(req).then((response) => {
              if (response && response.ok) {
                cache.put(req, response.clone());
              }
              return response;
            });

            return cached || fetchPromise;
          });
        })
        .catch(() => fetch(req))
    );
    return;
  }

  // その他は NetworkFirst
  event.respondWith(
    fetch(req)
      .catch(() => {
        return caches.match(req);
      })
  );
});

// PWA インストール関連
self.addEventListener('beforeinstallprompt', (event) => {
  console.info('[SW] Before install prompt triggered');
  event.preventDefault();
  self.deferredPrompt = event;
  
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'BEFORE_INSTALL_PROMPT',
        available: true
      });
    });
  });
});

self.addEventListener('appinstalled', () => {
  console.info('[SW] App installed successfully');
  self.deferredPrompt = null;
  
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'APP_INSTALLED'
      });
    });
  });
});

// メッセージハンドリング
self.addEventListener('message', (event) => {
  console.info('[SW] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
  
  if (event.data?.type === 'SHOW_INSTALL_PROMPT') {
    if (self.deferredPrompt) {
      self.deferredPrompt.prompt();
      self.deferredPrompt.userChoice.then((choiceResult) => {
        console.info('[SW] User choice:', choiceResult.outcome);
        self.deferredPrompt = null;
      });
    }
  }
});

console.info('[SW] Service Worker script loaded, version:', SW_VERSION);