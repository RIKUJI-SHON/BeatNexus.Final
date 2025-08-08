# MP4パイプライン最適化 + 単一アクティブ動画制御 要件定義

参照: docs/BeatNexus.md（全体ガイドライン遵守）

1. 背景と目的
- iOSでのMP4再生失敗率低減（目標: 1%以下）
- 既存MP4での安定化、短期・低コストでの改善
- Service Worker干渉排除後の追加安定化策

2. 成功基準（KPI）
- iOS Safariでの初回再生失敗率 ≤ 1%
- リトライ成功率 ≥ 80%
- HMR/開発体験の劣化なし

3. 配信/ヘッダ要件（バックエンド/オリジン/CDN）
- Content-Type: video/mp4
- Accept-Ranges: bytes（部分取得有効化）
- 206 Partial Content + 正しい Content-Range
- CORS: Access-Control-Allow-Origin: https://beatnexus.app
- Cache-Control: public, immutable（適切なmax-age）
- 備考: これらは配信レイヤ（Supabase Storage / S3+CloudFront等）で設定。

4. エンコード要件（運用/バッチ）
- ffmpeg: -movflags +faststart（moov atom先頭）
- 標準化: H.264 Baseline/High, AAC-LC, キーフレーム間隔2s程度
- 参考: 既存アセットは順次再エンコード/faststart適用対象

5. フロントエンド要件
5.1 単一アクティブ動画制御
- 同時にアクティブ（デコーダ占有）な<video>は1つのみ
- ある動画の再生開始時に他方を即時停止・src解除・load()でデコーダ解放
- 非アクティブ化された動画はユーザー操作で再ロード可能

5.2 iOS最適化
- preload='none' を基本（既存方針を継続）
- 2本目の動画はユーザー操作でのみ load() → play()（既存プレースホルダーを活用）
- 将来オプション: 1本目もユーザー操作必須化（段階導入）

5.3 エラーハンドリング
- onErrorで自動リトライ1回（300〜800msの指数バックオフ）
- 失敗時は「別ページで再生」リンク表示（target=_blank, rel=noopener）

5.4 UX不変ルール
- レイアウト/色/フォント/間隔は変更しない
- 既存のプレースホルダーデザインを流用

6. 実装詳細
6.1 シングルトン管理モジュール（src/utils/singleActiveVideo.ts）
- 登録/解除、アクティブ切替、他インスタンスへのブロードキャスト
- window CustomEvent('BNX_VIDEO_ACTIVATE', {detail:{id}})

6.2 コンポーネント改修（OptimizedVideoPlayer）
- onPlay開始時に自分をアクティブ宣言 → 他をデタッチ
- デタッチ要求受信時は pause(), removeAttribute('src'), load(), 内部state(attached=false)
- attached=false時は既存のiOS用プレースホルダーUIを流用し、クリックで再アタッチ
- onError時は1回のみ自動リトライ。2回目以降は外部再生リンク提示

7. テスト
- iOS Safari/ChromeでA/Bの切替再生: 片方再生で他方が即座に停止・解放
- Range/206確認（Network面）
- リトライ動作: 一度意図的にネットワーク遮断→復帰
- HMR: 開発時にSW未登録/干渉なし

8. ロールアウト
- 影響範囲はフロントのみ（配信ヘッダは別途Ops）
- 段階導入（まずは2本目のクリック必要運用を継続）

9. リスクと緩和
- 既存挙動変更の最小化: UI/UXは不変、2本目プレースホルダー継続
- 外部配信ヘッダ未整備時は失敗する可能性 → Opsチェックリスト提供

10. 運用メモ
- 動画追加時のffmpeg faststart適用を徹底
- 重大エラー時は一時的に片方のみ表示運用も可能

11. 変更点トレーサビリティ
- docs/BeatNexus.md 準拠
- .cursor/docs/dev-rules に実装ログ作成
