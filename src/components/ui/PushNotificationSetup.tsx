/**
 * 🛎️ Push通知セットアップコンポーネント
 * 
 * ユーザーがプッシュ通知を有効化・管理するためのUI
 */

import React from 'react'
import { usePushNotification } from '../../hooks/usePushNotification'
import { Button } from './Button'
import { Badge } from './Badge'

interface PushNotificationSetupProps {
  className?: string
  onSetupComplete?: (isSubscribed: boolean) => void
}

export const PushNotificationSetup: React.FC<PushNotificationSetupProps> = ({
  className = '',
  onSetupComplete
}) => {
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
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">📱</span>
          <span className="text-sm text-gray-600">
            お使いのブラウザはプッシュ通知をサポートしていません
          </span>
        </div>
      </div>
    )
  }

  // 許可状況に応じた表示
  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="success">許可済み</Badge>
      case 'denied':
        return <Badge variant="danger">拒否済み</Badge>
      default:
        return <Badge variant="secondary">未設定</Badge>
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🛎️</span>
          <h3 className="text-lg font-semibold text-gray-900">
            プッシュ通知
          </h3>
          {getPermissionBadge()}
        </div>
        
        {isSubscribed && (
          <Badge variant="success">有効</Badge>
        )}
      </div>

      {/* 説明文 */}
      <div className="text-sm text-gray-600 space-y-2">
        <p>以下のタイミングで通知をお送りします：</p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>🥊 バトルのマッチングが成立した時</li>
          <li>🗳️ あなたのバトルに投票が入った時</li>
          <li>🏆 バトルの結果が確定した時</li>
        </ul>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex space-x-2">
        {!isSubscribed ? (
          <Button
            onClick={handleEnable}
            disabled={isLoading || permission === 'denied'}
            className="flex-1"
            variant="primary"
          >
            {isLoading ? (
              <>
                <span className="mr-2">⏳</span>
                設定中...
              </>
            ) : permission === 'denied' ? (
              <>
                <span className="mr-2">🚫</span>
                ブラウザ設定で許可してください
              </>
            ) : (
              <>
                <span className="mr-2">🔔</span>
                通知を有効にする
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleDisable}
            disabled={isLoading}
            className="flex-1"
            variant="secondary"
          >
            {isLoading ? (
              <>
                <span className="mr-2">⏳</span>
                無効化中...
              </>
            ) : (
              <>
                <span className="mr-2">🔕</span>
                通知を無効にする
              </>
            )}
          </Button>
        )}
      </div>

      {/* ブラウザ設定への案内（denied の場合） */}
      {permission === 'denied' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-700 space-y-2">
            <p className="font-medium">通知を有効にするには：</p>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>ブラウザのアドレスバー左側の🔒アイコンをクリック</li>
              <li>「通知」を「許可」に変更</li>
              <li>ページを再読み込み</li>
            </ol>
          </div>
        </div>
      )}

      {/* 購読済みの場合の詳細情報 */}
      {isSubscribed && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✅</span>
            <span className="text-sm text-green-700 font-medium">
              プッシュ通知が有効になっています
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            BeatNexusからリアルタイムで通知が届きます
          </p>
        </div>
      )}
    </div>
  )
}

export default PushNotificationSetup 