/**
 * 🛎️ Push通知セットアップコンポーネント
 * 
 * ユーザーがプッシュ通知を有効化・管理するためのUI
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import { usePushNotification } from '../../hooks/usePushNotification'
import { Button } from './Button'
import { Badge } from './Badge'
import { Bell, BellOff } from 'lucide-react'

interface PushNotificationSetupProps {
  className?: string
  onSetupComplete?: (isSubscribed: boolean) => void
}

export const PushNotificationSetup: React.FC<PushNotificationSetupProps> = ({
  className = '',
  onSetupComplete
}) => {
  const { t } = useTranslation()
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe
  } = usePushNotification()

  const handleEnable = async () => {
    const success = await subscribe()
    onSetupComplete?.(success)
  }

  const handleDisable = async () => {
    const success = await unsubscribe()
    onSetupComplete?.(!success)
  }

  // サポートされていない場合
  if (!isSupported) {
    return (
      <div className={`p-4 bg-gray-800 border border-gray-700 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <BellOff className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-400">
            {t('pushNotificationSetup.unsupported')}
          </span>
        </div>
      </div>
    )
  }

  // 購読状況に応じた表示
  const getSubscriptionBadge = () => {
    if (permission === 'denied') {
      return <Badge variant="danger">{t('pushNotificationSetup.status.denied')}</Badge>
    }
    
    if (isSubscribed) {
      return <Badge variant="success">{t('pushNotificationSetup.status.enabled')}</Badge>
    }
    
    if (permission === 'granted') {
      return <Badge variant="secondary">{t('pushNotificationSetup.status.disabled')}</Badge>
    }
    
    return <Badge variant="secondary">{t('pushNotificationSetup.status.notSet')}</Badge>
  }

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-5 w-5 text-cyan-400" />
          <div className="flex items-center space-x-2">
            <span className="text-base font-medium text-gray-100">
              {t('pushNotificationSetup.title')}
            </span>
            {getSubscriptionBadge()}
          </div>
        </div>
      </div>



      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-900 border border-red-600 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-red-400">⚠️</span>
            <span className="text-sm text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex space-x-2">
        {!isSubscribed ? (
          <Button
            onClick={handleEnable}
            disabled={isLoading || permission === 'denied'}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
            variant="primary"
          >
            {isLoading ? (
              <>
                <Bell className="h-4 w-4 mr-2 animate-pulse" />
                {t('pushNotificationSetup.buttons.enabling')}
              </>
            ) : permission === 'denied' ? (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                {t('pushNotificationSetup.buttons.browserSettings')}
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                {t('pushNotificationSetup.buttons.enable')}
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleDisable}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300"
            variant="secondary"
          >
            {isLoading ? (
              <>
                <BellOff className="h-4 w-4 mr-2 animate-pulse" />
                {t('pushNotificationSetup.buttons.disabling')}
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                {t('pushNotificationSetup.buttons.disable')}
              </>
            )}
          </Button>
        )}
      </div>

      {/* ブラウザ設定への案内（denied の場合） */}
      {permission === 'denied' && (
        <div className="p-3 bg-blue-900 border border-blue-600 rounded-lg">
          <div className="text-sm text-blue-300 space-y-2">
            <p className="font-medium text-blue-200">{t('pushNotificationSetup.help.title')}</p>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>{t('pushNotificationSetup.help.step1')}</li>
              <li>{t('pushNotificationSetup.help.step2')}</li>
              <li>{t('pushNotificationSetup.help.step3')}</li>
            </ol>
          </div>
        </div>
      )}


    </div>
  )
}

export default PushNotificationSetup 