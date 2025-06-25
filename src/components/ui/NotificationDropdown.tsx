import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Swords, Clock, CheckCircle, Trophy, Award, Handshake, RefreshCw } from 'lucide-react';
import { useNotificationStore, type Notification } from '../../store/notificationStore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const NotificationDropdown: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    fetchNotifications,
  } = useNotificationStore();

  // 外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    // 未読の場合は削除する（既読にする代わりに削除）
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // バトル関連の通知の場合はバトルページに移動
    if ((notification.type === 'battle_matched' || 
         notification.type === 'battle_win' || 
         notification.type === 'battle_lose' || 
         notification.type === 'battle_draw') && 
        notification.relatedBattleId) {
      // バトル結果の場合はマイバトルページに移動
      if (notification.type === 'battle_win' || 
          notification.type === 'battle_lose' || 
          notification.type === 'battle_draw') {
        navigate('/my-battles');
      } else {
        // マッチング通知の場合はバトル詳細ページに移動
        navigate(`/battle/${notification.relatedBattleId}`);
      }
      setIsOpen(false);
    }
  };

  const handleRemoveNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeNotification(id);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'battle_matched':
        return <Swords className="h-4 w-4 text-purple-400" />;
      case 'battle_win':
        return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'battle_lose':
        return <Award className="h-4 w-4 text-red-400" />;
      case 'battle_draw':
        return <Handshake className="h-4 w-4 text-blue-400" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return <Bell className="h-4 w-4 text-blue-400" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) {
      return t('notifications.timeAgo.days', { count: days });
    } else if (hours > 0) {
      return t('notifications.timeAgo.hours', { count: hours });
    } else if (minutes > 0) {
      return t('notifications.timeAgo.minutes', { count: minutes });
    } else {
      return t('notifications.timeAgo.justNow');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 通知ボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="fixed right-4 top-16 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">{t('notifications.title')}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="p-1 text-gray-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                title="手動更新"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>
          </div>

          {/* 通知リスト */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('notifications.empty')}</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${
                    !notification.isRead ? 'bg-gray-800/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            !notification.isRead ? 'text-white' : 'text-gray-300'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0"></div>
                          )}
                          <button
                            onClick={(e) => handleRemoveNotification(e, notification.id)}
                            className="p-1 text-gray-500 hover:text-white transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* フッター */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 