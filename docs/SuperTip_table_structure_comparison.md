# SuperTip テーブル構造比較 (開発環境 vs 本番環境)

## 📅 作成日: 2025年1月18日
## 🎯 目的: 開発環境と本番環境のSuperTip関連テーブル構造の違いを分析

---

## 🔍 **発見された主要な問題**

開発環境と本番環境でSuperTip関連のテーブル構造が大きく異なっており、これが機能不正の原因となっています。

---

## 📊 **1. super_tips テーブルの比較**

### 🟢 **開発環境** (wdttluticnlqzmqmfvgt)
```sql
CREATE TABLE super_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ユーザー関連
  voter_user_id UUID REFERENCES auth.users(id),
  supported_player_user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- バトル関連
  active_battle_id UUID REFERENCES active_battles(id),
  archived_battle_id UUID REFERENCES archived_battles(id),
  
  -- 金額情報
  amount_jpy INTEGER NOT NULL CHECK (amount_jpy >= 100),
  
  -- 決済情報
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_account_id TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  
  -- メタデータ
  metadata JSONB DEFAULT '{}',
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 🔴 **本番環境** (qgqcjtjxaoplhxurbpis)
```sql
CREATE TABLE super_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ユーザー関連
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  
  -- バトル関連
  battle_id UUID NOT NULL REFERENCES active_battles(id),
  
  -- 投票情報
  vote CHAR(1) CHECK (vote IN ('A', 'B')) NOT NULL,
  comment TEXT NOT NULL CHECK (LENGTH(comment) <= 500),
  
  -- 金額情報
  amount INTEGER NOT NULL CHECK (amount >= 100 AND amount <= 10000),
  platform_fee INTEGER NOT NULL DEFAULT 0,
  recipient_amount INTEGER NOT NULL DEFAULT 0,
  
  -- 決済情報
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id TEXT,
  
  -- ステータス
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

---

## 📊 **2. battle_votes テーブルの比較**

### 🟢 **開発環境**
```sql
-- SuperTip関連フィールド
super_tip_amount INTEGER DEFAULT 0 CHECK (super_tip_amount IS NULL OR super_tip_amount >= 100),
stripe_payment_intent_id TEXT,
payment_status TEXT DEFAULT 'none' 
  CHECK (payment_status IN ('none', 'pending', 'completed', 'failed'))
```

### 🔴 **本番環境**
```sql
-- SuperTip関連フィールド
super_tip_amount INTEGER DEFAULT 0,
stripe_payment_intent_id TEXT,
payment_status TEXT DEFAULT 'none' 
  CHECK (payment_status IN ('none', 'pending', 'completed', 'failed'))
```

---

## 📊 **3. archived_battle_votes テーブルの比較**

### 🟢 **開発環境**
```sql
-- SuperTip関連フィールド
super_tip_amount INTEGER CHECK (super_tip_amount IS NULL OR super_tip_amount >= 100),
stripe_payment_intent_id TEXT,
payment_status TEXT CHECK (payment_status IS NULL OR payment_status IN ('pending', 'succeeded', 'failed', 'canceled')),
has_super_tip BOOLEAN DEFAULT FALSE
```

### 🔴 **本番環境**
```sql
-- SuperTip関連フィールド
super_tip_amount INTEGER DEFAULT 0,
stripe_payment_intent_id TEXT,
payment_status TEXT DEFAULT 'none' 
  CHECK (payment_status IN ('none', 'pending', 'completed', 'failed'))
```

---

## ⚠️ **主要な違いの詳細分析**

### 🔄 **1. カラム名の違い**
| 項目 | 開発環境 | 本番環境 |
|------|----------|----------|
| 送信者 | `voter_user_id` | `sender_id` |
| 受取者 | `supported_player_user_id` | `recipient_id` |
| 金額 | `amount_jpy` | `amount` |
| 決済状態 | `payment_status` | `status` |

### 🔄 **2. スキーマ設計の違い**
| 機能 | 開発環境 | 本番環境 |
|------|----------|----------|
| バトル参照 | 分離 (`active_battle_id` / `archived_battle_id`) | 統合 (`battle_id`) |
| 投票情報 | 別テーブル | 同テーブル内 (`vote`, `comment`) |
| 手数料計算 | 実装なし | 実装済み (`platform_fee`, `recipient_amount`) |
| Stripe情報 | `stripe_account_id` | `stripe_transfer_id` |

### 🔄 **3. 制約・デフォルト値の違い**
- **金額上限**: 開発環境は無制限、本番環境は¥10,000上限
- **ステータス値**: 開発環境は5つ、本番環境は4つ
- **必須フィールド**: 本番環境は `vote`, `comment` が必須

---

## 🎯 **推奨アクション**

### 1. **統一すべき構造**
開発環境のより柔軟な設計を基準とし、本番環境を開発環境に合わせることを推奨します。

### 2. **マイグレーション戦略**
1. 本番環境の既存データを保持しながら構造変更
2. データマッピング:
   - `sender_id` → `voter_user_id`
   - `recipient_id` → `supported_player_user_id`
   - `amount` → `amount_jpy`
   - `status` → `payment_status`
3. 新しいカラムの追加:
   - `stripe_account_id`
   - `metadata`
   - バトル参照の分離

### 3. **データ整合性の確保**
- 既存のSuperTipデータの移行
- 外部キー制約の再設定
- アプリケーションコードとの整合性確認

---

## 📝 **次のステップ**
1. ✅ 構造比較完了
2. 🔄 マイグレーションSQL作成
3. 🔄 開発環境でのテスト実行
4. 🔄 本番環境への適用
5. 🔄 完全仕様書の更新

---

## 🚨 **注意事項**
- 本番環境への適用前に必ずバックアップを取得
- マイグレーション中のダウンタイムを最小化
- 既存データの損失防止策を実装
