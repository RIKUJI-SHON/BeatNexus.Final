import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ShoppingCart, Plus, User, Crown, Settings, LogOut, Check, Swords, Clock, CheckCircle, Trophy, Award, Handshake, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { HoverCard } from '../ui/HoverCard';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../store/authStore';
import { useAuthModal } from '../auth/AuthProvider';
import { useNotificationStore, type Notification } from '../../store/notificationStore';
import { supabase } from '../../lib/supabase';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { openAuthModal } = useAuthModal();
  const { t, i18n } = useTranslation();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    fetchNotifications,
  } = useNotificationStore();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // プロフィールドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.profile-dropdown-container')) {
          setIsProfileDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // 通知ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isNotificationDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.notification-dropdown-container')) {
          setIsNotificationDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationDropdownOpen]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const handleUpgradeClick = () => {
    navigate('/subscription');
  };

  const handleAuthClick = (mode: 'login' | 'signup') => {
    openAuthModal(mode);
  };

  const getDefaultAvatarUrl = (seed?: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed || 'defaultSeed'}`;

  const avatarUrl = userProfile?.avatar_url || user?.user_metadata?.avatar_url || getDefaultAvatarUrl(user?.id);

  // 通知処理用の関数
  const handleNotificationClick = (notification: Notification) => {
    // 未読の場合は既読にする
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
      setIsNotificationDropdownOpen(false);
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
    <header className="bg-gray-950/95 backdrop-blur-md text-white border-b border-gray-800 fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl tracking-tight">BeatNexus</span>
          </Link>

          {/* Main Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-1 flex-1 justify-center">
            <Link 
              to="/" 
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t('common.home')}
            </Link>
            <Link 
              to="/battles" 
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/battles') 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t('common.battles')}
            </Link>
            <Link 
              to="/ranking" 
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/ranking') 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t('common.ranking')}
            </Link>
            <Link 
              to="/community" 
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isActive('/community') 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {t('common.community')}
            </Link>
            <button
              className="upgrade-button"
              onClick={handleUpgradeClick}
              style={{
                alignItems: 'center',
                backgroundImage: 'linear-gradient(144deg, #af40ff, #5b42f3 50%, #00ddeb)',
                border: '0',
                borderRadius: '8px',
                boxShadow: 'rgba(151, 65, 252, 0.2) 0 15px 30px -5px',
                boxSizing: 'border-box',
                color: '#ffffff',
                display: 'flex',
                fontSize: '14px',
                justifyContent: 'center',
                lineHeight: '1em',
                maxWidth: '100%',
                minWidth: '100px',
                padding: '3px',
                textDecoration: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'manipulation',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.9)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span
                style={{
                  backgroundColor: 'rgb(5, 6, 45)',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  width: '100%',
                  height: '100%',
                  transition: '300ms',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(5, 6, 45)';
                }}
              >
                {t('common.upgrade')}
              </span>
            </button>
          </nav>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link 
                  to="/post"
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </Link>
                <NotificationDropdown />
                <HoverCard userProfile={userProfile}>
                  <Link 
                    to="/profile"
                    className="block w-10 h-10 rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-500/50 transition-colors"
                  >
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </Link>
                </HoverCard>
              </>
            ) : (
              <>
                <button
                  className="header-auth-button"
                  onClick={() => handleAuthClick('login')}
                >
                  <div className="header-auth-button-inner">
                    {t('common.login')}
                  </div>
                </button>
                <button
                  className="header-auth-button"
                  onClick={() => handleAuthClick('signup')}
                >
                  <div className="header-auth-button-inner">
                    {t('common.signup')}
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Actions */}
          <div className="md:hidden flex items-center space-x-3">
            {/* Mobile Notification Icon - ログインユーザーのみ表示 */}
            {user && (
              <div className="relative notification-dropdown-container">
                <button
                  onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                  className="relative p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Mobile Notification Dropdown */}
                {isNotificationDropdownOpen && (
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
                            setIsNotificationDropdownOpen(false);
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
            )}

            {/* Mobile Profile Icon - ログインユーザーのみ表示 */}
            {user && (
              <div className="relative profile-dropdown-container">
                <button 
                  className="w-8 h-8 rounded-lg overflow-hidden border border-gray-700 hover:border-cyan-500/50 transition-colors"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                >
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </button>
                
                {/* Mobile Profile Dropdown */}
                {isProfileDropdownOpen && (
                  <div className="fixed right-4 top-16 w-72 z-50">
                    <div className="bg-gray-900 rounded-lg border border-cyan-500/20 shadow-xl overflow-hidden">
                      {/* User Info Section */}
                      <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative">
                            <img
                              src={avatarUrl}
                              alt="Profile"
                              className="w-16 h-16 rounded-lg border-2 border-cyan-500/30"
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{userProfile?.username || user.email}</h3>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <Link 
                          to="/profile"
                          className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <User className="h-5 w-5" />
                          {t('hoverCard.profile')}
                        </Link>
                        <Link 
                          to="/my-battles"
                          className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <Crown className="h-5 w-5" />
                          {t('hoverCard.myBattles')}
                        </Link>
                        <Link 
                          to="/settings"
                          className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <Settings className="h-5 w-5" />
                          {t('hoverCard.settings')}
                        </Link>
                        <button 
                          className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                          onClick={async () => {
                            await signOut();
                            navigate('/');
                            setIsProfileDropdownOpen(false);
                          }}
                        >
                          <LogOut className="h-5 w-5" />
                          {t('hoverCard.logout')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Mobile menu button */}
          <button 
              className="text-gray-400 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex flex-col space-y-1">
              <Link 
                to="/" 
                className={`px-4 py-2 rounded-lg font-medium ${
                  isActive('/') 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('common.home')}
              </Link>
              <Link 
                to="/battles" 
                className={`px-4 py-2 rounded-lg font-medium ${
                  isActive('/battles') 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('common.battles')}
              </Link>
              <Link 
                to="/ranking" 
                className={`px-4 py-2 rounded-lg font-medium ${
                  isActive('/ranking') 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('common.ranking')}
              </Link>
              <Link 
                to="/community" 
                className={`px-4 py-2 rounded-lg font-medium ${
                  isActive('/community') 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {t('common.community')}
              </Link>
              <button
                className="upgrade-button-mobile"
                onClick={() => {
                  handleUpgradeClick();
                  setIsMenuOpen(false);
                }}
                style={{
                  alignItems: 'center',
                  backgroundImage: 'linear-gradient(144deg, #af40ff, #5b42f3 50%, #00ddeb)',
                  border: '0',
                  borderRadius: '8px',
                  boxShadow: 'rgba(151, 65, 252, 0.2) 0 15px 30px -5px',
                  boxSizing: 'border-box',
                  color: '#ffffff',
                  display: 'flex',
                  fontSize: '16px',
                  justifyContent: 'center',
                  lineHeight: '1em',
                  maxWidth: '100%',
                  width: '100%',
                  marginTop: '8px',
                  padding: '3px',
                  textDecoration: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.9)';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.9)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span
                  style={{
                    backgroundColor: 'rgb(5, 6, 45)',
                    padding: '16px 24px',
                    borderRadius: '6px',
                    width: '100%',
                    height: '100%',
                    transition: '300ms',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(5, 6, 45)';
                  }}
                >
                  {t('common.upgrade')}
                </span>
              </button>
            </nav>

            {!user && (
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-3 flex flex-col items-center">
                <button
                  className="header-auth-button"
                  onClick={() => {
                    handleAuthClick('login');
                    setIsMenuOpen(false);
                  }}
                >
                  <div className="header-auth-button-inner">
                    {t('common.login')}
                  </div>
                </button>
                <button
                  className="header-auth-button"
                  onClick={() => {
                    handleAuthClick('signup');
                    setIsMenuOpen(false);
                  }}
                >
                  <div className="header-auth-button-inner">
                    {t('common.signup')}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
};