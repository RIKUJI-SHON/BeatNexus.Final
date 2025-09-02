import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: { env: { get: (name: string) => string | undefined } };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-client-version, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type VoteTipRequest = {
  battle_id: string;
  sender_user_id: string;
  recipient_user_id: string;
  vote: 'A' | 'B';
  comment: string; // 必須（コメント付き投票として+3）
  amount_jpy: number; // 100-10000
};

type BattleRow = { id: string; status?: string; player1_user_id?: string; player2_user_id?: string };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const PLATFORM_FEE_PERCENT = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENT') || '15');
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    const APM_ALLOW_REDIRECTS = Deno.env.get('AUTOMATIC_PAYMENT_METHODS_ALLOW_REDIRECTS');

    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Stripe configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json() as VoteTipRequest;

    // Validate
    if (!body.battle_id || !body.sender_user_id || !body.recipient_user_id || !body.comment || !body.amount_jpy || !body.vote) {
      return new Response(JSON.stringify({ success: false, error: 'INVALID_REQUEST' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (body.sender_user_id === body.recipient_user_id) {
      return new Response(JSON.stringify({ success: false, error: 'SELF_TIP_NOT_ALLOWED' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (body.amount_jpy < 100 || body.amount_jpy > 10000) {
      return new Response(JSON.stringify({ success: false, error: 'INVALID_AMOUNT' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Battle checks
    const { data: battle, error: battleErr } = await supabase
      .from('active_battles')
      .select('id, status, player1_user_id, player2_user_id')
      .eq('id', body.battle_id)
      .single();
    if (battleErr || !battle) {
      return new Response(JSON.stringify({ success: false, error: 'BATTLE_NOT_FOUND' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const b = battle as unknown as BattleRow;
    const statusUpper = (b.status || '').toUpperCase();
    if (statusUpper && statusUpper !== 'ACTIVE') {
      return new Response(JSON.stringify({ success: false, error: 'BATTLE_NOT_ACTIVE' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // Self-tip guard for battlers
    if (body.sender_user_id === b.player1_user_id || body.sender_user_id === b.player2_user_id) {
      return new Response(JSON.stringify({ success: false, error: 'SELF_TIP_NOT_ALLOWED' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Duplicate tip per battle guard
    const { data: dup, error: dupErr } = await supabase
      .from('super_tips')
      .select('id')
      .eq('sender_user_id', body.sender_user_id)
      .eq('battle_id', body.battle_id)
      .limit(1)
      .maybeSingle();
    if (dupErr) {
      return new Response(JSON.stringify({ success: false, error: 'DUP_CHECK_FAILED' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (dup) {
      return new Response(JSON.stringify({ success: false, error: 'ALREADY_TIPPED_IN_BATTLE' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Recipient connect
    const { data: recipientProfile, error: recipientErr } = await supabase
      .from('profiles')
      .select('stripe_connect_account_id, stripe_charges_enabled')
      .eq('id', body.recipient_user_id)
      .single();
    if (recipientErr || !recipientProfile?.stripe_connect_account_id) {
      return new Response(JSON.stringify({ success: false, error: 'RECIPIENT_NOT_READY' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check card_payments capability for on_behalf_of
    let cardPaymentsActive = false;
    try {
      const acctResp = await fetch(`https://api.stripe.com/v1/accounts/${recipientProfile.stripe_connect_account_id}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
      });
      const acct = await acctResp.json();
      if (acctResp.ok) {
        cardPaymentsActive = (acct?.capabilities?.card_payments === 'active');
      }
    } catch {
      cardPaymentsActive = false;
    }

    // Fees
  const feePercent = Number.isFinite(PLATFORM_FEE_PERCENT) ? PLATFORM_FEE_PERCENT : 15;
    const applicationFeeAmount = Math.max(0, Math.min(body.amount_jpy, Math.floor((body.amount_jpy * feePercent) / 100)));

    // Create PaymentIntent (destination charge)
    const idempotencyKey = crypto.randomUUID();
    const params = new URLSearchParams({
      'amount': String(body.amount_jpy),
      'currency': 'jpy',
      'transfer_data[destination]': recipientProfile.stripe_connect_account_id,
      'application_fee_amount': String(applicationFeeAmount),
      'metadata[platform]': 'BeatNexus',
      'metadata[purpose]': 'super_tips_vote',
      'metadata[battle_id]': body.battle_id,
      'metadata[sender_user_id]': body.sender_user_id,
      'metadata[recipient_user_id]': body.recipient_user_id,
      'metadata[vote]': body.vote,
      'metadata[comment]': body.comment,
      'metadata[platform_fee_percent]': String(feePercent),
      'metadata[platform_fee_amount]': String(applicationFeeAmount),
    });
    if (cardPaymentsActive) {
      params.set('on_behalf_of', recipientProfile.stripe_connect_account_id);
    } else {
      params.set('metadata[on_behalf_of_omitted]', 'true');
    }
    if (APM_ALLOW_REDIRECTS) {
      params.set('automatic_payment_methods[enabled]', 'true');
      params.set('automatic_payment_methods[allow_redirects]', APM_ALLOW_REDIRECTS);
    }

    const piResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': idempotencyKey,
      },
      body: params,
    });
    const pi = await piResponse.json();
    if (!piResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: 'PI_CREATION_FAILED', details: pi }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert super_tips row immediately; vote will be materialized by webhook
    const { data: tip, error: tipErr } = await supabase
      .from('super_tips')
      .insert({
        battle_id: body.battle_id,
        sender_user_id: body.sender_user_id,
        recipient_user_id: body.recipient_user_id,
        vote: body.vote,
        comment: body.comment,
        amount_jpy: body.amount_jpy,
        stripe_payment_intent_id: pi.id,
        stripe_connect_account_id: recipientProfile.stripe_connect_account_id,
        payment_status: 'pending',
        transfer_status: 'pending',
      })
      .select('id')
      .single();
    if (tipErr) {
      return new Response(JSON.stringify({ success: false, error: 'TIP_INSERT_FAILED', details: tipErr }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Prepare return_url
    let baseUrl = FRONTEND_URL;
  try {
      const originHeader = req.headers.get('origin') ?? req.headers.get('referer');
      if (originHeader) baseUrl = new URL(originHeader).origin;
  } catch {/* ignore invalid header URL */}
    const recommendedReturnUrl = `${baseUrl}/payments/super-tip/complete`;

    return new Response(JSON.stringify({ success: true, client_secret: pi.client_secret, super_tip_id: tip.id, recommended_return_url: recommendedReturnUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: 'INTERNAL_SERVER_ERROR', message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
