import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Loader,
  Instagram,
  Edit
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBattleStore } from '../store/battleStore';
import { useProfileSettingsModalStore } from '../store/profileSettingsModalStore';
import { supabase } from '../lib/supabase';
import { BattleCard } from '../components/battle/BattleCard';
import { ArchivedBattleCard } from '../components/battle/ArchivedBattleCard';
import { getDefaultAvatarUrl } from '../utils';
import { useCircularAvatar } from '../hooks/useCircularAvatar';
import { Battle, ArchivedBattle } from '../types';
import { useTranslation } from 'react-i18next';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  rating: number;
  season_points: number;
  created_at: string;
  instagram_id?: string;
}

interface UserStats {
  wins: number;
  currentKillstreak: number;
  highestKillstreak: number;
  plays: number;
}

interface UserBadge {
  id: string;
  name: string;
  image_url: string;
  rarity: string;
}

interface PublicUserReward {
  id: string;
  reward?: {
    name?: string;
    image_url?: string;
    rarity?: string;
  } | null;
}

const ProfilePageV2: React.FC = () => {
  const { t } = useTranslation();
  const { user: authUser } = useAuthStore();
  const { activeBattles, archivedBattles, fetchActiveBattles, fetchArchivedBattles } = useBattleStore();
  const { openModal: openProfileSettingsModal } = useProfileSettingsModalStore();
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [profileLoading, setProfileLoading] = useState(true);
  const [battleLoading, setBattleLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    wins: 0,
    currentKillstreak: 0,
    highestKillstreak: 0,
    plays: 0,
  });
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [showAllBattles, setShowAllBattles] = useState(false);

  const displayedUserId = routeUserId || authUser?.id;
  const isOwnProfile = !routeUserId || (authUser?.id === routeUserId);
  const circularAvatarUrl = useCircularAvatar(userProfile?.avatar_url);

  // プロフィール取得
  const fetchUserProfile = useCallback(async () => {
    if (!displayedUserId) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', displayedUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [displayedUserId]);

  // バトルデータ取得
  const fetchUserBattles = useCallback(async () => {
    if (!displayedUserId) return;
    setBattleLoading(true);
    try {
      await Promise.all([
        fetchActiveBattles(),
        fetchArchivedBattles()
      ]);
    } catch (error) {
      console.error('Error fetching battles:', error);
    } finally {
      setBattleLoading(false);
    }
  }, [displayedUserId, fetchActiveBattles, fetchArchivedBattles]);

  // バッジ取得
  const fetchUserBadges = useCallback(async () => {
    if (!displayedUserId) return;
    try {
      const { data, error } = await supabase.rpc('get_public_user_rewards', {
        p_user_id: displayedUserId,
      });

      if (error) throw error;

      const typedData = (data || []) as PublicUserReward[];

      const badges = typedData?.map((item) => ({
        id: item.id,
        name: item.reward?.name || 'Badge',
        image_url: item.reward?.image_url || '',
        rarity: item.reward?.rarity?.toUpperCase() || 'COMMON'
      })) || [];

      setUserBadges(badges);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  }, [displayedUserId]);

  // 統計計算
  const calculateStats = useCallback(() => {
    if (!displayedUserId) return;

    // ユーザーのアーカイブバトルをフィルタリング
    const userArchivedBattles = archivedBattles.filter(battle => {
      const isPlayer1 = battle.player1_user_id === displayedUserId;
      const isPlayer2 = battle.player2_user_id === displayedUserId;
      return displayedUserId && (isPlayer1 || isPlayer2);
    });

    const wins = userArchivedBattles.filter(battle => battle.winner_id === displayedUserId).length;
    const totalBattles = userArchivedBattles.length;

    // キルストリーク計算
    let currentStreak = 0;
    let highestStreak = 0;
    let tempStreak = 0;
    let isCurrentStreakSet = false; // 現在の連勝が設定されたかのフラグ

    // 最新から順に確認
    const sortedBattles = [...userArchivedBattles].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const battle of sortedBattles) {
      if (battle.winner_id === displayedUserId) {
        // 勝利の場合
        tempStreak++;
        
        // 最高連勝を更新
        if (tempStreak > highestStreak) {
          highestStreak = tempStreak;
        }
        
        // 現在の連勝をまだ設定していない場合（最新のバトルから連続している勝利）
        if (!isCurrentStreakSet) {
          currentStreak = tempStreak;
        }
      } else if (battle.winner_id !== null) {
        // 敗北の場合
        // 現在の連勝を確定
        if (!isCurrentStreakSet) {
          currentStreak = tempStreak;
          isCurrentStreakSet = true;
        }
        // 連勝をリセット
        tempStreak = 0;
      }
    }

    // 投稿数を取得（累計のsubmission数）
    // アクティブバトル + アーカイブバトルの合計
    const plays = totalBattles;

    setUserStats({
      wins,
      currentKillstreak: currentStreak,
      highestKillstreak: highestStreak,
      plays,
    });
  }, [displayedUserId, archivedBattles]);

  useEffect(() => {
    fetchUserProfile();
    fetchUserBattles();
    fetchUserBadges();
  }, [fetchUserProfile, fetchUserBattles, fetchUserBadges]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // プロフィール編集ハンドラー
  const handleEditProfile = () => {
    if (!isOwnProfile) return;
    openProfileSettingsModal('profile-page', fetchUserProfile);
  };

  // ユーザーのアクティブバトルをフィルタリング
  const userActiveBattles = activeBattles.filter(battle => {
    const battleWithIds = battle as Battle & { contestant_a_id?: string; contestant_b_id?: string };
    const isPlayer1 = battleWithIds.contestant_a_id === displayedUserId;
    const isPlayer2 = battleWithIds.contestant_b_id === displayedUserId;
    return displayedUserId && (isPlayer1 || isPlayer2);
  });

  // ユーザーのアーカイブバトルをフィルタリング
  const userArchivedBattles = archivedBattles.filter(battle => {
    const isPlayer1 = battle.player1_user_id === displayedUserId;
    const isPlayer2 = battle.player2_user_id === displayedUserId;
    return displayedUserId && (isPlayer1 || isPlayer2);
  });

  // すべてのバトル（アクティブ + アーカイブ）
  const allUserBattles = [...userActiveBattles, ...userArchivedBattles];
  const displayedBattles = showAllBattles ? allUserBattles : allUserBattles.slice(0, 7);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <Loader className="h-16 w-16 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('profilePageV2.userNotFound')}</h2>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
          >
            {t('profilePageV2.backToHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* コンテナ全体 */}
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        
        {/* トップセクション - 左右2列レイアウト */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
            
            {/* 左カラム: プロフィール情報 */}
            <div className="bg-[#0f1419] rounded-2xl p-6 border border-slate-700/50">
              {/* アバター画像 */}
              <div className="mb-6">
                <div className="relative mx-auto w-40 h-40">
                  <div className="rounded-full overflow-hidden border-2 border-slate-700">
                    <img
                      src={circularAvatarUrl || getDefaultAvatarUrl()}
                      alt={userProfile.username}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>
              </div>

              {/* ユーザー名 */}
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-white">{userProfile.username}</h1>
              </div>

              {/* Instagram */}
              {userProfile.instagram_id && (
                <div className="mb-4">
                  <a
                    href={`https://instagram.com/${userProfile.instagram_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-pink-400 hover:text-pink-300 transition-colors text-sm"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>@{userProfile.instagram_id}</span>
                  </a>
                </div>
              )}

              {/* Edit Profile Button */}
              {isOwnProfile && (
                <div className="mb-4">
                  <button
                    onClick={handleEditProfile}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Edit className="h-4 w-4" />
                    {t('profilePageV2.editProfile')}
                  </button>
                </div>
              )}
            </div>

            {/* 右カラム: Bio + 統計グリッド */}
            <div className="flex flex-col gap-6">
              
              {/* Bio - 左カラムの高さに合わせて伸縮 */}
              <div className="bg-[#0f1419] rounded-xl p-5 border border-slate-700/50 flex-1 flex items-start">
                {userProfile.bio ? (
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {userProfile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    {t('profilePageV2.noBio')}
                  </p>
                )}
              </div>

              {/* 統計グリッド */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* WINS */}
                <div className="bg-gradient-to-br from-teal-900/40 to-teal-800/20 rounded-xl p-5 border border-teal-700/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-teal-500/20 hover:border-teal-500/50 cursor-pointer">
                  <div className="text-xs text-gray-400 uppercase mb-2 font-semibold tracking-wide">{t('profilePageV2.stats.wins')}</div>
                  <div className="flex items-center gap-3">
                    <img src="/images/win.png" alt="" className="h-6 w-6" aria-hidden="true" />
                    <span className="text-3xl font-bold text-white">{userStats.wins}</span>
                  </div>
                </div>

                {/* CURRENT WIN STREAK */}
                <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 rounded-xl p-5 border border-orange-700/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 hover:border-orange-500/50 cursor-pointer">
                  <div className="text-xs text-gray-400 uppercase mb-2 font-semibold tracking-wide">{t('profilePageV2.stats.currentWinStreak')}</div>
                  <div className="flex items-center gap-3">
                    <Zap className="h-6 w-6 text-orange-400" />
                    <span className="text-3xl font-bold text-white">{userStats.currentKillstreak}</span>
                  </div>
                </div>

                {/* HIGHEST WIN STREAK */}
                <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-xl p-5 border border-amber-700/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20 hover:border-amber-500/50 cursor-pointer">
                  <div className="text-xs text-gray-400 uppercase mb-2 font-semibold tracking-wide">{t('profilePageV2.stats.highestWinStreak')}</div>
                  <div className="flex items-center gap-3">
                    <Zap className="h-6 w-6 text-amber-400" />
                    <span className="text-3xl font-bold text-white">{userStats.highestKillstreak}</span>
                  </div>
                </div>

                {/* PLAYS */}
                <div className="bg-gradient-to-br from-violet-900/40 to-violet-800/20 rounded-xl p-5 border border-violet-700/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/20 hover:border-violet-500/50 cursor-pointer">
                  <div className="text-xs text-gray-400 uppercase mb-2 font-semibold tracking-wide">{t('profilePageV2.stats.plays')}</div>
                  <div className="flex items-center gap-3">
                    <img src="/images/VS.png" alt="" className="h-6 w-6" aria-hidden="true" />
                    <span className="text-3xl font-bold text-white">{userStats.plays}</span>
                  </div>
                </div>

              </div>
              {/* 統計グリッド終了 */}

            </div>
            {/* 右カラム終了 */}

          </div>
        </div>

        {/* レスポンシブレイアウト */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* メインコンテンツ */}
          <main className="flex-1">

            {/* 2カラムレイアウト */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
              
              {/* 左カラム: 過去のバトル */}
              <div className="order-2 lg:order-1">
                <div className="flex items-center gap-2 mb-4">
                  <img src="/images/VS.png" alt="" className="h-5 w-5" aria-hidden="true" />
                  <h2 className="text-xl font-bold uppercase">{t('profilePageV2.sections.pastBattles')}</h2>
                </div>

                {battleLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader className="h-8 w-8 text-cyan-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* バトルカードを縦並びに表示 */}
                    <div className="space-y-4">
                      {displayedBattles.length > 0 ? (
                        displayedBattles.map((battle) => (
                          <div key={battle.id}>
                            {'winner_id' in battle && 'final_votes_a' in battle ? (
                              <ArchivedBattleCard battle={battle as ArchivedBattle} />
                            ) : (
                              <BattleCard battle={battle as Battle} />
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="bg-[#181818] rounded-lg p-8 text-center text-gray-400">
                          <img src="/images/VS.png" alt="" className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                          <p>{t('profilePageV2.battles.noBattles')}</p>
                        </div>
                      )}
                    </div>

                    {/* LOAD MORE BATTLES ボタン */}
                    {allUserBattles.length > 7 && !showAllBattles && (
                      <button
                        onClick={() => setShowAllBattles(true)}
                        className="w-full mt-4 py-3 bg-[#181818] hover:bg-[#282828] rounded-lg text-sm font-semibold uppercase transition-colors"
                      >
                        {t('profilePageV2.battles.loadMore')}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* 右カラム: Achievements */}
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-2 mb-4">
                  <img src="/images/Tournaments.png" alt="" className="h-5 w-5" aria-hidden="true" />
                  <h2 className="text-xl font-bold uppercase">{t('profilePageV2.sections.achievements')}</h2>
                  <span className="text-sm text-gray-500 uppercase">{t('profilePageV2.sections.achievements')}</span>
                </div>

                {/* バッジグリッド */}
                <div className="grid grid-cols-2 gap-3">
                  {userBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-[#181818] rounded-lg p-4 text-center hover:bg-[#282828] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer"
                    >
                      <img
                        src={badge.image_url}
                        alt={badge.name}
                        className="w-16 h-16 mx-auto mb-2 object-contain"
                      />
                      <div className="text-xs font-semibold mb-1">{badge.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase">{badge.rarity}</div>
                    </div>
                  ))}

                  {userBadges.length === 0 && (
                    <div className="col-span-2 bg-[#181818] rounded-lg p-8 text-center text-gray-400">
                      <img src="/images/Tournaments.png" alt="" className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                      <p className="text-sm">{t('profilePageV2.badges.noBadges')}</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </main>

        </div>
      </div>
    </div>
  );
};

export default ProfilePageV2;
