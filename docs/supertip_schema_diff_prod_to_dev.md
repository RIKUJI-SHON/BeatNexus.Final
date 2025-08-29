# SuperTip 関連スキーマ差分まとめ（Production → Development 揃え）

対象テーブル: super_tips, battle_votes, archived_battle_votes, profiles（確認のみ）

## super_tips
- 開発（dev）
  - カラム: id, voter_user_id(FK auth.users), active_battle_id(FK active_battles), archived_battle_id(FK archived_battles), supported_player_user_id(FK profiles), amount_jpy(int >= 100), stripe_payment_intent_id(text unique), stripe_account_id(text NOT NULL), payment_status(text: pending/processing/succeeded/failed/canceled), metadata(jsonb {}), created_at, updated_at
- 本番（prod）
  - カラム: id, battle_id(FK active_battles), sender_id(FK profiles), recipient_id(FK profiles), vote('A'/'B'), comment(text <= 500), amount(int 100–10000), platform_fee(int), recipient_amount(int), stripe_payment_intent_id(text unique), stripe_transfer_id(text), status(text: pending/completed/failed/cancelled), created_at, updated_at, completed_at
- 差分と移行方針
  - battle_id → active_battle_id にリネーム、archived_battle_id を追加
  - sender_id → voter_user_id（参照先を profiles→auth.users に変更）
  - recipient_id → supported_player_user_id（参照先は profiles のまま）
  - amount → amount_jpy（下限>=100。devでは上限制約なし）
  - status → payment_status（値の正規化: completed→succeeded, cancelled→canceled）
  - 追加: stripe_account_id(text, NOT NULL), metadata(jsonb)
  - 削除: platform_fee, recipient_amount, stripe_transfer_id, vote, comment, completed_at

## battle_votes
- 開発（dev）
  - カラム: id, battle_id, user_id NOT NULL(FK profiles→実体はauth.usersと同一UUID), vote('A'/'B'), created_at, comment, season_id, super_tip_amount(int, NULLまたは>=100), stripe_payment_intent_id(text), payment_status(text NULLまたは pending/succeeded/failed/canceled)
- 本番（prod）
  - カラム: id, battle_id, user_id, vote, created_at, comment, season_id, super_tip_amount(int デフォルト0), stripe_payment_intent_id(text), payment_status(text デフォルト'none'、許容: none/pending/completed/failed)
- 差分と移行方針
  - payment_status 値の正規化: completed→succeeded, none→NULL, cancelled→canceled（存在すれば）
  - payment_status のデフォルト 'none' を解除（NULL許容）し、許容値チェックを dev に合わせる
  - super_tip_amount のデフォルトを解除、NULLまたは>=100のチェックを追加

## archived_battle_votes
- 開発（dev）
  - カラム: id, archived_battle_id, user_id, vote('A'/'B'), comment, created_at, super_tip_amount(NULLまたは>=100), stripe_payment_intent_id, payment_status(NULLまたは pending/succeeded/failed/canceled), has_super_tip(boolean default false)
- 本番（prod）
  - カラム: id, archived_battle_id, user_id, vote, comment, created_at, super_tip_amount(int デフォルト0), stripe_payment_intent_id, payment_status(text デフォルト'none'、許容: none/pending/completed/failed)
- 差分と移行方針
  - has_super_tip を追加し、既存データから backfill（super_tip_amount>0 など）
  - payment_status 値の正規化とデフォルト解除、許容値チェックを dev に合わせる
  - super_tip_amount のデフォルト解除、NULLまたは>=100 のチェックを追加

## profiles（確認）
- dev/prod ともに: stripe_account_id(text), stripe_charges_enabled(boolean) あり → 差分なし

---

安全策
- 値の変換（status→payment_status 等）は新カラム追加→backfill→旧カラム削除の流れ
- 制約変更は IF EXISTS/IF NOT EXISTS を多用し、失敗時の影響を最小化
- 可能な限りトランザクションで一括実行
