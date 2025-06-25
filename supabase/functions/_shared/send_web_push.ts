/**
 * 🛎️ Web Push 通知送信共通関数
 * 
 * 各 Edge Function から呼び出される汎用的な Push 通知送信処理
 */

import webpush from 'https://esm.sh/web-push@3.6.7'

// VAPID 設定
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:support@beatnexus.com'

// web-push ライブラリの初期化
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: {
    battleId?: string
    url?: string
    [key: string]: any
  }
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * 単一の購読者に Push 通知を送信
 */
export async function sendWebPush({
  subscription,
  payload,
  options = {}
}: {
  subscription: PushSubscription
  payload: PushPayload
  options?: {
    TTL?: number // Time to Live (秒)
    urgency?: 'very-low' | 'low' | 'normal' | 'high'
    topic?: string
  }
}): Promise<{ success: boolean; error?: string }> {
  try {
    // デフォルトアイコン設定
    const notificationPayload = {
      ...payload,
      icon: payload.icon || '/bn_icon_192.png',
      badge: payload.badge || '/bn_icon_192.png',
    }

    const pushOptions = {
      TTL: options.TTL || 24 * 60 * 60, // デフォルト24時間
      urgency: options.urgency || 'normal',
      topic: options.topic,
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify(notificationPayload),
      pushOptions
    )

    console.log('✅ Push notification sent successfully', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      title: payload.title
    })

    return { success: true }
  } catch (error) {
    console.error('❌ Error sending push notification:', error)
    
    // エラーの種類によって適切なログ出力
    if (error instanceof Error) {
      if (error.message.includes('410')) {
        console.log('🗑️ Subscription is no longer valid (410), should be removed from database')
      } else if (error.message.includes('413')) {
        console.log('📦 Payload too large (413)')
      }
    }

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 複数の購読者に一括で Push 通知を送信
 */
export async function sendBulkWebPush({
  subscriptions,
  payload,
  options = {}
}: {
  subscriptions: PushSubscription[]
  payload: PushPayload
  options?: {
    TTL?: number
    urgency?: 'very-low' | 'low' | 'normal' | 'high'
    topic?: string
  }
}): Promise<{
  totalSent: number
  successCount: number
  failureCount: number
  results: Array<{ success: boolean; error?: string }>
}> {
  console.log(`📤 Sending bulk push notifications to ${subscriptions.length} recipients`)
  
  const results = await Promise.allSettled(
    subscriptions.map(subscription => 
      sendWebPush({ subscription, payload, options })
    )
  )

  const successCount = results.filter(result => 
    result.status === 'fulfilled' && result.value.success
  ).length

  const failureCount = results.length - successCount

  console.log(`📊 Bulk push results: ${successCount} success, ${failureCount} failures`)

  return {
    totalSent: subscriptions.length,
    successCount,
    failureCount,
    results: results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: result.reason?.message || 'Promise rejected' }
    )
  }
} 