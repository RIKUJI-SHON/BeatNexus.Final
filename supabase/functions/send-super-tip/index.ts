/**
 * 💝 BeatNexus SuperTip送信（簡易版）
 * 
 * 機能:
 * 1. SuperTip決済処理
 * 2. データベース記録
 * 3. 投票処理
 * 
 * 認証: Supabase JWT必須
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 環境変数
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// CORS対応
function corsResponse(body: any, status = 200) {
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
    console.log('💝 Starting SuperTip processing...');

    // 環境変数チェック
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing environment variables');
      return corsResponse({ 
        success: false,
        error: 'Server configuration error' 
      }, 500);
    }

    // 認証チェック
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No valid authorization header');
      return corsResponse({ 
        success: false,
        error: 'Authorization required' 
      }, 401);
    }

    const token = authHeader.slice(7);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      return corsResponse({ 
        success: false,
        error: 'Invalid authentication' 
      }, 401);
    }

    console.log('✅ User authenticated:', user.id);

    // リクエストボディ取得
    const body = await req.json();
    const { battleId, recipientUserId, amount, comment, vote } = body;
    
    // バリデーション
    if (!battleId || !recipientUserId || !amount || !comment || !vote) {
      return corsResponse({ 
        success: false,
        error: 'Missing required fields' 
      }, 400);
    }

    if (amount < 100 || amount > 50000) {
      return corsResponse({ 
        success: false,
        error: 'Amount must be between ¥100 and ¥50,000' 
      }, 400);
    }

    console.log('💰 Processing SuperTip:', { battleId, recipientUserId, amount, vote });

    // 受取人のStripeアカウント情報取得
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_charges_enabled')
      .eq('id', recipientUserId)
      .single();

    if (recipientError || !recipientProfile) {
      console.error('❌ Recipient not found:', recipientError);
      return corsResponse({ 
        success: false,
        error: 'Recipient not found' 
      }, 404);
    }

    if (!recipientProfile.stripe_account_id || !recipientProfile.stripe_charges_enabled) {
      return corsResponse({ 
        success: false,
        error: 'Recipient has not completed Stripe setup' 
      }, 400);
    }

    // 送信者のプロフィール取得（メール等）
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', user.id)
      .single();

    if (senderError || !senderProfile) {
      console.error('❌ Sender profile not found:', senderError);
      return corsResponse({ 
        success: false,
        error: 'Sender profile not found' 
      }, 404);
    }

    // Stripe決済処理
    console.log('💳 Creating Stripe payment...');
    
    // プラットフォーム手数料計算（10%）
    const platformFeeAmount = Math.floor(amount * 0.1);
    const transferAmount = amount - platformFeeAmount;

    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: (amount * 100).toString(), // Stripeは最小通貨単位で処理
        currency: 'jpy',
        transfer_data: JSON.stringify({
          destination: recipientProfile.stripe_account_id,
          amount: (transferAmount * 100).toString()
        }),
        'metadata[battle_id]': battleId,
        'metadata[sender_id]': user.id,
        'metadata[recipient_id]': recipientUserId,
        'metadata[comment]': comment,
        'metadata[vote]': vote,
        confirm: 'true',
        payment_method: 'pm_card_visa', // テスト環境用の固定カード
        return_url: 'https://beatnexus.com/battle/' + battleId
      })
    });

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.text();
      console.error('❌ Stripe payment failed:', stripeError);
      return corsResponse({ 
        success: false,
        error: 'Payment processing failed' 
      }, 500);
    }

    const paymentIntent = await stripeResponse.json();
    console.log('✅ Stripe payment created:', paymentIntent.id);

    // データベースに記録
    const { data: superTip, error: dbError } = await supabase
      .from('super_tips')
      .insert({
        sender_id: user.id,
        recipient_id: recipientUserId,
        battle_id: battleId,
        amount: amount,
        platform_fee: platformFeeAmount,
        net_amount: transferAmount,
        comment: comment,
        vote: vote,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'completed'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert failed:', dbError);
      return corsResponse({ 
        success: false,
        error: 'Failed to record SuperTip' 
      }, 500);
    }

    // 投票記録
    const { error: voteError } = await supabase
      .from('battle_votes')
      .insert({
        battle_id: battleId,
        user_id: user.id,
        vote: vote,
        comment: comment,
        super_tip_id: superTip.id
      });

    if (voteError) {
      console.error('❌ Vote recording failed:', voteError);
      // SuperTipは成功したが投票記録に失敗した場合は警告のみ
      console.warn('⚠️ SuperTip succeeded but vote recording failed');
    }

    console.log('🎉 SuperTip processing completed successfully');

    return corsResponse({
      success: true,
      super_tip_id: superTip.id,
      payment_intent_id: paymentIntent.id,
      amount: amount,
      net_amount: transferAmount
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return corsResponse({ 
      success: false,
      error: 'Internal server error' 
    }, 500);
  }
});
