# Super Tips機能実装手順

**最終更新**: 2025年1月20日  
**前提条件**: 既存Super Tips関連の削除完了済み  
**対象環境**: 開発環境 → 本番環境

## 📋 実装ステータス

### ✅ **完了済み（前提条件）**
- [x] 既存Stripe webhook エンドポイント削除
- [x] 既存DBテーブル・関数削除  
- [x] 既存Edge Functions削除

### 🚀 **実装予定**
- [ ] Phase 1: データベース基盤構築
- [ ] Phase 2: Edge Functions実装
- [ ] Phase 3: フロントエンド実装
- [ ] Phase 4: 統合テスト・本番適用

---

## Phase 1: データベース基盤構築 💾

### 📝 **Step 1.1: マイグレーションファイル作成**

```bash
# ファイル作成
supabase/migrations/20250120120000_create_super_tips_system.sql
```

#### マイグレーション内容
```sql
-- 1. profilesテーブル拡張（Stripe Connect情報）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  stripe_connect_account_id text UNIQUE,
  stripe_charges_enabled boolean DEFAULT false;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect 
  ON profiles(stripe_connect_account_id) 
  WHERE stripe_connect_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_charges_enabled 
  ON profiles(stripe_charges_enabled) WHERE stripe_charges_enabled = true;

-- 2. super_tipsテーブル作成
CREATE TABLE IF NOT EXISTS public.super_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 関連情報
  battle_id uuid NOT NULL REFERENCES active_battles(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 投票情報
  vote char(1) NOT NULL CHECK (vote IN ('A', 'B')),
  comment text NOT NULL CHECK (LENGTH(TRIM(comment)) > 0 AND LENGTH(comment) <= 500),
  
  -- 金額情報（円単位）
  amount_jpy integer NOT NULL CHECK (amount_jpy >= 100 AND amount_jpy <= 10000),
  
  -- Stripe情報
  stripe_payment_intent_id text UNIQUE NOT NULL,
  stripe_transfer_id text,
  stripe_connect_account_id text NOT NULL,
  
  -- ステータス
  payment_status text NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled')),
  transfer_status text DEFAULT 'pending'
    CHECK (transfer_status IN ('pending', 'paid', 'failed')),
  
  -- タイムスタンプ
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  
  -- 制約
  UNIQUE(sender_user_id, battle_id) -- 1ユーザー1バトル1寄付制限
);

-- インデックス
CREATE INDEX idx_super_tips_battle_id ON super_tips(battle_id);
CREATE INDEX idx_super_tips_sender ON super_tips(sender_user_id);
CREATE INDEX idx_super_tips_recipient ON super_tips(recipient_user_id);
CREATE INDEX idx_super_tips_status ON super_tips(payment_status, transfer_status);
CREATE INDEX idx_super_tips_created_at ON super_tips(created_at);
CREATE INDEX idx_super_tips_stripe_payment ON super_tips(stripe_payment_intent_id);

-- 3. battle_votesテーブル拡張
ALTER TABLE public.battle_votes ADD COLUMN IF NOT EXISTS
  super_tip_id uuid REFERENCES super_tips(id) ON DELETE SET NULL,
  is_super_tip_vote boolean DEFAULT false;

-- インデックス追加  
CREATE INDEX IF NOT EXISTS idx_battle_votes_super_tip 
  ON battle_votes(super_tip_id) WHERE super_tip_id IS NOT NULL;

-- 4. RLS設定
ALTER TABLE super_tips ENABLE ROW LEVEL SECURITY;

-- 閲覧ポリシー
CREATE POLICY "Users can view relevant super tips" ON super_tips
  FOR SELECT USING (
    auth.uid() = sender_user_id OR 
    auth.uid() = recipient_user_id OR
    EXISTS (
      SELECT 1 FROM active_battles 
      WHERE active_battles.id = super_tips.battle_id 
      AND (active_battles.player1_user_id = auth.uid() OR active_battles.player2_user_id = auth.uid())
    )
  );

-- 作成ポリシー
CREATE POLICY "Authenticated users can create super tips" ON super_tips
  FOR INSERT WITH CHECK (auth.uid() = sender_user_id);

-- 更新ポリシー（システム用）
CREATE POLICY "System can update super tips" ON super_tips
  FOR UPDATE USING (true);

-- 5. トリガー関数
CREATE OR REPLACE FUNCTION update_super_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_super_tips_updated_at_trigger
  BEFORE UPDATE ON super_tips
  FOR EACH ROW EXECUTE FUNCTION update_super_tips_updated_at();

-- 6. シーズンポイント統合関数
CREATE OR REPLACE FUNCTION update_super_tip_vote_points(
  p_user_id uuid,
  p_season_id uuid,
  p_season_found boolean
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_vote_count_increment INTEGER := 3; -- コメント付き投票として+3
  v_season_vote_points_increment INTEGER := 0;
BEGIN
  -- シーズンがアクティブな場合のみシーズンポイント付与
  IF p_season_found AND p_season_id IS NOT NULL THEN
    v_season_vote_points_increment := 3;
    
    UPDATE public.profiles
    SET 
      vote_count = vote_count + v_vote_count_increment,
      season_vote_points = COALESCE(season_vote_points, 0) + v_season_vote_points_increment,
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- シーズン非アクティブ時は通算ポイントのみ
    UPDATE public.profiles
    SET 
      vote_count = vote_count + v_vote_count_increment,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object(
    'vote_count_added', v_vote_count_increment,
    'season_vote_points_added', v_season_vote_points_increment,
    'season_found', p_season_found
  );
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION update_super_tip_vote_points TO authenticated;
```

### 🔄 **Step 1.2: マイグレーション適用**

```bash
# 開発環境適用
mcp_supabase_apply_migration(
  project_id: 'wdttluticnlqzmqmfvgt',
  name: 'create_super_tips_system',
  query: [上記SQL内容]
)

# 動作確認
mcp_supabase_list_tables(project_id: 'wdttluticnlqzmqmfvgt')
```

### ✅ **Step 1.3: DB構造確認**

#### 確認項目
- [ ] `profiles` テーブルに新しいカラム追加確認
- [ ] `super_tips` テーブル作成確認
- [ ] `battle_votes` テーブル拡張確認
- [ ] RLSポリシー動作確認
- [ ] インデックス作成確認
- [ ] 関数実行権限確認

---

## Phase 2: Edge Functions実装 ⚡

### 📁 **Step 2.1: setup-super-tip-receiving**

```bash
# ファイル作成
supabase/functions/setup-super-tip-receiving/index.ts
```

#### 実装内容
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数チェック
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Stripe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ユーザー認証
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 既存Connect Accountチェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, stripe_charges_enabled')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_connect_account_id && profile?.stripe_charges_enabled) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ALREADY_SETUP',
          message: 'Super Tip受け取りは既に設定済みです' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stripe Connect Account作成
    const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-07-30.basil'
      },
      body: new URLSearchParams({
        'controller[fees][payer]': 'application',
        'controller[losses][payments]': 'application',
        'controller[stripe_dashboard][type]': 'express',
        'capabilities[transfers][requested]': 'true',
        'capabilities[card_payments][requested]': 'true',
        'business_type': 'individual',
        'country': 'JP',
        'metadata[platform]': 'BeatNexus',
        'metadata[user_id]': user.id,
        'metadata[purpose]': 'super_tips'
      })
    })

    const accountData = await accountResponse.json()

    if (!accountResponse.ok) {
      console.error('Stripe account creation failed:', accountData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'STRIPE_ACCOUNT_CREATION_FAILED',
          details: accountData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Account Links作成
    const accountLinkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-07-30.basil'
      },
      body: new URLSearchParams({
        'account': accountData.id,
        'refresh_url': `${FRONTEND_URL}/profile/stripe-connect?refresh=true`,
        'return_url': `${FRONTEND_URL}/profile/stripe-connect?success=true`,
        'type': 'account_onboarding'
      })
    })

    const accountLinkData = await accountLinkResponse.json()

    if (!accountLinkResponse.ok) {
      console.error('Account link creation failed:', accountLinkData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ACCOUNT_LINK_CREATION_FAILED',
          details: accountLinkData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DB更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        stripe_connect_account_id: accountData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update failed:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'PROFILE_UPDATE_FAILED',
          details: updateError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        account_id: accountData.id,
        onboarding_url: accountLinkData.url,
        message: 'Connect account作成成功。オンボーディングを開始してください。'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 📁 **Step 2.2: get-connect-account-status**

```bash
# ファイル作成
supabase/functions/get-connect-account-status/index.ts
```

#### 実装内容
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Stripe configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ユーザー認証
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DBからConnect Account ID取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, stripe_charges_enabled')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ 
          success: true,
          has_account: false,
          charges_enabled: false,
          details_submitted: false,
          requirements: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Stripeから最新状況取得
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${profile.stripe_connect_account_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2025-07-30.basil'
      }
    })

    const accountData = await accountResponse.json()

    if (!accountResponse.ok) {
      console.error('Stripe account retrieval failed:', accountData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'STRIPE_ACCOUNT_RETRIEVAL_FAILED',
          details: accountData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DB更新（charges_enabled同期）
    if (accountData.charges_enabled !== profile.stripe_charges_enabled) {
      await supabase
        .from('profiles')
        .update({ 
          stripe_charges_enabled: accountData.charges_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        has_account: true,
        account_id: profile.stripe_connect_account_id,
        charges_enabled: accountData.charges_enabled,
        details_submitted: accountData.details_submitted,
        requirements: {
          currently_due: accountData.requirements?.currently_due || [],
          eventually_due: accountData.requirements?.eventually_due || [],
          past_due: accountData.requirements?.past_due || []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'INTERNAL_SERVER_ERROR',
        message: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 📁 **Step 2.3: vote-with-super-tip**

```bash
# ファイル作成
supabase/functions/vote-with-super-tip/index.ts
```

#### 実装内容（主要部分）
```typescript
// ここには主要な投票+寄付処理ロジックを実装
// - バトル・ユーザー検証
// - 金額・コメント検証  
// - 重複チェック
// - アクティブシーズン確認
// - Payment Intent作成
// - super_tipsレコード作成
// - battle_votesレコード作成（season_id含む）
// - ユーザーポイント更新（update_super_tip_vote_points使用）
// - レスポンス返却
```

### 📁 **Step 2.4: confirm-super-tip-payment**

```bash
# ファイル作成  
supabase/functions/confirm-super-tip-payment/index.ts
```

### 📁 **Step 2.5: stripe-webhook**

```bash
# ファイル作成
supabase/functions/stripe-webhook/index.ts
```

### 🔄 **Step 2.6: Edge Functions デプロイ**

```bash
# 各関数をデプロイ
mcp_supabase_deploy_edge_function(
  project_id: 'wdttluticnlqzmqmfvgt',
  name: 'setup-super-tip-receiving',
  files: [...]
)

# 他の関数も同様にデプロイ
```

### ✅ **Step 2.7: 各API動作確認**

#### テスト項目
- [ ] setup-super-tip-receiving: Connect Account作成
- [ ] get-connect-account-status: 状況取得
- [ ] vote-with-super-tip: 投票+寄付処理
- [ ] confirm-super-tip-payment: 決済完了処理
- [ ] stripe-webhook: Webhook処理

---

## Phase 3: フロントエンド実装 🎨

### 📁 **Step 3.1: 状態管理**

```bash
# ファイル作成
src/store/superTipStore.ts
src/hooks/useStripeConnect.ts
src/hooks/useSuperTip.ts
```

### 📁 **Step 3.2: コンポーネント実装**

#### Stripe Connect設定
```bash
src/components/profile/StripeConnectOnboarding.tsx
```

#### Super Tips投票UI
```bash
src/components/voting/SuperTipVoteModal.tsx
src/components/battle/SuperTipDisplay.tsx
```

#### 既存UI拡張
```bash
src/components/ui/VoteCommentModal.tsx    # Super Tipsボタン追加
src/components/battle/BattleView.tsx      # Super Tips表示統合
src/pages/ProfilePage.tsx                # Connect設定セクション追加
```

### ✅ **Step 3.3: UI統合テスト**

#### 確認項目
- [ ] プロフィールでConnect設定可能
- [ ] バトル画面でSuper Tips投票可能
- [ ] 寄付額選択・決済フロー動作
- [ ] エラーハンドリング確認
- [ ] レスポンシブデザイン確認

---

## Phase 4: 統合テスト・本番適用 🧪

### 🔄 **Step 4.1: 開発環境統合テスト**

#### 完全フローテスト
1. [ ] Connect Account作成 → オンボーディング完了
2. [ ] Super Tips投票 → 決済 → Transfer
3. [ ] ポイントシステム統合確認
4. [ ] Webhook処理確認

#### エラーケーステスト
- [ ] 各種制限・バリデーション
- [ ] Stripe API障害時の処理
- [ ] ネットワークエラー処理

### 🚀 **Step 4.2: 本番環境準備**

#### 本番用設定
```bash
# 本番環境変数設定
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://beatnexus.com

# 本番プロジェクトID
qgqcjtjxaoplhxurbpis
```

#### マイグレーション適用
```bash
# 本番環境にマイグレーション適用
mcp_supabase_apply_migration(
  project_id: 'qgqcjtjxaoplhxurbpis',
  name: 'create_super_tips_system',
  query: [マイグレーション内容]
)
```

#### Edge Functions デプロイ
```bash
# 各Edge Functionを本番環境にデプロイ
```

### ✅ **Step 4.3: 本番環境動作確認**

#### 確認項目
- [ ] 本番Stripe Connect動作
- [ ] 実際の決済処理動作
- [ ] Webhook正常受信
- [ ] パフォーマンス確認
- [ ] セキュリティ確認

### 📝 **Step 4.4: ドキュメント更新**

- [ ] 実装ログ作成（.cursor/docs/dev-rules/）
- [ ] 運用マニュアル作成
- [ ] トラブルシューティングガイド

---

## 🎯 実装チェックリスト

### **Phase 1: データベース基盤**
- [ ] マイグレーションファイル作成
- [ ] 開発環境適用・確認
- [ ] DB構造・RLS動作確認

### **Phase 2: Edge Functions**  
- [ ] setup-super-tip-receiving 実装・テスト
- [ ] get-connect-account-status 実装・テスト
- [ ] vote-with-super-tip 実装・テスト
- [ ] confirm-super-tip-payment 実装・テスト
- [ ] stripe-webhook 実装・テスト

### **Phase 3: フロントエンド**
- [ ] 状態管理実装
- [ ] StripeConnectOnboarding 実装
- [ ] SuperTipVoteModal 実装
- [ ] 既存UI統合

### **Phase 4: 統合テスト・本番**
- [ ] 開発環境統合テスト
- [ ] 本番環境準備・適用
- [ ] 本番動作確認
- [ ] ドキュメント作成

---

## 🚨 重要な注意事項

### **環境変数設定必須**
```bash
STRIPE_SECRET_KEY      # Stripe シークレットキー
STRIPE_WEBHOOK_SECRET  # Webhook署名検証用
FRONTEND_URL          # リダイレクト先URL
```

### **テスト順序厳守**
1. 各Edge Function単体テスト
2. フロントエンド統合テスト  
3. 完全フローテスト
4. 本番環境テスト

### **バックアップ・ロールバック準備**
- マイグレーション適用前のバックアップ
- 問題発生時のロールバック手順準備
- 段階的リリース計画

**この実装手順に従って、安全で確実なSuper Tips機能の実装を進めてください！**
