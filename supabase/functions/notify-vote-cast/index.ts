/**
 * 🗳️ 投票発生時 Push 通知 Edge Function
 * 
 * バトルに投票が発生した時に
 * 両プレイヤーに通知を送信する
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendBulkWebPush, type PushSubscription } from '../_shared/send_web_push.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { battle_id, voter_id, voted_user_id } = await req.json()

    if (!battle_id || !voter_id) {
      return new Response(
        JSON.stringify({ error: 'battle_id and voter_id are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase クライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. バトル情報と参加者情報を取得
    const { data: battle, error: battleError } = await supabase
      .from('active_battles')
      .select(`
        id,
        player1_user_id,
        player2_user_id,
        player1_username:profiles!active_battles_player1_user_id_fkey(username),
        player2_username:profiles!active_battles_player2_user_id_fkey(username)
      `)
      .eq('id', battle_id)
      .single()

    if (battleError || !battle) {
      console.error('❌ Error fetching battle:', battleError)
      return new Response(
        JSON.stringify({ error: 'Battle not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. 投票者情報を取得
    const { data: voter, error: voterError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', voter_id)
      .single()

    if (voterError || !voter) {
      console.error('❌ Error fetching voter:', voterError)
      return new Response(
        JSON.stringify({ error: 'Voter not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. 両プレイヤーの Push 購読情報を取得
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', [battle.player1_user_id, battle.player2_user_id])

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No push subscriptions found for battle participants')
      return new Response(
        JSON.stringify({ message: 'No subscriptions found, notifications not sent' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📱 Found ${subscriptions.length} push subscriptions for battle ${battle_id}`)

    // 4. 投票されたプレイヤー名を取得
    let votedPlayerName = ''
    if (voted_user_id) {
      if (voted_user_id === battle.player1_user_id) {
        votedPlayerName = (battle.player1_username as any)?.username || 'Unknown'
      } else if (voted_user_id === battle.player2_user_id) {
        votedPlayerName = (battle.player2_username as any)?.username || 'Unknown'
      }
    }

    // 5. 各プレイヤーに通知を送信（投票先は明かさない）
    const pushSubscriptions = subscriptions.map(sub => sub.subscription as PushSubscription)

    const payload = {
      title: "🗳️ 新しい投票が入りました",
      body: `${voter.username} があなたのバトルに投票しました。`,
      icon: '/bn_icon_192.png',
      data: {
        battleId: battle_id,
        url: `/battles/${battle_id}`,
        type: 'vote_cast',
        voterName: voter.username
      },
      actions: [
        {
          action: 'view',
          title: 'バトルを見る'
        }
      ]
    }

    // 6. 通知を一括送信
    const result = await sendBulkWebPush({
      subscriptions: pushSubscriptions,
      payload,
      options: {
        urgency: 'normal', // 投票は通常の重要度
        TTL: 12 * 60 * 60 // 12時間
      }
    })

    console.log(`📊 Vote cast notifications: ${result.successCount}/${result.totalSent} sent successfully`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Notifications sent to ${result.successCount}/${result.totalSent} recipients`,
        battle_id,
        voter_name: voter.username,
        voted_player_name: votedPlayerName,
        result
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in notify-vote-cast:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 