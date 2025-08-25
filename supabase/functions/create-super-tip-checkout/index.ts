import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'https://esm.sh/stripe@13.4.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { supabaseUrl, supabaseKey } = {
      supabaseUrl: Deno.env.get('SUPABASE_URL')!,
      supabaseKey: Deno.env.get('SUPABASE_ANON_KEY')!,
    };

    // Supabase client
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // 認証確認
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('認証が必要です');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.user) {
      throw new Error('認証に失敗しました');
    }

    const { 
      battleId, 
      vote, 
      comment, 
      superTipAmount, 
      playerUserId 
    } = await req.json();

    // バリデーション
    if (!battleId || !vote || !superTipAmount || !playerUserId) {
      throw new Error('必要なパラメータが不足しています');
    }

    if (vote !== 'A' && vote !== 'B') {
      throw new Error('無効な投票です');
    }

    if (superTipAmount < 100 || superTipAmount > 10000) {
      throw new Error('SuperTip金額は¥100-¥10,000の範囲で設定してください');
    }

    // バトル情報取得
    const { data: battle, error: battleError } = await supabase
      .from('active_battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      throw new Error('バトルが見つかりません');
    }

    if (battle.status !== 'ACTIVE') {
      throw new Error('このバトルは現在投票を受け付けていません');
    }

    if (new Date() > new Date(battle.end_voting_at)) {
      throw new Error('投票期間が終了しています');
    }

    // 投票先のプレイヤーIDを確認
    const isPlayerA = vote === 'A';
    const targetPlayerId = isPlayerA ? battle.player1_user_id : battle.player2_user_id;
    
    if (targetPlayerId !== playerUserId) {
      throw new Error('投票先とSuperTip対象プレイヤーが一致しません');
    }

    // 重複投票チェック
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('battle_votes')
      .select('id')
      .eq('battle_id', battleId)
      .eq('user_id', user.user.id)
      .single();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      throw new Error('投票チェック中にエラーが発生しました');
    }

    if (existingVote) {
      throw new Error('このバトルには既に投票済みです');
    }

    // 支援対象プレイヤーのStripe Connect情報取得
    const { data: playerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', playerUserId)
      .single();

    if (profileError || !playerProfile) {
      throw new Error('プレイヤーのプロファイルが見つかりません');
    }

    if (!playerProfile.stripe_account_id) {
      throw new Error('このプレイヤーはまだStripe連携を完了していません');
    }

    // Stripe setup
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe設定が見つかりません');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    // 手数料計算（10%）
    const applicationFeeAmount = Math.ceil(superTipAmount * 0.1);

    // **投票処理を先に実行**（決済成功前にDB記録）
    console.log('🗳️ Executing vote transaction before payment...');
    
    const { error: txError } = await supabase.rpc('execute_super_tip_vote_transaction', {
      p_battle_id: battleId,
      p_user_id: user.user.id,
      p_vote: vote,
      p_comment: comment || null,
      p_super_tip_amount: superTipAmount,
      p_supported_player_user_id: playerUserId,
      p_stripe_payment_intent_id: `pending_${Date.now()}`, // 一時的ID
      p_stripe_account_id: playerProfile.stripe_account_id,
    });

    if (txError) {
      console.error('❌ Vote transaction failed:', txError);
      throw new Error(`投票処理でエラーが発生しました: ${txError.message}`);
    }

    console.log('✅ Vote transaction completed successfully');

    // 現在のURLを取得してリダイレクトURLを構築
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';
    
    // Stripe Checkout Session作成
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `SuperTip for Player ${vote}`,
              description: comment ? `コメント: ${comment}` : 'SuperTip投票',
              metadata: {
                battle_id: battleId,
                vote: vote,
                player_user_id: playerUserId,
              },
            },
            unit_amount: superTipAmount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: playerProfile.stripe_account_id,
        },
        metadata: {
          battle_id: battleId,
          voter_user_id: user.user.id,
          supported_player_user_id: playerUserId,
          vote: vote,
          comment: comment || '',
          type: 'super_tip',
        },
      },
      metadata: {
        battle_id: battleId,
        voter_user_id: user.user.id,
        supported_player_user_id: playerUserId,
        vote: vote,
        comment: comment || '',
        super_tip_amount: superTipAmount.toString(),
      },
      success_url: `${frontendUrl}/battle/${battleId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/battle/${battleId}?payment=canceled`,
    });

    console.log('✅ Stripe Checkout Session created:', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        message: 'Stripe Checkout Sessionが作成されました',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Stripe Checkout Session creation error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Checkout Session作成中にエラーが発生しました',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
