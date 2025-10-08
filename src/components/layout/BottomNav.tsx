import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useAuthModal } from '../auth/AuthProvider';
import { getDefaultAvatarUrl } from '../../utils';
import { supabase } from '../../lib/supabase';

/**
 * Mobile Bottom Navigation Bar
 * Buttons:
 *  - Battles (/battles)
 *  - Ranking (/ranking) uses provided icon
 *  - Central Post (/post) enlarged VS button
 *  - Subscription (/subscription)
 *  - Profile (opens existing profile dropdown via navigation to /profile)
 *  - When not authenticated, profile tap opens auth modal (login)
 * 
 * Display: only < md (Tailwind breakpoint) and when not on certain pages (optional future refinement)
 */
export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { openAuthModal } = useAuthModal();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { t } = useTranslation();

  interface UserProfile { id: string; username?: string; avatar_url?: string; season_points?: number; }
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, season_points')
            .eq('id', user.id)
            .single();
          if (data) setUserProfile(data);
        } catch (e) {
          console.error('[BottomNav] Failed to fetch profile', e);
        }
      })();
    } else {
      setUserProfile(null);
    }
  }, [user]);
  useEffect(() => { /* placeholder if future client-only logic needed */ }, []);

  const isActive = (path: string) => location.pathname === path;

  // Prefer profile.avatar_url -> auth.user_metadata.avatar_url -> default
  const avatarUrl = (userProfile?.avatar_url && userProfile.avatar_url.trim() !== '')
    ? userProfile.avatar_url
    : (user?.user_metadata?.avatar_url || getDefaultAvatarUrl());

  // Hide on desktop
  // We also add bottom padding to body main content elsewhere to avoid overlap (handled when integrating)
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-md border-t border-gray-800 safe-area-inset-b"
      aria-label="Bottom navigation"
    >
      <div className="relative flex items-center justify-between px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)_+_0.5rem)]">
        {/* Home */}
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${isActive('/') ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
          aria-label="Home"
        >
          <span className={`w-10 h-10 flex items-center justify-center rounded-xl ${isActive('/') ? 'bg-cyan-500/20 ring-1 ring-cyan-400/50 shadow-cyan-500/20' : 'bg-gray-800/40'} shadow-inner`}> 
            <img src="/images/home.png" alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
          </span>
          <span className="leading-none">Home</span>
        </button>

        {/* Ranking */}
        <button
          onClick={() => navigate('/ranking')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${isActive('/ranking') ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
          aria-label="Ranking"
        >
          <span className={`w-10 h-10 flex items-center justify-center rounded-xl ${isActive('/ranking') ? 'bg-cyan-500/20 ring-1 ring-cyan-400/50 shadow-cyan-500/20' : 'bg-gray-800/40'} shadow-inner`}> 
            <img src="/images/Ranking_icon.png" alt="" className="w-6 h-6 object-contain" aria-hidden="true" />
          </span>
          <span className="leading-none">Ranking</span>
        </button>

        {/* Central Post VS button */}
        <div className="-mt-10 flex flex-col items-center">
          <button
            onClick={() => navigate('/post')}
            className="relative group rounded-full bg-gradient-to-br from-fuchsia-600 via-purple-600 to-cyan-500 p-[3px] shadow-lg shadow-fuchsia-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
            aria-label="Start Battle"
          >
            <div className="rounded-full w-16 h-16 flex items-center justify-center group-active:scale-95 transition-transform bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
              <img src="/images/VS.png" alt="" className="w-10 h-10 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" aria-hidden="true" />
            </div>
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full animate-pulse bg-cyan-500/10 blur-xl" aria-hidden="true" />
          </button>
          <span className="mt-1 text-[10px] font-semibold tracking-wide text-cyan-300">POST</span>
        </div>

        {/* Subscription / Shop */}
        <button
          onClick={() => navigate('/subscription')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${isActive('/subscription') ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
          aria-label="Shop"
        >
          <span className={`w-10 h-10 flex items-center justify-center rounded-xl ${isActive('/subscription') ? 'bg-cyan-500/20 ring-1 ring-cyan-400/50 shadow-cyan-500/20' : 'bg-gray-800/40'} shadow-inner`}>🛒</span>
          <span className="leading-none">Shop</span>
        </button>

        {/* Profile with same dropdown UI as Header mobile */}
        <div className="relative">
          <button
            onClick={() => {
              if (!user) { openAuthModal('login'); return; }
              setIsProfileOpen(o => !o);
            }}
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${(isActive('/profile') || isProfileOpen) ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
            aria-haspopup="menu"
            aria-expanded={isProfileOpen}
            aria-label="Profile"
          >
            <span className={`w-10 h-10 flex items-center justify-center rounded-full overflow-hidden ${(isActive('/profile') || isProfileOpen) ? 'ring-1 ring-cyan-400/50 bg-cyan-500/20 shadow-cyan-500/20' : 'bg-gray-800/40'} shadow-inner`}> 
              <img src={avatarUrl} alt={user?.user_metadata?.username ? `${user.user_metadata.username}のプロフィール画像` : 'プロフィール画像'} className="w-full h-full object-cover" />
            </span>
            <span className="leading-none">Profile</span>
          </button>
          {isProfileOpen && user && (
            <div className="fixed right-4 bottom-20 w-72 z-[60]">
              <div className="bg-gray-900 rounded-lg border border-cyan-500/20 shadow-xl overflow-hidden">
                {/* User Info Section (same as Header) */}
                <div className="p-4 bg-gradient-to-r from-gray-800 to-gray-900">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-16 h-16 rounded-full border-2 border-cyan-500/30"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{userProfile?.username || user.email}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm text-cyan-400 font-semibold">
                          {userProfile?.season_points ?? 1200}
                        </span>
                        <span className="text-xs text-gray-400">SP</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Menu Items */}
                <div className="p-2">
                  <button
                    onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t('hoverCard.profile')}
                  </button>
                  <button
                    onClick={() => { navigate('/my-battles'); setIsProfileOpen(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t('hoverCard.myBattles')}
                  </button>
                  <button
                    onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t('hoverCard.settings')}
                  </button>
                  <button
                    onClick={async () => { await signOut(); navigate('/'); setIsProfileOpen(false); }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {t('hoverCard.logout')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;