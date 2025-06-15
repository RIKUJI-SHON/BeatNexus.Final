// PWA Service Worker for BeatNexus
const CACHE_NAME = 'beatnexus-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/bn_icon_192.png',
  '/bn_icon_512.png'
];

// エラーハンドリング
const handleError = (context, error) => {
  console.error(`[SW] ${context}:`, error);
};

// Install event - PWA要件を満たす
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    Promise.resolve()
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => {
        console.log('[SW] Opened cache:', CACHE_NAME);
        
        // 重要なアセットを確実にキャッシュ
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
        // PWA要件: 即座にアクティベート
        return self.skipWaiting();
      })
      .catch((error) => {
        handleError('Installation', error);
      })
  );
});

// Activate event
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
        // PWA要件: 全クライアントを制御
        return self.clients.claim();
      })
      .catch((error) => {
        handleError('Activation', error);
      })
  );
});

// Fetch event - Network First策略（PWA要件）
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
            
            // ナビゲーションの場合はindex.htmlを返す（PWA要件）
            if (event.request.mode === 'navigate') {
              return caches.match('/').then((indexResponse) => {
                return indexResponse || new Response(
                  '<!DOCTYPE html><html><head><title>BeatNexus - Offline</title></head><body><h1>オフライン</h1><p>インターネット接続を確認してください。</p></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
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

// PWA Installability Event
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('[SW] Before install prompt triggered');
  // デフォルトの動作を防ぐ
  event.preventDefault();
  
  // プロンプトを保存
  self.deferredPrompt = event;
  
  // アプリにイベントを送信
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'BEFORE_INSTALL_PROMPT',
        canInstall: true
      });
    });
  });
});

// App Installed Event
self.addEventListener('appinstalled', (event) => {
  console.log('[SW] App was installed');
  
  // アプリにイベントを送信
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'APP_INSTALLED'
      });
    });
  });
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
    
    if (event.data?.type === 'SHOW_INSTALL_PROMPT') {
      if (self.deferredPrompt) {
        self.deferredPrompt.prompt();
        self.deferredPrompt.userChoice.then((choiceResult) => {
          console.log('[SW] User choice:', choiceResult.outcome);
          self.deferredPrompt = null;
        });
      }
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