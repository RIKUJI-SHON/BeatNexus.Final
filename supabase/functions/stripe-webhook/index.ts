import "jsr:@supabase/functions-js/edge-runtime.d.ts";
declare const Deno: { env: { get: (name: string) => string | undefined } };
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Constant-time comparison
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a[i] ^ b[i];
  }
  return out === 0;
}

// Verify Stripe signature per https://stripe.com/docs/webhooks/signatures
async function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string, toleranceSeconds = 300): Promise<boolean> {
  try {
    if (!sigHeader) return false;
    const parts = Object.fromEntries(sigHeader.split(',').map(kv => kv.split('=')));
    const t = parts['t'];
    const v1s = sigHeader
      .split(',')
      .filter(p => p.startsWith('v1='))
      .map(p => p.split('=')[1]);
    if (!t || v1s.length === 0) return false;

    const timestamp = parseInt(t, 10);
    if (!Number.isFinite(timestamp)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) return false; // replay protection

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const data = encoder.encode(`${t}.${rawBody}`);
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));

    // Compare with any of the v1 signatures in a constant-time manner
    for (const v1 of v1s) {
      const expected = hexToBytes(v1);
      if (timingSafeEqual(signature, expected)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  if (!STRIPE_WEBHOOK_SECRET) {
    return new Response('missing webhook secret', { status: 500, headers: corsHeaders });
  }

  // Verify signature
  const ok = await verifyStripeSignature(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  if (!ok) {
    return new Response('invalid signature', { status: 400, headers: corsHeaders });
  }

  const event = JSON.parse(rawBody);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        // 1) super_tips更新
        const { data: tipRows } = await supabase
          .from('super_tips')
          .update({ payment_status: 'succeeded', transfer_status: 'paid', completed_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', pi.id)
          .select('id, battle_id, sender_user_id, vote, comment, amount_jpy');

        // 2) 投票付きの場合は battle_votes に反映（投票が未作成なら作成）
        const tip = Array.isArray(tipRows) && tipRows.length > 0 ? tipRows[0] : null;
        if (tip && tip.battle_id && tip.vote) {
          // 呼び出し: apply_supertip_vote
          const { error: rpcErr } = await supabase.rpc('apply_supertip_vote', {
            p_sender_user_id: tip.sender_user_id,
            p_battle_id: tip.battle_id,
            p_vote: tip.vote,
            p_comment: tip.comment || '',
            p_super_tip_amount: tip.amount_jpy || 0,
            p_payment_intent_id: pi.id,
            p_super_tip_id: tip.id,
          });
          if (rpcErr) {
            console.error('apply_supertip_vote RPC error', rpcErr);
          }
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await supabase
          .from('super_tips')
          .update({ payment_status: 'failed' })
          .eq('stripe_payment_intent_id', pi.id);
        break;
      }
      case 'account.updated': {
        const acct = event.data.object;
        if (acct?.id) {
          await supabase
            .from('profiles')
            .update({ stripe_charges_enabled: !!acct.charges_enabled, updated_at: new Date().toISOString() })
            .eq('stripe_connect_account_id', acct.id);
        }
        break;
      }
      default:
        // ignore
        break;
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'WEBHOOK_HANDLER_ERROR', message: e?.message || 'Unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
