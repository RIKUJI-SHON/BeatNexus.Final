/**
 * 🎯 BeatNexus Stripe Connect アカウントオンボーディング
 * Stripe API Version: 2025-07-30.basil
 * 
 * 機能:
 * 1. Account Linksを使用したオンボーディング開始
 * 2. アカウント状態の取得（APIから直接取得）
 * 3. オンボーディング完了状況の確認
 * 
 * 認証: Supabase JWT必須
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🔐 環境変数（設定必須）
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ⚠️ プレースホルダー: 必要な環境変数がない場合のエラー
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set. Please configure in Supabase Edge Function secrets.');
}

// CORS対応
function corsResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

serve(async (req) => {
  // CORS プリフライト
  if (req.method === 'OPTIONS') {
    return corsResponse({});
  }

  try {
    console.log('🎯 Processing Connect onboarding request...');

    // 💡 環境変数チェック
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing environment variables');
      return corsResponse({ 
        success: false,
        error: 'Server configuration error'
      }, 500);
    }

    // 🔒 認証チェック
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return corsResponse({ 
        success: false,
        error: 'Authorization required' 
      }, 401);
    }

    const token = authHeader.slice(7);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return corsResponse({ 
        success: false,
        error: 'Invalid authentication' 
      }, 401);
    }

    // 📋 既存のプロファイル情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id, stripe_charges_enabled')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.stripe_account_id) {
      return corsResponse({ 
        success: false,
        error: 'Stripe Connect account not found. Please create an account first.' 
      }, 404);
    }

    const accountId = profile.stripe_account_id;

    if (req.method === 'GET') {
      // 📊 アカウント状態を取得（Stripe APIから直接取得）
      console.log('📊 Fetching account status from Stripe API...');
      
      const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Stripe-Version': '2025-07-30.basil'
        }
      });

      if (!accountResponse.ok) {
        const errorText = await accountResponse.text();
        console.error('❌ Failed to fetch account status:', errorText);
        return corsResponse({ 
          success: false,
          error: 'Failed to fetch account status'
        }, 500);
      }

      const account = await accountResponse.json();
      
      return corsResponse({
        success: true,
        account_id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: account.requirements,
        onboarding_complete: account.details_submitted && account.charges_enabled
      });

    } else if (req.method === 'POST') {
      // 🚀 オンボーディングリンク作成
      console.log('🚀 Creating onboarding link...');
      
      const { refresh_url, return_url } = await req.json();
      
      // デフォルトURLの設定
      const defaultBaseUrl = 'http://localhost:3002'; // 開発環境用
      const defaultRefreshUrl = refresh_url || `${defaultBaseUrl}/settings?onboarding=refresh`;
      const defaultReturnUrl = return_url || `${defaultBaseUrl}/settings?onboarding=complete`;

      const linkResponse = await fetch('https://api.stripe.com/v1/account_links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Stripe-Version': '2025-07-30.basil'
        },
        body: new URLSearchParams({
          account: accountId,
          refresh_url: defaultRefreshUrl,
          return_url: defaultReturnUrl,
          type: 'account_onboarding'
        })
      });

      if (!linkResponse.ok) {
        const errorText = await linkResponse.text();
        console.error('❌ Failed to create account link:', errorText);
        return corsResponse({ 
          success: false,
          error: 'Failed to create onboarding link'
        }, 500);
      }

      const accountLink = await linkResponse.json();
      
      return corsResponse({
        success: true,
        onboarding_url: accountLink.url,
        expires_at: accountLink.expires_at
      });
    }

    return corsResponse({ error: 'Method not allowed' }, 405);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return corsResponse({ 
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

/* Usage Examples:

GET Account Status:
curl -X GET 'https://PROJECT_REF.supabase.co/functions/v1/stripe-onboarding' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN'

Create Onboarding Link:
curl -X POST 'https://PROJECT_REF.supabase.co/functions/v1/stripe-onboarding' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"refresh_url": "http://localhost:3002/settings", "return_url": "http://localhost:3002/settings?success=true"}'

*/
