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
  
  // Vite開発サーバーのnode_modulesやチャンクファイルは処理しない
  const url = new URL(event.request.url);
  if (url.pathname.includes('/node_modules/') || 
      url.pathname.includes('/.vite/') ||
      url.pathname.includes('/chunk-') ||
      url.search.includes('v=')) {
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
      .catch((error) => {
        console.warn('[SW] Fetch failed:', error);
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

// Push notification event - プッシュ通知受信
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  try {
    let notificationData = {
      title: 'BeatNexus 通知',
      body: 'プッシュ通知を受信しました',
      icon: '/bn_icon_192.png',
      badge: '/bn_icon_192.png',
      data: {}
    };

    // ペイロードがある場合は解析
    if (event.data) {
      try {
        const payload = event.data.json();
        notificationData = {
          ...notificationData,
          ...payload
        };
      } catch (error) {
        console.warn('[SW] Failed to parse push payload:', error);
        notificationData.body = event.data.text() || notificationData.body;
      }
    }

    // 通知を表示
    event.waitUntil(
      self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        data: notificationData.data,
        actions: notificationData.actions || [],
        requireInteraction: false,
        tag: notificationData.data?.type || 'general', // 同タイプの通知は置き換える
        renotify: true
      })
    );
  } catch (error) {
    handleError('Push notification', error);
  }
});

// Notification click event - 通知クリック
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  
  try {
    // 通知を閉じる
    event.notification.close();

    const notificationData = event.notification.data || {};
    const targetUrl = notificationData.url || '/';
    
    // アクションボタンがクリックされた場合
    if (event.action) {
      console.log('[SW] Notification action clicked:', event.action);
      // アクションに応じた処理（現在は view のみ）
    }

    // ウィンドウを開くかフォーカス
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          // 既に対象URLが開かれているかチェック
          const targetClient = clients.find(client => {
            const clientUrl = new URL(client.url);
            const targetUrlObj = new URL(targetUrl, self.location.origin);
            return clientUrl.pathname === targetUrlObj.pathname;
          });

          if (targetClient) {
            // 既存のタブにフォーカス
            return targetClient.focus();
          } else {
            // 新しいタブを開く
            const fullUrl = new URL(targetUrl, self.location.origin).href;
            return self.clients.openWindow(fullUrl);
          }
        })
        .catch((error) => {
          handleError('Notification click handling', error);
          // エラー時はホームページを開く
          return self.clients.openWindow('/');
        })
    );
  } catch (error) {
    handleError('Notification click', error);
  }
});

// Push subscription change event - 購読情報変更
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  event.waitUntil(
    // 新しい購読を取得して再登録
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'BIqUQJtbziGnenLraVzJ0Du0TA5_RXchfdbKL0BsSjPWbuyNYkNnCw7bRVbolMW-hXpxKZwuWoWpgX2WjO9P0xk' // VAPID公開鍵
    })
    .then((newSubscription) => {
      console.log('[SW] New push subscription:', newSubscription);
      
      // フロントエンドに新しい購読情報を送信
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: newSubscription.toJSON()
          });
        });
      });
    })
    .catch((error) => {
      handleError('Push subscription change', error);
    })
  );
});

// エラーイベント
self.addEventListener('error', (event) => {
  handleError('Global error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  handleError('Unhandled rejection', event.reason);
});

console.log('[SW] Service Worker script loaded successfully with push notification support'); 