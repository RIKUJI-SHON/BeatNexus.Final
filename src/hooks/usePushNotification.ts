/**
 * 🛎️ Push 通知管理フック
 * 
 * Web Push API を使用してプッシュ通知の購読・管理を行う
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

// VAPID公開鍵（環境変数から取得、フォールバック付き）
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BIqUQJtbziGnenLraVzJ0Du0TA5_RXchfdbKL0BsSjPWbuyNYkNnCw7bRVbolMW-hXpxKZwuWoWpgX2WjO9P0xk'

interface PushSubscriptionState {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  subscription: PushSubscription | null
  isLoading: boolean
  error: string | null
}

interface UsePushNotificationReturn extends PushSubscriptionState {
  requestPermission: () => Promise<boolean>
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  refreshSubscription: () => Promise<void>
}

/**
 * VAPID公開鍵をUint8Arrayに変換
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const usePushNotification = (): UsePushNotificationReturn => {
  const { user } = useAuthStore()
  
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    subscription: null,
    isLoading: false,
    error: null
  })

  /**
   * Push通知のサポート状況をチェック
   */
  const checkSupport = useCallback(() => {
    const isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied'
    }))

    return isSupported
  }, [])

  /**
   * 現在の購読状況を取得
   */
  const getCurrentSubscription = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.isSupported) return null

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      setState(prev => ({
        ...prev,
        subscription,
        isSubscribed: !!subscription
      }))

      return subscription
    } catch (error) {
      console.error('[Push] Error getting subscription:', error)
      setState(prev => ({
        ...prev,
        error: '購読状況の取得に失敗しました'
      }))
      return null
    }
  }, [state.isSupported])

  /**
   * 通知許可をリクエスト
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'プッシュ通知はサポートされていません' }))
      return false
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const permission = await Notification.requestPermission()
      
      setState(prev => ({
        ...prev,
        permission,
        isLoading: false
      }))

      return permission === 'granted'
    } catch (error) {
      console.error('[Push] Error requesting permission:', error)
      setState(prev => ({
        ...prev,
        error: '通知許可の取得に失敗しました',
        isLoading: false
      }))
      return false
    }
  }, [state.isSupported])

  /**
   * Push通知に購読
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setState(prev => ({ ...prev, error: 'ログインが必要です' }))
      return false
    }

    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'プッシュ通知はサポートされていません' }))
      return false
    }

    if (state.permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return false
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const registration = await navigator.serviceWorker.ready
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })

      console.log('[Push] New subscription created:', subscription)

      // Supabaseに購読情報を保存
      const subscriptionData = {
        user_id: user.id,
        subscription: subscription.toJSON(),
        user_agent: navigator.userAgent
      }

      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'user_id, (subscription->\'endpoint\')'
        })

      if (dbError) {
        console.error('[Push] Database error:', dbError)
        throw new Error('購読情報の保存に失敗しました')
      }

      setState(prev => ({
        ...prev,
        subscription,
        isSubscribed: true,
        isLoading: false
      }))

      console.log('[Push] Successfully subscribed and saved to database')
      return true

    } catch (error) {
      console.error('[Push] Error subscribing:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '購読に失敗しました',
        isLoading: false
      }))
      return false
    }
  }, [user, state.isSupported, state.permission, requestPermission])

  /**
   * Push通知の購読を解除
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user || !state.subscription) {
      return false
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // ブラウザから購読を解除
      const success = await state.subscription.unsubscribe()

      if (success) {
        // データベースからも削除
        const { error: dbError } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)

        if (dbError) {
          console.error('[Push] Database error during unsubscribe:', dbError)
        }

        setState(prev => ({
          ...prev,
          subscription: null,
          isSubscribed: false,
          isLoading: false
        }))

        console.log('[Push] Successfully unsubscribed')
        return true
      }

      return false

    } catch (error) {
      console.error('[Push] Error unsubscribing:', error)
      setState(prev => ({
        ...prev,
        error: '購読解除に失敗しました',
        isLoading: false
      }))
      return false
    }
  }, [user, state.subscription])

  /**
   * 購読状況を更新
   */
  const refreshSubscription = useCallback(async (): Promise<void> => {
    if (!state.isSupported) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    await getCurrentSubscription()
    
    setState(prev => ({ ...prev, isLoading: false }))
  }, [state.isSupported, getCurrentSubscription])

  /**
   * Service Workerからのメッセージを監視
   */
  useEffect(() => {
    if (!state.isSupported) return

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        console.log('[Push] Subscription changed from SW:', event.data.subscription)
        refreshSubscription()
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [state.isSupported, refreshSubscription])

  /**
   * 初期化時にサポート状況と現在の購読状況をチェック
   */
  useEffect(() => {
    const initialize = async () => {
      const supported = checkSupport()
      if (supported && user) {
        await getCurrentSubscription()
      }
    }

    initialize()
  }, [user, checkSupport, getCurrentSubscription])

  /**
   * ユーザーがログアウトした時は購読状況をリセット
   */
  useEffect(() => {
    if (!user) {
      setState(prev => ({
        ...prev,
        subscription: null,
        isSubscribed: false,
        error: null
      }))
    }
  }, [user])

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    refreshSubscription
  }
} 