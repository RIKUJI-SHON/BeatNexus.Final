import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ShoppingCart, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { HoverCard } from '../ui/HoverCard';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../store/authStore';
import { useAuthModal } from '../auth/AuthProvider';
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { openAuthModal } = useAuthModal();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

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

  return (
    <header className="bg-gray-950/95 backdrop-blur-md text-white border-b border-gray-800 fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center h-16 gap-8">
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

          {/* Mobile menu button */}
          <button 
            className="md:hidden text-gray-400 hover:text-white"
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

            {user ? (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center space-x-3 mb-3">
                  <Link 
                    to="/profile"
                    className="block w-10 h-10 rounded-lg overflow-hidden border border-gray-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div>
                    <div className="font-medium text-white leading-tight">{userProfile?.username || user.email}</div>
                    <Link 
                      to="/profile"
                      className="text-sm text-cyan-400 hover:underline"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
                <Link 
                  to="/post"
                  className="flex items-center px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 w-full text-left"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Plus className="h-5 w-5 mr-3" />
                  Post Content
                </Link>
                <button 
                  className="flex items-center px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 w-full text-left"
                  onClick={() => {
                    // Handle notifications click for mobile
                    setIsMenuOpen(false);
                  }}
                >
                  <Bell className="h-5 w-5 mr-3" />
                  Notifications
                </button>
                <button 
                  onClick={async () => {
                    await signOut();
                    navigate('/'); // ログアウト成功時にホームページにリダイレクト
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 w-full text-left mt-1"
                >
                  {t('common.logout')}
                </button>
              </div>
            ) : (
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