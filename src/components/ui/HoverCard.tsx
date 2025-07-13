import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, User, Settings, LogOut, Crown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { getDefaultAvatarUrl } from '../../utils';

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

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  userProfile?: UserProfile | null;
}

export const HoverCard: React.FC<HoverCardProps> = ({ children, className, userProfile }) => {
  const { t } = useTranslation();
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Only attempt to sign out if there's a user
      if (user) {
        await signOut();
        navigate('/'); // ログアウト成功時にホームページにリダイレクト
      }
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };

  const displayName = userProfile?.username || user?.user_metadata?.username || user?.email || 'User';
  const avatarUrl = userProfile?.avatar_url || user?.user_metadata?.avatar_url || getDefaultAvatarUrl();

  return (
    <div className="group relative">
      {children}
      <div className="invisible group-hover:visible fixed right-4 top-16 w-72 opacity-0 group-hover:opacity-100 transition-all duration-300 z-50">
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
                <button className="absolute -bottom-1 -right-1 p-1 bg-gray-900/80 rounded-md border border-gray-700 text-gray-400 hover:text-white">
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{displayName}</h3>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <Link 
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <User className="h-5 w-5" />
              {t('hoverCard.profile')}
            </Link>
            <Link 
              to="/my-battles"
              className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Crown className="h-5 w-5" />
              {t('hoverCard.myBattles')}
            </Link>
            <Link 
              to="/settings"
              className="flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5" />
              {t('hoverCard.settings')}
            </Link>
            <button 
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {t('hoverCard.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}