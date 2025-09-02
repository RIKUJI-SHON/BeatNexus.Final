/**
 * 💰 BeatNexus Stripe Connect 決済処理
 * Stripe API Version: 2025-07-30.basil
 * 
 * 機能:
 * 1. Destination Charge with Application Feeによる決済
 * 2. Hosted Checkoutセッション作成
 * 3. プラットフォーム手数料の自動計算
 * 
 * 認証: Supabase JWT必須
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🔐 環境変数（設定必須）
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 💰 プラットフォーム手数料設定（15%）
const PLATFORM_FEE_PERCENTAGE = 0.15;

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
    console.log('💰 Starting checkout session creation...');

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

    // 📦 リクエストボディの解析
    const { 
      product_id, 
      quantity = 1,
      success_url,
      cancel_url 
    } = await req.json();

    if (!product_id) {
      return corsResponse({ 
        success: false,
        error: 'Product ID is required' 
      }, 400);
    }

    console.log('📋 Fetching product information...');

    // 🛍️ 商品情報を取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        owner:profiles!owner_user_id(id, username, email)
      `)
      .eq('id', product_id)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return corsResponse({ 
        success: false,
        error: 'Product not found or inactive' 
      }, 404);
    }

    // 💰 手数料計算
    const totalAmount = product.price_cents * quantity;
    const applicationFee = Math.floor(totalAmount * PLATFORM_FEE_PERCENTAGE);

    console.log('💳 Creating Stripe Checkout session...');

    // デフォルトURL設定
    const baseUrl = 'http://localhost:3002'; // 開発環境用
    const defaultSuccessUrl = success_url || `${baseUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = cancel_url || `${baseUrl}/storefront`;

    // 🎯 Checkout Session作成（Destination Charge）
    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-07-30.basil'
      },
      body: new URLSearchParams({
        'line_items[0][price_data][currency]': product.currency,
        'line_items[0][price_data][unit_amount]': product.price_cents.toString(),
        'line_items[0][price_data][product_data][name]': product.name,
        'line_items[0][price_data][product_data][description]': product.description || '',
        'line_items[0][quantity]': quantity.toString(),
        'payment_intent_data[application_fee_amount]': applicationFee.toString(),
        'payment_intent_data[transfer_data][destination]': product.connected_account_id,
        'mode': 'payment',
        'success_url': defaultSuccessUrl,
        'cancel_url': defaultCancelUrl,
        'metadata[product_id]': product_id,
        'metadata[buyer_user_id]': user.id,
        'metadata[seller_user_id]': product.owner_user_id,
        'metadata[platform]': 'beatnexus'
      })
    });

    if (!sessionResponse.ok) {
      const errorText = await sessionResponse.text();
      console.error('❌ Stripe checkout session creation failed:', errorText);
      return corsResponse({ 
        success: false,
        error: 'Failed to create checkout session'
      }, 500);
    }

    const session = await sessionResponse.json();
    console.log('✅ Checkout session created:', session.id);

    // 💾 決済セッション情報をデータベースに保存
    const { error: dbError } = await supabase
      .from('payment_sessions')
      .insert({
        stripe_session_id: session.id,
        product_id: product_id,
        buyer_user_id: user.id,
        seller_user_id: product.owner_user_id,
        total_amount_cents: totalAmount,
        application_fee_cents: applicationFee,
        currency: product.currency,
        status: 'pending',
        metadata: {
          quantity: quantity,
          stripe_metadata: session.metadata
        }
      });

    if (dbError) {
      console.error('❌ Database insert failed:', dbError);
      console.warn('⚠️ Checkout session created but database save failed.');
    }

    console.log('🎉 Checkout session creation completed successfully');

    return corsResponse({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      total_amount_cents: totalAmount,
      application_fee_cents: applicationFee,
      expires_at: session.expires_at
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

Create Checkout Session:
curl -X POST 'https://PROJECT_REF.supabase.co/functions/v1/create-checkout' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "product_id": "uuid-product-id",
    "quantity": 1,
    "success_url": "http://localhost:3002/success",
    "cancel_url": "http://localhost:3002/cancel"
  }'

*/
