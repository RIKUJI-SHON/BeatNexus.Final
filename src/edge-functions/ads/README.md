# Ads Edge Functions (Scaffold)

目的: 配信 (serve) および計測 (track) の最小エンドポイントを Edge Functions で提供し、フロントから安全に広告表示/イベント計測を行う。

## 構成方針
- ad-serve: placementKey + user context を受け取り 1 クリエイティブ候補を返す (No Fill 時 204 or JSON {code: 'AD_NO_FILL'})
- ad-track: impression / click を token 検証後に記録
- HS256 JWS: `AD_JWS_SECRET` 環境変数を使用 (Rotation 後続)
- 重複防止: インメモリ LRU (Map + TTL) 初期実装

## 次タスク
1. `lib/jws.ts` 署名/検証ユーティリティ
2. `ad-serve/index.ts` クエリ + 重み付き選択 (weight) 実装
3. `ad-track/index.ts` token 検証 + イベント種別分岐
4. 単体テスト (weight 比率, token 改ざん, 重複防止)
