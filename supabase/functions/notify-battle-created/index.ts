/**
 * 🥊 バトル成立時 Push 通知 Edge Function
 * 
 * マッチングが成立し、新しいバトルが作成された時に
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
    const { battle_id } = await req.json()

    if (!battle_id) {
      return new Response(
        JSON.stringify({ error: 'battle_id is required' }), 
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

    // 2. 両プレイヤーの Push 購読情報を取得
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

    // 3. 各プレイヤーに対してパーソナライズされた通知を送信
    const notificationPromises = subscriptions.map(async (sub) => {
      const isPlayer1 = sub.user_id === battle.player1_user_id
      const opponentName = isPlayer1 
        ? (battle.player2_username as any)?.username || 'Unknown'
        : (battle.player1_username as any)?.username || 'Unknown'

      const payload = {
        title: "🥊 バトルが始まりました！",
        body: `対戦相手: ${opponentName} とマッチしました。今すぐ確認！`,
        icon: '/bn_icon_192.png',
        data: {
          battleId: battle_id,
          url: `/battles/${battle_id}`,
          type: 'battle_created',
          opponentName
        },
        actions: [
          {
            action: 'view',
            title: 'バトルを見る'
          }
        ]
      }

      return sendBulkWebPush({
        subscriptions: [sub.subscription as PushSubscription],
        payload,
        options: {
          urgency: 'high', // バトル成立は重要度高
          TTL: 24 * 60 * 60 // 24時間
        }
      })
    })

    // 4. 全ての通知送信を並列実行
    const results = await Promise.allSettled(notificationPromises)

    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.successCount > 0
    ).length

    const totalCount = results.length

    console.log(`📊 Battle created notifications: ${successCount}/${totalCount} sent successfully`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Notifications sent to ${successCount}/${totalCount} recipients`,
        battle_id,
        results: results.map(result => 
          result.status === 'fulfilled' 
            ? { success: true, details: result.value }
            : { success: false, error: result.reason?.message }
        )
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in notify-battle-created:', error)
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