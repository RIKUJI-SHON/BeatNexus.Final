/**
 * 🛍️ BeatNexus Stripe Connect 商品作成
 * Stripe API Version: 2025-07-30.basil
 * 
 * 機能:
 * 1. プラットフォームレベルでのStripe商品作成
 * 2. 商品とConnected Accountの紐付け（メタデータ使用）
 * 3. データベースへの商品情報保存
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

serve(async (req) => {
  // CORS プリフライト
  if (req.method === 'OPTIONS') {
    return corsResponse({});
  }

  if (req.method !== 'POST') {
    return corsResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    console.log('🛍️ Starting product creation...');

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

    // 📋 ユーザーのStripe Connect情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id, stripe_charges_enabled')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.stripe_account_id) {
      return corsResponse({ 
        success: false,
        error: 'Stripe Connect account not found. Please create and onboard an account first.' 
      }, 404);
    }

    if (!profile.stripe_charges_enabled) {
      return corsResponse({ 
        success: false,
        error: 'Stripe Connect account onboarding not completed. Please complete onboarding first.' 
      }, 400);
    }

    // 📦 リクエストボディの解析
    const { name, description, price_cents, currency = 'jpy' } = await req.json();

    if (!name || !price_cents || price_cents <= 0) {
      return corsResponse({ 
        success: false,
        error: 'Invalid product data. Name and price_cents (>0) are required.' 
      }, 400);
    }

    console.log('💳 Creating Stripe product at platform level...');

    // 🛍️ Stripe商品作成（プラットフォームレベル）
    const productResponse = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-07-30.basil'
      },
      body: new URLSearchParams({
        name: name,
        description: description || '',
        'metadata[connected_account_id]': profile.stripe_account_id,
        'metadata[owner_user_id]': user.id,
        'metadata[platform]': 'beatnexus',
        'default_price_data[unit_amount]': price_cents.toString(),
        'default_price_data[currency]': currency
      })
    });

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      console.error('❌ Stripe product creation failed:', errorText);
      return corsResponse({ 
        success: false,
        error: 'Failed to create Stripe product'
      }, 500);
    }

    const stripeProduct = await productResponse.json();
    console.log('✅ Stripe product created:', stripeProduct.id);

    // 💾 データベースに商品情報を保存
    const { data: dbProduct, error: dbError } = await supabase
      .from('products')
      .insert({
        name: name,
        description: description,
        price_cents: price_cents,
        currency: currency,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripeProduct.default_price,
        connected_account_id: profile.stripe_account_id,
        owner_user_id: user.id,
        is_active: true,
        metadata: {
          stripe_metadata: stripeProduct.metadata
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert failed:', dbError);
      // ⚠️ Stripe商品は作成されたが、DB保存に失敗した場合の警告
      console.warn('⚠️ Stripe product created but database save failed. Manual intervention may be required.');
      return corsResponse({ 
        success: false,
        error: 'Failed to save product to database',
        stripe_product_id: stripeProduct.id
      }, 500);
    }

    console.log('🎉 Product creation completed successfully');

    return corsResponse({
      success: true,
      product: {
        id: dbProduct.id,
        name: dbProduct.name,
        description: dbProduct.description,
        price_cents: dbProduct.price_cents,
        currency: dbProduct.currency,
        stripe_product_id: dbProduct.stripe_product_id,
        stripe_price_id: dbProduct.stripe_price_id,
        created_at: dbProduct.created_at
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return corsResponse({ 
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

/* Usage Example:

Create Product:
curl -X POST 'https://PROJECT_REF.supabase.co/functions/v1/create-product' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "BeatNexus Premium Lesson",
    "description": "1-hour personalized beatboxing lesson",
    "price_cents": 5000,
    "currency": "jpy"
  }'

*/
