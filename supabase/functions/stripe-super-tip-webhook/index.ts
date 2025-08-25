import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.4.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !endpointSecret) {
      throw new Error('Webhook signature validation failed');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
    });

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    console.log('🎯 Webhook event:', event.type);

    // 決済完了時の処理
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('✅ Checkout session completed:', session.id);
      console.log('📊 Metadata:', session.metadata);

      // メタデータから投票情報を取得
      const {
        battle_id,
        voter_user_id,
        supported_player_user_id,
        vote,
        comment,
        super_tip_amount
      } = session.metadata || {};

      if (!battle_id || !voter_user_id || !supported_player_user_id || !vote || !super_tip_amount) {
        console.error('❌ Missing required metadata in checkout session');
        return new Response('Missing metadata', { status: 400 });
      }

      // Supabase client
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Service Role Key for webhook
      );

      // PaymentIntentを取得してstripe_account_idを入手
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
      const stripeAccountId = paymentIntent.transfer_data?.destination;

      if (!stripeAccountId) {
        console.error('❌ No transfer destination found in PaymentIntent');
        return new Response('Missing transfer destination', { status: 400 });
      }

      // SuperTip投票を実行
      const { error: txError } = await supabase.rpc('execute_super_tip_vote_transaction', {
        p_battle_id: battle_id,
        p_user_id: voter_user_id,
        p_vote: vote,
        p_comment: comment || null,
        p_super_tip_amount: parseInt(super_tip_amount),
        p_supported_player_user_id: supported_player_user_id,
        p_stripe_payment_intent_id: session.payment_intent,
        p_stripe_account_id: stripeAccountId,
      });

      if (txError) {
        console.error('❌ Database transaction failed:', txError);
        return new Response(`Database error: ${txError.message}`, { status: 500 });
      }

      // 決済ステータスを更新
      await supabase
        .from('super_tips')
        .update({ payment_status: 'succeeded' })
        .eq('stripe_payment_intent_id', session.payment_intent);

      await supabase
        .from('battle_votes')
        .update({ payment_status: 'succeeded' })
        .eq('stripe_payment_intent_id', session.payment_intent);

      console.log('🎉 SuperTip vote transaction completed successfully!');
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return new Response(`Webhook error: ${error.message}`, { status: 400 });
  }
});
