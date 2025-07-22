import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy,
  Play,
  Users,
  Target,
  Loader,
  Pencil,
  Archive,
  Save,
  X,
  Medal
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AvatarUpload } from '../components/profile/AvatarUpload';
import { BattleCard } from '../components/battle/BattleCard';
import { ArchivedBattleCard } from '../components/battle/ArchivedBattleCard';
import { useAuthStore } from '../store/authStore';
import { useBattleStore } from '../store/battleStore';
import { supabase } from '../lib/supabase';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { toast } from '../store/toastStore';
import { useTranslation } from 'react-i18next';
import { trackBeatNexusEvents } from '../utils/analytics';
import { getDefaultAvatarUrl } from '../utils';
import { Battle } from '../types';
import CollectionPage from '../components/rewards/CollectionPage';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  rating: number;
  season_points: number;
  created_at: string;
  updated_at: string;
}

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user: authUser } = useAuthStore();
  const { activeBattles, archivedBattles, fetchActiveBattles, fetchArchivedBattles } = useBattleStore();
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [battleLoading, setBattleLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'collection'>('current');
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  
  const displayedUserId = routeUserId || authUser?.id;
  const isOwnProfile = !routeUserId || (authUser?.id === routeUserId);

  useEffect(() => {
    if (displayedUserId) {
      // Track profile view event
      trackBeatNexusEvents.profileView(displayedUserId);
    }
  }, [displayedUserId]);

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
      if (isOwnProfile) {
        setEditUsername(data?.username || '');
        setEditBio(data?.bio || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error(t('profilePage.toasts.errorTitle'), t('profilePage.toasts.loadProfileError'));
    } finally {
      setProfileLoading(false);
    }
  }, [displayedUserId, isOwnProfile, t]);

  const fetchUserBattles = useCallback(async () => {
    if (!displayedUserId) return;
    setBattleLoading(true);
    try {
      // グローバルバトルデータを更新
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

  useEffect(() => {
    fetchUserProfile();
    fetchUserBattles();
  }, [fetchUserProfile, fetchUserBattles]);

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    setUserProfile((prev) => prev ? { ...prev, avatar_url: newAvatarUrl } : null);
    toast.success(t('profilePage.toasts.successTitle'), t('profilePage.toasts.avatarUpdateSuccess'));
  };

  const handleEditToggle = () => {
    if (!isOwnProfile) return;
    if (isEditing && userProfile) {
      setEditUsername(userProfile.username);
      setEditBio(userProfile.bio || '');
    }
    setIsEditing(!isEditing);
  };

  const handleProfileSave = async () => {
    if (!authUser || !userProfile || !isOwnProfile) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.rpc('update_user_profile_details', {
        p_user_id: displayedUserId,
        p_username: editUsername,
        p_bio: editBio,
      });

      if (error || (data && data.success === false)) {
        throw error || new Error(data?.error || t('profilePage.toasts.profileUpdateFailedDB'));
      }
      
      setUserProfile(data.profile);
      setIsEditing(false);
      
      // Track profile edit event
      trackBeatNexusEvents.profileEdit();
      
      toast.success(t('profilePage.toasts.successTitle'), t('profilePage.toasts.profileUpdateSuccess'));
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : t('profilePage.toasts.profileUpdateFailed');
      toast.error(t('profilePage.toasts.errorTitle'), errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // デバッグ用のコンソールログ
  console.log('Profile Page Debug:', {
    displayedUserId,
    activeBattlesCount: activeBattles.length,
    archivedBattlesCount: archivedBattles.length,
    activeBattles: activeBattles.slice(0, 3), // 最初の3つだけ表示
    archivedBattles: archivedBattles.slice(0, 3), // 最初の3つだけ表示
  });

  // ユーザーのアクティブバトルをフィルタリング
  const userActiveBattles = activeBattles.filter(battle => {
    // battleStoreで変換されたcontestant_a_id/contestant_b_idを使用
    const battleWithIds = battle as Battle & { contestant_a_id?: string; contestant_b_id?: string };
    const isPlayer1 = battleWithIds.contestant_a_id === displayedUserId;
    const isPlayer2 = battleWithIds.contestant_b_id === displayedUserId;
    const result = displayedUserId && (isPlayer1 || isPlayer2);
    
    if (result) {
      console.log('Found user active battle:', {
        battleId: battle.id,
        isPlayer1,
        isPlayer2,
        contestant_a_id: battleWithIds.contestant_a_id,
        contestant_b_id: battleWithIds.contestant_b_id,
        displayedUserId
      });
    }
    
    return result;
  });

  // ユーザーのアーカイブバトルをフィルタリング
  const userArchivedBattles = archivedBattles.filter(battle => {
    const isPlayer1 = battle.player1_user_id === displayedUserId;
    const isPlayer2 = battle.player2_user_id === displayedUserId;
    const result = displayedUserId && (isPlayer1 || isPlayer2);
    
    if (result) {
      console.log('Found user archived battle:', {
        battleId: battle.id,
        isPlayer1,
        isPlayer2,
        player1_user_id: battle.player1_user_id,
        player2_user_id: battle.player2_user_id,
        winner_id: battle.winner_id,
        displayedUserId
      });
    }
    
    return result;
  });

  // 勝利数を計算
  const userWins = userArchivedBattles.filter(battle => battle.winner_id === displayedUserId).length;
  
  // 統計ログ
  console.log('Profile Stats:', {
    totalBattles: userActiveBattles.length + userArchivedBattles.length,
    wins: userWins,
    activeBattles: userActiveBattles.length,
    archivedBattles: userArchivedBattles.length,
    userActiveBattles: userActiveBattles.map(b => ({ id: b.id, contestants: [b.player1_user_id, b.player2_user_id] })),
    userArchivedBattles: userArchivedBattles.map(b => ({ id: b.id, players: [b.player1_user_id, b.player2_user_id], winner: b.winner_id }))
  });
  
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <Loader className="h-16 w-16 text-cyan-500 animate-spin" />
            <div className="absolute inset-0 blur-xl bg-cyan-400/20 rounded-full animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-200">読み込み中...</h2>
            <p className="text-slate-400">プロフィールデータを取得しています</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="relative">
            <Users className="h-24 w-24 text-slate-600 mx-auto" />
            <div className="absolute inset-0 blur-xl bg-slate-400/10 rounded-full" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-200">
              {displayedUserId ? t('profilePage.userNotFound.title') : t('profilePage.profileUnavailable.title')}
            </h2>
            <p className="text-slate-400 leading-relaxed">
              {displayedUserId ? t('profilePage.userNotFound.description') : t('profilePage.profileUnavailable.description')}
            </p>
          </div>
          <Button 
            onClick={() => navigate('/')} 
            variant="primary" 
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25"
          >
            {t('profilePage.userNotFound.homeButton')}
          </Button>
        </div>
      </div>
    );
  }
  


  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Profile Header */}
      <div className="relative pt-16 pb-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(15,23,42,0.8)_100%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12">
            {/* Avatar Section - Fixed positioning with consistent centering */}
            <div className="relative flex-shrink-0 flex flex-col items-center">
              <div className="relative group w-32 h-32 md:w-40 md:h-40">
                {isEditing && isOwnProfile ? (
                  <div className="w-full h-full">
                    <AvatarUpload 
                      currentAvatarUrl={userProfile.avatar_url}
                      onAvatarUpdate={handleAvatarUpdate} 
                      isEditing={isEditing}
                      userId={userProfile.id}
                      className="w-32 h-32 md:w-40 md:h-40"
                      compact={true}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <img 
                      src={userProfile.avatar_url || getDefaultAvatarUrl()} 
                      alt={userProfile.username} 
                      className="w-full h-full rounded-full border-4 border-slate-700 shadow-2xl object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Glow Effect */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg" />
                  </div>
                )}
              </div>
              
              {/* 編集モード時のアバター変更ヒント */}
              {isEditing && isOwnProfile && (
                <div className="mt-4 text-center">
                  <span className="text-xs text-slate-400">クリックで画像変更</span>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center lg:text-left space-y-4 w-full lg:w-auto">
              {isEditing && isOwnProfile ? (
                <div className="space-y-6">
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder={t('profilePage.edit.usernamePlaceholder')}
                    className="text-2xl md:text-3xl font-bold text-slate-50 bg-slate-800 border-slate-700 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 w-full"
                  />
                  
                  {/* Rating Badges - 通算レートとシーズンレート */}
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                    {/* 通算レート */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-500/30">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      <span className="text-lg font-semibold text-slate-50">{userProfile.rating}</span>
                      <span className="text-sm text-slate-300">{t('profilePage.overallRating')}</span>
                    </div>
                    
                    {/* シーズンレート */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full border border-cyan-500/30">
                      <Medal className="h-5 w-5 text-cyan-400" />
                      <span className="text-lg font-semibold text-slate-50">{userProfile.season_points}</span>
                      <span className="text-sm text-slate-300">{t('profilePage.seasonRating')}</span>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder={t('profilePage.edit.bioPlaceholder')}
                    className="text-slate-300 bg-slate-800 border-slate-700 focus:ring-cyan-500 focus:border-cyan-500 resize-none transition-all duration-300 w-full"
                    rows={3}
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-50 leading-tight">
                    {userProfile.username}
                  </h1>
                  
                  {/* Rating Badges - 通算レートとシーズンレート */}
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                    {/* 通算レート */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-500/30">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      <span className="text-lg font-semibold text-slate-50">{userProfile.rating}</span>
                      <span className="text-sm text-slate-300">{t('profilePage.overallRating')}</span>
                    </div>
                    
                    {/* シーズンレート */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full border border-cyan-500/30">
                      <Medal className="h-5 w-5 text-cyan-400" />
                      <span className="text-lg font-semibold text-slate-50">{userProfile.season_points}</span>
                      <span className="text-sm text-slate-300">{t('profilePage.seasonRating')}</span>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
                    {userProfile.bio || t('profilePage.edit.noBio')}
                  </p>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {isOwnProfile && (
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-shrink-0 mt-6 lg:mt-0">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={handleProfileSave} 
                      variant="primary" 
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-green-500/25 w-full sm:w-auto" 
                      isLoading={isSaving} 
                      leftIcon={<Save className="h-4 w-4"/>}
                    >
                      {t('profilePage.edit.saveButton')}
                    </Button>
                    <Button 
                      onClick={handleEditToggle} 
                      variant="outline" 
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 transition-all duration-300 w-full sm:w-auto"
                      leftIcon={<X className="h-4 w-4"/>}
                    >
                      {t('profilePage.edit.cancelButton')}
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleEditToggle} 
                    variant="outline" 
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-500 transition-all duration-300 w-full sm:w-auto"
                    leftIcon={<Pencil className="h-4 w-4"/>}
                  >
                    {t('profilePage.edit.editButton')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Main Content Area - Tabs for Battles and Posts */}
      <div className="container mx-auto px-4 py-12">
        <div className="w-full max-w-6xl mx-auto">
          {/* Enhanced Tab Navigation */}
          <div className="relative mb-12">
            <div className="flex border-b border-slate-700/50 bg-slate-800/30 rounded-t-2xl p-2">
              {[
                { key: 'current', label: t('profilePage.tabs.currentBattles'), icon: Play },
                { key: 'history', label: t('profilePage.tabs.battleHistory'), icon: Archive },
                { key: 'collection', label: t('profilePage.tabs.collection'), icon: Medal }
              ].map((tab) => (
                <button 
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)} 
                  className={`group relative flex items-center gap-2 py-3 px-6 font-medium transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                    activeTab === tab.key 
                      ? 'text-cyan-400 bg-slate-700/50' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  <tab.icon className={`h-4 w-4 transition-all duration-300 ${
                    activeTab === tab.key ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`} />
                  <span className="relative">
                    {tab.label}
                    {activeTab === tab.key && (
                      <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {battleLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="h-12 w-12 text-cyan-500 animate-spin mb-4" />
              <p className="text-slate-400 text-lg">{t('common.loading')}...</p>
            </div>
          )}

          {/* Current Battles Tab */}
          {!battleLoading && activeTab === 'current' && (
            <div className="animate-fade-in">
              {userActiveBattles.length > 0 ? (
                <div className="space-y-6">
                  {userActiveBattles.map(battle => (
                    <div key={battle.id} className="transform transition-all duration-300 hover:-translate-y-1">
                      <BattleCard battle={battle} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`
                  flex flex-col items-center justify-center
                  py-16 px-8 text-center
                  bg-gradient-to-br from-slate-800/40 to-slate-700/30
                  rounded-xl border border-slate-600/30
                `}>
                  {/* アイコン */}
                  <div className="relative mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-700/60 to-slate-600/40 rounded-2xl flex items-center justify-center border border-slate-500/30">
                      <Target className="w-12 h-12 text-slate-400" />
                    </div>
                    
                    {/* 装飾的なグロー効果 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-2xl blur-xl opacity-50" />
                  </div>

                  {/* メッセージ */}
                  <div className="space-y-4 max-w-md">
                    <h3 className="text-xl font-semibold text-slate-200">
                      {t('profilePage.battles.noActiveBattlesTitle')}
                    </h3>
                    
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t('profilePage.battles.noActiveBattlesDescription')}
                    </p>
                    
                    {/* ヒント */}
                    <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-600/40">
                      <p className="text-cyan-300 text-xs font-medium flex items-center justify-center gap-2">
                        <Target className="w-4 h-4" />
                        新しいバトルに参加してスキルを試そう！
                      </p>
                    </div>
                  </div>

                  {/* 装飾的なパーティクル */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400/20 rounded-full animate-pulse" />
                    <div className="absolute top-20 right-16 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute bottom-16 left-20 w-1.5 h-1.5 bg-amber-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                    <div className="absolute bottom-10 right-10 w-2 h-2 bg-pink-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Battle History Tab */}
          {!battleLoading && activeTab === 'history' && (
            <div className="animate-fade-in">
              {userArchivedBattles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {userArchivedBattles.map(battle => (
                    <div key={battle.id} className="transform transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]">
                      <ArchivedBattleCard battle={battle} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`
                  flex flex-col items-center justify-center
                  py-16 px-8 text-center
                  bg-gradient-to-br from-slate-800/40 to-slate-700/30
                  rounded-xl border border-slate-600/30
                `}>
                  {/* アイコン */}
                  <div className="relative mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-700/60 to-slate-600/40 rounded-2xl flex items-center justify-center border border-slate-500/30">
                      <Archive className="w-12 h-12 text-slate-400" />
                    </div>
                    
                    {/* 装飾的なグロー効果 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-slate-600/10 rounded-2xl blur-xl opacity-50" />
                  </div>

                  {/* メッセージ */}
                  <div className="space-y-4 max-w-md">
                    <h3 className="text-xl font-semibold text-slate-200">
                      {t('profilePage.battles.noArchivedBattlesTitle')}
                    </h3>
                    
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {t('profilePage.battles.noArchivedBattlesDescription')}
                    </p>
                    
                    {/* ヒント */}
                    <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-600/40">
                      <p className="text-cyan-300 text-xs font-medium flex items-center justify-center gap-2">
                        <Archive className="w-4 h-4" />
                        {t('profilePage.emptyStates.battleHistory')}
                      </p>
                    </div>
                  </div>

                  {/* 装飾的なパーティクル */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400/20 rounded-full animate-pulse" />
                    <div className="absolute top-20 right-16 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute bottom-16 left-20 w-1.5 h-1.5 bg-amber-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                    <div className="absolute bottom-10 right-10 w-2 h-2 bg-pink-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* コレクション */}
          {!battleLoading && activeTab === 'collection' && (
            <CollectionPage userId={displayedUserId!} isOwnProfile={isOwnProfile} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;