import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@15.6.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuperTipVoteRequest {
  battleId: string;
  vote: 'A' | 'B';
  comment?: string;
  superTipAmount: number; // 円単位
  playerUserId: string; // 支援対象プレイヤー
}

Deno.serve(async (req) => {
  // CORS preflight handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('認証が必要です');
    }

    // Supabase client setup（通常投票と同じ方式）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // ユーザー認証付きclient（通常投票と同じ）
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    
    // ユーザー認証
    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('認証に失敗しました');
    }

    const { battleId, vote, comment, superTipAmount, playerUserId }: SuperTipVoteRequest = await req.json();

    // バリデーション
    if (!battleId || !vote || !superTipAmount || !playerUserId) {
      throw new Error('必要なパラメータが不足しています');
    }

    if (superTipAmount < 100) {
      throw new Error('SuperTipの最小金額は100円です');
    }

    if (!['A', 'B'].includes(vote)) {
      throw new Error('投票は A または B である必要があります');
    }

    // バトルの存在確認とプレイヤー情報取得
    const { data: battle, error: battleError } = await supabase
      .from('active_battles')
      .select(`
        id,
        player1_user_id,
        player2_user_id,
        status,
        end_voting_at
      `)
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

    // Stripe setup（早期に初期化）
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe設定が見つかりません');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    // 支援対象プレイヤーのStripe Connect情報取得（プロファイルテーブルからIDのみ）
    const { data: playerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', playerUserId)
      .single();

    if (profileError || !playerProfile) {
      throw new Error('プレイヤー情報が見つかりません');
    }

    if (!playerProfile.stripe_account_id) {
      throw new Error('このプレイヤーはSuperTipを受け取ることができません（Stripe Connect未設定）');
    }

    // Stripe APIから直接アカウント状況を確認
    let stripeAccount;
    try {
      stripeAccount = await stripe.accounts.retrieve(playerProfile.stripe_account_id);
    } catch (stripeError) {
      console.error('Stripe Account取得エラー:', stripeError);
      throw new Error('このプレイヤーのStripe Connect設定に問題があります');
    }

    // アカウントが支払いを受け取れる状態か確認
    if (!stripeAccount.charges_enabled) {
      throw new Error('このプレイヤーはSuperTipを受け取ることができません（Stripe設定が未完了）');
    }

    if (!stripeAccount.details_submitted) {
      throw new Error('このプレイヤーはSuperTipを受け取ることができません（アカウント詳細情報が未提出）');
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

    // 手数料計算（10%）
    const applicationFeeAmount = Math.ceil(superTipAmount * 0.1);

    // Stripe PaymentIntent作成
    const paymentIntent = await stripe.paymentIntents.create({
      amount: superTipAmount,
      currency: 'jpy',
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: playerProfile.stripe_account_id,
      },
      metadata: {
        battle_id: battleId,
        voter_user_id: user.user.id,
        supported_player_user_id: playerUserId,
        vote: vote,
        type: 'super_tip',
      },
    });

    // データベーストランザクション開始（通常投票と同じ方式）
    const { error: txError } = await supabase.rpc('execute_super_tip_vote_transaction', {
      p_battle_id: battleId,
      p_user_id: user.user.id,
      p_vote: vote,
      p_comment: comment || null,
      p_super_tip_amount: superTipAmount,
      p_supported_player_user_id: playerUserId,
      p_stripe_payment_intent_id: paymentIntent.id,
      p_stripe_account_id: playerProfile.stripe_account_id,
    });

    if (txError) {
      // PaymentIntentをキャンセル
      await stripe.paymentIntents.cancel(paymentIntent.id);
      throw new Error(`データベースエラー: ${txError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          application_fee_amount: applicationFeeAmount,
        },
        message: 'SuperTip付き投票が正常に処理されました',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('SuperTip投票エラー:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'SuperTip付き投票の処理中にエラーが発生しました',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
