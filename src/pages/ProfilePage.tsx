import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy,
  Play,
  Users,
  Target,
  Heart,
  MessageCircle,
  ExternalLink,
  Clock,
  Loader,
  Pencil,
  Trash2,
  Sword,
  Archive,
  Save,
  X,
  FileText
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AvatarUpload } from '../components/profile/AvatarUpload';
import { RankProgressBar } from '../components/profile/RankProgressBar';
import { BattleCard } from '../components/battle/BattleCard';
import { ArchivedBattleCard } from '../components/battle/ArchivedBattleCard';
import { useAuthStore } from '../store/authStore';
import { useBattleStore } from '../store/battleStore';
import { supabase } from '../lib/supabase';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { toast } from '../store/toastStore';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { calculateRankProgress } from '../lib/rankUtils';
import { trackBeatNexusEvents } from '../utils/analytics';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes: number;
  comments: number;
}

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

const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user: authUser } = useAuthStore();
  const { activeBattles, archivedBattles, fetchActiveBattles, fetchArchivedBattles } = useBattleStore();
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [battleLoading, setBattleLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'posts'>('current');
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    activeBattlesCount: 0,
    archivedBattlesCount: 0,
    winsCount: 0
  });
  
  const displayedUserId = routeUserId || authUser?.id;
  const isOwnProfile = !routeUserId || (authUser?.id === routeUserId);

  useEffect(() => {
    if (displayedUserId) {
      // Track profile view event
      trackBeatNexusEvents.profileView(displayedUserId);
      
      fetchUserPosts();
      fetchUserProfile();
      fetchUserBattles();
    } else {
      setLoading(false);
      setBattleLoading(false);
      setProfileLoading(false);
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
  }, [displayedUserId, authUser?.id]);

  const fetchUserBattles = async () => {
    if (!displayedUserId) return;
    setBattleLoading(true);
    try {
      // グローバルバトルデータを更新
      await Promise.all([
        fetchActiveBattles(),
        fetchArchivedBattles()
      ]);
      
      // ユーザー専用の戦績統計を直接データベースから取得
      await fetchUserStats();
    } catch (error) {
      console.error('Error fetching battles:', error);
    } finally {
      setBattleLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!displayedUserId) return;
    
    try {
      // アクティブバトル数
      const { count: activeCount, error: activeError } = await supabase
        .from('active_battles')
        .select('*', { count: 'exact', head: true })
        .or(`player1_user_id.eq.${displayedUserId},player2_user_id.eq.${displayedUserId}`);

      if (activeError) {
        console.error('Error fetching active battles count:', activeError);
      }

      // アーカイブバトル数
      const { count: archivedCount, error: archivedError } = await supabase
        .from('archived_battles')
        .select('*', { count: 'exact', head: true })
        .or(`player1_user_id.eq.${displayedUserId},player2_user_id.eq.${displayedUserId}`);

      if (archivedError) {
        console.error('Error fetching archived battles count:', archivedError);
      }

      // 勝利数
      const { count: winsCount, error: winsError } = await supabase
        .from('archived_battles')
        .select('*', { count: 'exact', head: true })
        .eq('winner_id', displayedUserId);

      if (winsError) {
        console.error('Error fetching wins count:', winsError);
      }

      // 統計を更新
      const newStats = {
        activeBattlesCount: activeCount || 0,
        archivedBattlesCount: archivedCount || 0,
        winsCount: winsCount || 0
      };

      console.log('User Stats Direct Query:', {
        displayedUserId,
        ...newStats
      });

      setUserStats(newStats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };
  
  const fetchUserPosts = async () => {
    if (!displayedUserId) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', displayedUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(t('profilePage.toasts.errorTitle'), error.message || t('profilePage.toasts.profileUpdateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent })
        .eq('id', postId);

      if (error) throw error;
      
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, content: editContent }
          : post
      ));
      setEditingPost(null);
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm(t('profilePage.posts.deleteConfirmation'))) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const currentLocale = i18n.language === 'ja' ? ja : enUS;
    return format(new Date(dateString), 'P', { locale: currentLocale });
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
    const battleWithIds = battle as any;
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
  
  const getDefaultAvatarUrl = (seed?: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed || 'defaultSeed'}`;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader className="h-12 w-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-8">
        <Users className="h-24 w-24 text-gray-700 mb-6" />
        <h2 className="text-3xl font-bold text-gray-400 mb-2">{displayedUserId ? t('profilePage.userNotFound.title') : t('profilePage.profileUnavailable.title')}</h2>
        <p className="text-gray-500 mb-8 text-center max-w-md">
          {displayedUserId ? t('profilePage.userNotFound.description') : t('profilePage.profileUnavailable.description')}
        </p>
        <Button onClick={() => navigate('/')} variant="primary" className="bg-cyan-600 hover:bg-cyan-700">
          {t('profilePage.userNotFound.homeButton')}
        </Button>
      </div>
    );
  }
  
  const stats = [
    { 
      name: t('profilePage.stats.battles'), 
      value: userStats.activeBattlesCount + userStats.archivedBattlesCount, 
      icon: Sword 
    },
    { 
      name: t('profilePage.stats.wins'), 
      value: userStats.winsCount, 
      icon: Trophy 
    },
    { 
      name: t('profilePage.stats.active'), 
      value: userStats.activeBattlesCount, 
      icon: Play 
    },
    { 
      name: t('profilePage.stats.archived'), 
      value: userStats.archivedBattlesCount, 
      icon: Archive 
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Profile Header */}
      <div className="relative pt-16 pb-24 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end">
            <div className="relative mb-6 md:mb-0 md:mr-8">
              {isEditing && isOwnProfile ? (
                <AvatarUpload 
                  currentAvatarUrl={userProfile.avatar_url}
                  onAvatarUpdate={handleAvatarUpdate} 
                  isEditing={isEditing}
                  userId={userProfile.id}
                  className="w-40 h-40"
                />
              ) : (
                <img 
                  src={userProfile.avatar_url || getDefaultAvatarUrl(userProfile.username)} 
                  alt={userProfile.username} 
                  className="w-40 h-40 rounded-full border-4 border-gray-800 shadow-lg object-cover"
                />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              {isEditing && isOwnProfile ? (
                <Input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder={t('profilePage.edit.usernamePlaceholder')}
                  className="text-4xl font-bold text-white bg-gray-800 border-gray-700 mb-2 w-full md:w-auto"
                />
              ) : (
                <h1 className="text-4xl font-bold text-white mb-1">{userProfile.username}</h1>
              )}
              <p className="text-gray-400 mb-3">{t('profilePage.seasonRating')}: {userProfile.rating}</p>
              {isEditing && isOwnProfile ? (
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder={t('profilePage.edit.bioPlaceholder')}
                  className="text-gray-300 bg-gray-800 border-gray-700 resize-none w-full"
                  rows={3}
                />
              ) : (
                <p className="text-gray-300 max-w-xl leading-relaxed">{userProfile.bio || t('profilePage.edit.noBio')}</p>
              )}
            </div>
            {isOwnProfile && (
              <div className="mt-6 md:mt-0 md:ml-auto flex gap-3">
                {isEditing ? (
                  <>
                    <Button onClick={handleProfileSave} variant="primary" className="bg-green-600 hover:bg-green-700" isLoading={isSaving} leftIcon={<Save className="h-4 w-4"/>}>
                      {t('profilePage.edit.saveButton')}
                    </Button>
                    <Button onClick={handleEditToggle} variant="ghost" leftIcon={<X className="h-4 w-4"/>}>
                      {t('profilePage.edit.cancelButton')}
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleEditToggle} variant="outline" leftIcon={<Pencil className="h-4 w-4"/>}>
                    {t('profilePage.edit.editButton')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-800 py-4 sm:py-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="p-3 sm:p-4 bg-gray-700/50 rounded-lg">
                <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-400 mx-auto mb-1 sm:mb-2" />
                <div className="text-lg sm:text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs sm:text-sm text-gray-400">{stat.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rank Progress Section */}
      <div className="bg-gray-900 py-4 sm:py-6">
        <div className="container mx-auto px-4">
          <RankProgressBar 
            rankProgress={calculateRankProgress(userProfile.rating)} 
            currentRating={userProfile.rating}
          />
        </div>
      </div>

      {/* Main Content Area - Tabs for Battles and Posts */}
      <div className="container mx-auto px-4 py-12">
        <div className="w-full">
          <div className="flex border-b border-gray-700 mb-8">
            <button 
              onClick={() => setActiveTab('current')} 
              className={`py-3 px-6 font-medium transition-colors duration-150 focus:outline-none ${
                activeTab === 'current' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('profilePage.tabs.currentBattles')}
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={`py-3 px-6 font-medium transition-colors duration-150 focus:outline-none ${
                activeTab === 'history' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('profilePage.tabs.battleHistory')}
            </button>
            <button 
              onClick={() => setActiveTab('posts')} 
              className={`py-3 px-6 font-medium transition-colors duration-150 focus:outline-none ${
                activeTab === 'posts' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t('profilePage.tabs.posts')}
            </button>
          </div>

          {battleLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader className="h-10 w-10 text-cyan-500 animate-spin" />
            </div>
          )}

          {!battleLoading && activeTab === 'current' && (
            userActiveBattles.length > 0 ? (
              <div className="space-y-6">
                {userActiveBattles.map(battle => (
                  <BattleCard key={battle.id} battle={battle} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center bg-gray-800 border border-gray-700">
                <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{t('profilePage.battles.noActiveBattlesTitle')}</h3>
                <p className="text-gray-400">{t('profilePage.battles.noActiveBattlesDescription')}</p>
              </Card>
            )
          )}

          {!battleLoading && activeTab === 'history' && (
            userArchivedBattles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userArchivedBattles.map(battle => (
                  <ArchivedBattleCard 
                    key={battle.id} 
                    battle={battle} 
                    userId={userProfile.id} 
                    onWatchReplay={(b) => navigate(`/battle-replay/${b.id}`)} 
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center bg-gray-800 border border-gray-700">
                <Archive className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{t('profilePage.battles.noArchivedBattlesTitle')}</h3>
                <p className="text-gray-400">{t('profilePage.battles.noArchivedBattlesDescription')}</p>
              </Card>
            )
          )}
          
          {!battleLoading && activeTab === 'posts' && (
            posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map(post => (
                  <Card key={post.id} className="p-6 bg-gray-800 border border-gray-700">
                    <p className="text-gray-300 mb-3 whitespace-pre-wrap">{post.content}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{formatDate(post.created_at)}</span>
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                          <Heart className="h-4 w-4" /> {post.likes}
                        </button>
                        <button className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                          <MessageCircle className="h-4 w-4" /> {post.comments}
                        </button>
                        {authUser?.id === post.user_id && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(post)} className="text-yellow-400 hover:text-yellow-300">
                              {t('profilePage.posts.editButton')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)} className="text-red-500 hover:text-red-400">
                              {t('profilePage.posts.deleteButton')}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingPost === post.id && (
                      <div className="mt-4">
                        <Textarea 
                          value={editContent} 
                          onChange={(e) => setEditContent(e.target.value)} 
                          className="w-full bg-gray-700 border-gray-600 text-white mb-2"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingPost(null)}>
                            {t('profilePage.posts.cancelButton')}
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => handleSaveEdit(post.id)} className="bg-green-600 hover:bg-green-700">
                            {t('profilePage.posts.saveButton')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center bg-gray-800 border border-gray-700">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{t('profilePage.posts.noPostsTitle')}</h3>
                <p className="text-gray-400">{t('profilePage.posts.noPostsDescription')}</p>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;