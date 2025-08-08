# Service Worker が動画/開発環境に与える干渉の排除 要件定義仕様書

作成日: 2025-08-08
対象: BeatNexus.Final（Vite + React + TS）
準拠: docs/BeatNexus.md（開発ルール）

## 1. 背景と目的
- 症状:
  - sw.js の fetch でエラー多発（[SW] Fetch failed）。
  - /@vite, /node_modules/.vite, /vite/dist/client, /@react-refresh など HMR 系リソースに SW が介入。
  - 動画再生前に「動画の読み込みに失敗しました」発生（iOS で顕著）。Range リクエストが SW で妨害される可能性。
- 目的:
  - 開発環境では SW を無効化し、HMR を正常化。
  - 本番でも動画の Range リクエスト/ストリーミング系を SW が妨害しないことを保証。
  - 既存 SW のバージョン管理・更新と、古い SW の廃止を確実に行う。

## 2. 対象範囲
- フロント:
  - SW 登録処理（registerSW.js / main.tsx）
  - sw.js（fetch ハンドラ、インストール/アクティベーション）
- 非対象（本仕様では提案のみ）:
  - 動画配信基盤（HLS 化等）の実装詳細は別仕様（提案A）

## 3. 用語
- DEV: import.meta.env.DEV が true の開発環境（localhost など）
- PROD: import.meta.env.PROD が true の本番/プレビュー環境

## 4. 機能要件（Requirements）
- RQ-01: DEV では SW を登録しない。
- RQ-02: DEV で既に登録済みの SW があれば起動時に unregister（人手/自動）できるガイド/処理を用意。
- RQ-03: sw.js の fetch で以下は即時バイパス（介入しない）:
  - RQ-03-1: request.method !== 'GET'
  - RQ-03-2: request.headers に Range を含む（部分取得は network-first 固定）
  - RQ-03-3: HMR/Vite 系パス（例）
    - /@vite, /@react-refresh, /vite/dist/client, /__vite_ping, /node_modules/.vite
  - RQ-03-4: request.destination が 'video' or 'audio' のメディア取得
- RQ-04: キャッシュ戦略
  - RQ-04-1: ハッシュ付き静的アセット（.css/.js/.png など）は CacheFirst。
  - RQ-04-2: HTML は NetworkFirst（オフライン時は最後のキャッシュを返す）。
  - RQ-04-3: API/JSON は StaleWhileRevalidate（任意）。
  - RQ-04-4: 動画/音声は原則キャッシュ対象外（Range 破壊を避ける）。
- RQ-05: バージョニング
  - SW_VERSION を明示し、更新で skipWaiting + clientsClaim を実施。
- RQ-06: テレメトリ
  - 重大イベント（activate、fetch バイパス理由、エラー）を console.info で最小限ログ化（本番デバッグ用）。
- RQ-07: セキュリティ/互換
  - CORS/Accept-Ranges/206 が期待どおり通ることを阻害しない。

## 5. 非機能要件
- NFR-01: DEV/PROD での初回ロード差分は 300ms 以内。
- NFR-02: 動画再生前エラー発生率 ≦ 1%（SW 起因）。
- NFR-03: HMR 安定（エラー 0、再接続不要）。

## 6. 実装仕様（詳細）
### 6.1 登録ガード（DEV 未登録）
- main.tsx（または registerSW.js）側で:
  - 条件: `if (import.meta.env.PROD && 'serviceWorker' in navigator) { register }`。
  - DEV の場合は何もしない。

参考コード（登録側）:
```ts
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => {
      console.error('[SW] register failed', e);
    });
  });
} else {
  // DEV: 既存 SW が残っている場合に備えて明示的に解除を案内/実施（任意）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
      console.info('[SW] Unregistered all in DEV');
    });
  }
}
```

### 6.2 sw.js（インストール/アクティベート）
- install: 事前キャッシュを最小限（ハッシュ付き静的のみ）
- activate: `self.skipWaiting()`、`clients.claim()` を実行

```js
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.info('[SW] activated');
});
```

### 6.3 sw.js（fetch バイパス）
- 早期 return 条件:
  - method !== GET
  - Range ヘッダあり（部分取得）
  - HMR/Vite 系パス
  - destination が video/audio

```js
const isHmrPath = (url) => {
  return url.pathname.startsWith('/@vite')
    || url.pathname.startsWith('/@react-refresh')
    || url.pathname.startsWith('/vite/dist/client')
    || url.pathname.startsWith('/__vite_ping')
    || url.pathname.startsWith('/node_modules/.vite');
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isBypass = req.method !== 'GET'
    || req.headers.has('range')
    || isHmrPath(url)
    || req.destination === 'video'
    || req.destination === 'audio';

  if (isBypass) {
    // 介入しない（そのままネットワークへ）
    return; // default fetch
  }

  // 以降のみキャッシュ戦略適用
  if (req.destination === 'document') {
    // NetworkFirst の例
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        return fresh;
      } catch (e) {
        const cache = await caches.open('html-cache-v1');
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        throw e;
      }
    })());
    return;
  }

  // ハッシュ付き静的（拡張子・命名規則で判定して CacheFirst）例:
  if (/(assets\/.*\.[a-f0-9]{8,}\.\w+)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open('assets-v1');
      const cached = await cache.match(req);
      if (cached) return cached;
      const resp = await fetch(req);
      if (resp.ok) cache.put(req, resp.clone());
      return resp;
    })());
    return;
  }

  // それ以外は基本 NetworkFirst or Pass-through
});
```

### 6.4 旧 SW の解除フロー（利用者ガイド）
- DEV:
  1) ブラウザ DevTools > Application > Service Workers > Unregister
  2) ハードリロード（キャッシュ消去）
- 自動（任意）:
  - DEV で getRegistrations().unregister() を起動時に実行（6.1参照）

### 6.5 キャッシュ命名/バージョン
- `assets-v1`, `html-cache-v1` など明示的に付与。
- 変更があれば `v2` へ更新し、古いキャッシュを activate 時に削除（必要なら）。

### 6.6 ログ/監視
- `console.info('[SW] ...')` で最小限の状況を出力。
- 重大な fetch エラー件数を Release 初期のみ観測（Sentry 連携は任意）。

## 7. 受け入れ基準（Acceptance Criteria）
- AC-01: DEV で SW が登録されない（Application タブで未登録）。
- AC-02: HMR が安定し、/@vite や /@react-refresh が SW を経由しない。
- AC-03: 動画の Range リクエストが 206 で成功（SW を経由しない）。
- AC-04: 本番で静的アセットはキャッシュヒット、HTML はネットワーク優先。
- AC-05: 既存の「動画読み込み失敗」頻度が減少（SW 起因の失敗が 0）。

## 8. テスト計画
- DEV:
  - SW 未登録確認、ログに Unregistered 出力。
  - HMR 通信が 200/WS 正常。
- 動画:
  - A/B 両動画でネットワークパネルの Request/Response を確認（Range/206）。
  - iOS 実機で連続再生時に SW 由来のエラーが発生しない。
- 本番:
  - デプロイ後、SW の activate ログ確認。
  - 静的アセットが CacheFirst、HTML は NetworkFirst を満たす。

## 9. リリース/ロールバック
- リリース: feature/disable-sw-interference ブランチ → PR → 本番
- ロールバック: sw.js 登録ガードのみ戻す、または SW 無効化で応急対応

## 10. 変更予定ファイル
- `src/main.tsx`（または `registerSW.js`）: DEV ガード/自動 unregister
- `sw.js`: fetch バイパス/戦略/バージョニング/ログ

## 11. 補足
- 本仕様は動画再生の SW 干渉排除に限定。HLS 化/配信設計は別仕様で管理。
