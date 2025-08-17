# 電話番号認証（SMS OTP）仕様書

最終更新: 2025-08-17
対象ブランチ: develop

## 1. 目的
海外（特にシンガポール +65）を含むグローバルユーザーに対し、E.164 形式での安定した SMS ワンタイムパスコード(OTP)認証を提供する。既存の日本前提ヒューリスティック（先頭 0 を +81 に置換等）を廃止し、フロントエンド・バックエンド双方で一貫した正規化/検証を行うことで、誤送信・未達・重複登録を防止する。

## 2. 全体アーキテクチャ概要
- クライアント: React (AuthModal) が国番号 + ローカル番号入力 → E.164 生成 → Edge Function 呼出し
- Edge Function (Deno / Supabase): `phone-verification-v2`
  - action = send_code: Twilio Verify API で OTP 送信
  - action = verify_code: Twilio Verify API でコード検証 + Supabase DB 反映
- DB: Supabase Postgres
  - カスタム RPC: `check_phone_availability`, `record_phone_verification`
  - profiles テーブルへ電話番号/認証状態格納（想定）
- 外部サービス: Twilio Verify Service (SMS)

## 3. 構成要素とファイル
| 種別 | パス | 概要 |
|------|------|------|
| Edge Function | `supabase/functions/phone-verification-v2/index.ts` | 本番候補の新実装 (E.164 厳格) |
| Edge Config | `supabase/functions/phone-verification-v2/config.toml` | `verify_jwt = false` 設定（現状プラットフォーム側で未反映事象あり） |
| 旧 Function | `supabase/functions/phone-verification/` | レガシー（フォールバック用に保持） |
| フロント | `src/components/auth/AuthModal.tsx` | v2 を優先、401 等で旧 slug へフォールバック |
| 運用ログ | `docs/dev-rules/2025-08-17_phone_verification_deploy_attempt_phase1.mdc` | デプロイ試行・判断ログ |

## 4. データフロー
### 4.1 OTP 送信 (send_code)
1. ユーザー: 国番号(例 +65) + ローカル番号入力 → フロントで数字正規化（空白/ハイフン除去）
2. フロント: `phoneNumber` を E.164 (`+` + 国番号 + 数字) 形式で構築
3. `fetch /functions/v1/phone-verification-v2` (POST JSON: `{action:"send_code", phoneNumber:"+65XXXXXXXX"}`)
4. Edge Function:
   - Regex `^\+[1-9]\d{5,14}$` で形式検証
   - `check_phone_availability` RPC で未登録/再利用可否判定（重複→409）
   - Twilio Verify API (Start) 呼出し → 成功 200 JSON `{status:"pending"}`
5. Twilio: SMS 送信
6. ユーザー: SMS 受信

### 4.2 OTP 検証 (verify_code)
1. フロント: 受信した 6 桁コードを入力 → POST `{action:"verify_code", phoneNumber:"+65...", code:"123456"}`
2. Edge Function:
   - E.164 再検証
   - Twilio Verify API (Check) でステータス取得 → approved か判定
   - 成功時: `record_phone_verification` / profiles 更新
   - レスポンス 200 `{verified:true}`
3. フロント: 成功 UI 遷移 / セッション更新

## 5. エンドポイント仕様
| 項目 | 値 |
|------|----|
| ベース URL (開発) | `https://<project>.supabase.co/functions/v1/phone-verification-v2` |
| メソッド | POST (JSON) |
| Content-Type | application/json |
| 認証 | 現在: Supabase セッション (JWT) 必要。`config.toml` の `verify_jwt=false` が未反映のため 401 を回避するにはログイン状態が前提。 |

### 5.1 リクエストボディ
```
// send_code
{ "action": "send_code", "phoneNumber": "+65XXXXXXXX" }

// verify_code
{ "action": "verify_code", "phoneNumber": "+65XXXXXXXX", "code": "123456" }
```

### 5.2 レスポンス（代表例）
| アクション | 成功 | 失敗（例） |
|------------|------|-----------|
| send_code | `{"status":"pending"}` | 400 `{error:"INVALID_FORMAT"}` / 409 `{error:"PHONE_IN_USE"}` / 500 `{error:"TWILIO_ERROR"}` |
| verify_code | `{"verified":true}` | 400 `{error:"INVALID_FORMAT"}` / 400 `{error:"CODE_INVALID"}` / 500 `{error:"TWILIO_ERROR"}` |

## 6. バリデーション
| 項目 | ルール | 実装場所 |
|------|--------|----------|
| 形式 | `^\+[1-9]\d{5,14}$` | Edge Function `validateE164` |
| 重複 | RPC `check_phone_availability` | Edge (send_code 前) |
| コード | 6 桁（Twilio Verify 側管理） | Twilio + Edge (verify_code) |

## 7. エラーハンドリング & マッピング
| カテゴリ | 例 | 返却コード | `error` 値 | 備考 |
|----------|----|-----------|-----------|------|
| 入力形式 | 桁不足/非数字 | 400 | `INVALID_FORMAT` | 即時終了 |
| 重複 | 既登録番号 | 409 | `PHONE_IN_USE` | 再利用ポリシーに合わせ調整可 |
| Twilio Verify Start | ネットワーク/権限 | 500 | `TWILIO_ERROR` | ログで Twilio status/Code |
| Twilio Verify Check | 不正コード | 400 | `CODE_INVALID` | 再試行残回数 UX はフロント側で管理可 |
| 認証(verify_jwt) | 未ログイン | 401 | (フロントで fallback) | v2 失敗→ legacy 呼出し |

## 8. フォールバック戦略
- フロントは v2 → 401 場合 `phone-verification` (旧) を再試行。
- console.warn ログで発生監視: `phone-verification-v2 unauthorized; falling back...`
- 移行完了判定: 連続数日 fallback 0 件。

## 9. セキュリティ
| 項目 | 状態 | 今後 |
|------|------|------|
| JWT 検証 | 有効（意図せず） | `verify_jwt=false` の反映調査（必要なら slug 再デプロイ形式） |
| レート制限 | 未実装 | KV もしくは Postgres カウンタ + Edge で秒/日制限 |
| 電話番号マスキング | ログ出力時に末尾4桁のみ表示推奨 | 実装要（軽微パッチ） |
| 冪等性 | Twilio Verify が内部管理 | OK |
| 重複送信間隔 | なし | 最短再送クールダウン(例 30s) を検討 |

## 10. ログ設計（推奨）
| フィールド | 例 | 備考 |
|------------|----|------|
| event | send_code / verify_code | 種別 |
| phone_mask | +65****4567 | マスキング済 |
| twilio_phase | start / check | Twilio 呼出し段階 |
| twilio_status | pending / approved / denied | Verify API 結果 |
| error_code | 21408 等 | Twilio エラー時 |
| elapsed_ms | 123 | 計測で遅延分析 |

## 11. 品質保証テストシナリオ
| ID | シナリオ | 入力 | 期待結果 |
|----|----------|------|----------|
| TC01 | 正常送信(日本) | +8190... | 200 pending |
| TC02 | 正常送信(SG) | +6591... | 200 pending (実ユーザー協力) |
| TC03 | フォーマット不正 | +0123 | 400 INVALID_FORMAT |
| TC04 | 重複番号 | 既登録 | 409 PHONE_IN_USE |
| TC05 | コード不一致 | 正しい番号+誤コード | 400 CODE_INVALID |
| TC06 | 未ログイン送信 | (セッションなし) | 401 → fallback 経由動作 |

## 12. 運用手順（SG ユーザ実地テスト）
1. 本番へ `phone-verification-v2` デプロイ（legacy 併存）
2. ユーザーに手順共有（時刻/番号末尾4桁/遅延報告）
3. ログ監視し Twilio エラー有無確認
4. 必要に応じ Twilio コンソール Geo Permissions / Messaging Service を調整
5. 安定後 fallback 発生ゼロを確認し legacy 廃止計画

## 13. 既知の課題 / TODO
| 課題 | 内容 | 優先度 |
|------|------|--------|
| verify_jwt=false 未反映 | config.toml が効かず常に 401 | 中 |
| レート制限未実装 | スパム対策なし | 中 |
| ログ整備不足 | 現状最小ログ | 中 |
| 再送クールダウン | UX/コスト最適化 | 低 |

## 14. 将来拡張案
- マルチチャネル (SMS / WhatsApp 自動選択)
- 人為的リスク検知（同一IPからの大量試行ブロック）
- Twilio Lookup 事前検証で無効番号弾く
- hCaptcha/Recaptcha 追加（Bot 対策）

## 15. 変更履歴
| 日付 | 区分 | 内容 |
|------|------|------|
| 2025-08-17 | 新規 | v2 仕様初版作成 (E.164 厳格 / フォールバック戦略含む) |

---
以上。
