import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Users, Trophy, Search, Lock, Crown, Star, MessageSquare } from 'lucide-react';
import { useCommunityStore } from '../store/communityStore';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AuthModal } from '../components/auth/AuthModal';
import { getRankFromRating } from '../utils/rankUtils';
import { toast } from '../store/toastStore';
import beatnexusWordmark from '../assets/images/BEATNEXUS-WORDMARK.png';
import heroBackground from '../assets/images/hero-background.png';

const CommunityPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    communities,
    userCommunities,
    loading,
    error,
    fetchCommunities,
    fetchUserCommunities,
    fetchUserCurrentCommunity,
    createCommunity,
    joinCommunity,
    clearError
  } = useCommunityStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinModal, setShowJoinModal] = useState<{communityId: string; community: any} | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  
  // コミュニティ作成フォーム
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    password: '',
    isPrivate: false
  });

  const requireAuth = useRequireAuth({
    showAuthModal: true,
    setAuthModalOpen: setIsAuthModalOpen,
    setAuthModalMode: () => {},
  });
  
    useEffect(() => {
    const checkUserCommunity = async () => {
      if (user && !isCreatingCommunity) {
        // ユーザーが既にコミュニティに所属している場合、そのコミュニティページにリダイレクト
        // コミュニティ作成中やモーダル表示中はリダイレクトしない
        const currentCommunity = await fetchUserCurrentCommunity();
        if (currentCommunity && !showCreateModal && !showJoinModal) {
          navigate(`/community/${currentCommunity.id}`);
          return;
        }
        fetchUserCommunities();
      }
    };

    fetchCommunities();
    checkUserCommunity();
    
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [user, error, navigate, showCreateModal, showJoinModal, isCreatingCommunity]);

  // 検索フィルター
  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.owner_username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!requireAuth(() => handleCreateCommunity(e))) return;

    setIsCreatingCommunity(true);
    
    try {
      const result = await createCommunity(
        createForm.name,
        createForm.description,
        createForm.isPrivate ? createForm.password : undefined
      );

      if (result.success) {
        toast.success(t('communityCreated'));
        setShowCreateModal(false);
        setCreateForm({ name: '', description: '', password: '', isPrivate: false });
        
        // 作成したコミュニティページに即座にリダイレクト
        if (result.community_id) {
          navigate(`/community/${result.community_id}`, { replace: true });
        }
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!requireAuth(() => handleJoinCommunity(communityId))) return;

    const community = communities.find(c => c.id === communityId);
    if (!community) return;

    // 参加確認モーダルを表示
    setShowJoinModal({ communityId, community });
  };

  const confirmJoinCommunity = async () => {
    if (!showJoinModal) return;

    const { communityId, community } = showJoinModal;
    const hasPassword = !!community.password_hash;
    
    if (hasPassword && !joinPassword.trim()) {
      toast.error(t('passwordRequired'));
      return;
    }

    const result = await joinCommunity(communityId, hasPassword ? joinPassword : undefined);
    
    if (result.success) {
      toast.success(t('joinedCommunity'));
      setJoinPassword('');
      setShowJoinModal(null);
    } else {
      toast.error(result.message);
    }
  };

  const renderCommunityCard = (community: any) => {
    const isOwner = user && community.owner_user_id === user.id;
    const isMember = userCommunities.some(uc => uc.community_id === community.id);
    const hasPassword = !!community.password_hash;
    const rankInfo = getRankFromRating(community.average_rating);

    return (
      <Card key={community.id} className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-lg">
        <div className="p-6">
          {/* ヘッダー部分 */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-white">{community.name}</h3>
                {hasPassword && <Lock className="w-4 h-4 text-yellow-400" />}
                {isOwner && <Crown className="w-4 h-4 text-yellow-400" />}
                                 <Badge variant="default" className="text-xs bg-gray-700 text-gray-300">
                   #{community.global_rank || 1}
                 </Badge>
              </div>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                {community.description || t('noDescription')}
              </p>
            </div>
      </div>

          {/* オーナー情報 */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800 rounded-lg">
            <Avatar
              src={community.owner_avatar_url}
              alt={community.owner_username}
              size="sm"
                  />
                  <div className="flex-1">
              <p className="text-sm text-gray-300">{t('owner')}</p>
              <p className="text-white font-medium">{community.owner_username}</p>
                    </div>
                  </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-bold">{community.member_count}</span>
              </div>
              <p className="text-xs text-gray-400">{t('members')}</p>
                </div>
            <div className="text-center p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className={`font-bold ${rankInfo.color}`}>
                  {Math.round(community.average_rating)}
                </span>
              </div>
              <p className="text-xs text-gray-400">{t('avgRating')}</p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            {isMember ? (
              <Button
                onClick={() => navigate(`/community/${community.id}`)}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('enterCommunity')}
                        </Button>
            ) : (
                        <Button 
                onClick={() => handleJoinCommunity(community.id)}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('join')}
                        </Button>
            )}
                      </div>
                    </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ヒーローセクション */}
      <section 
        className="relative py-20 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)), url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 to-purple-900/20"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img
            src={beatnexusWordmark}
            alt="BeatNexus"
            className="w-64 h-auto mx-auto mb-6"
          />
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            {t('communityTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            {t('communitySubtitle')}
          </p>
          
          {/* 検索とアクション */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder={t('searchCommunities')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white placeholder-gray-400 w-full"
              />
                          </div>
                            <Button
              onClick={() => {
                if (requireAuth(() => setShowCreateModal(true))) {
                  setShowCreateModal(true);
                }
              }}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 px-6 whitespace-nowrap"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('createCommunity')}
                            </Button>
                            </div>
                          </div>
      </section>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* マイコミュニティセクション */}
        {user && userCommunities.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400" />
              {t('myCommunities')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userCommunities.map(userCommunity => {
                const community = communities.find(c => c.id === userCommunity.community_id);
                if (!community) return null;
                return renderCommunityCard(community);
              })}
                      </div>
          </section>
        )}

        {/* 全てのコミュニティ */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            {t('allCommunities')}
            <span className="text-gray-400 text-lg font-normal ml-2">
              ({filteredCommunities.length})
            </span>
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="text-gray-400 mt-4">{t('loading')}</p>
                  </div>
          ) : filteredCommunities.length === 0 ? (
            <Card className="bg-gray-900 border-gray-700 p-12 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                {searchQuery ? t('noCommunitiesFound') : t('noCommunitiesYet')}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchQuery ? t('tryDifferentSearch') : t('createFirstCommunity')}
              </p>
              {!searchQuery && (
                              <Button 
                  onClick={() => {
                    if (requireAuth(() => setShowCreateModal(true))) {
                      setShowCreateModal(true);
                    }
                  }}
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('createCommunity')}
                              </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCommunities.map(renderCommunityCard)}
                        </div>
                      )}
        </section>
      </div>

      {/* コミュニティ作成モーダル */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('createNewCommunity')}
      >
        <form onSubmit={handleCreateCommunity} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('communityName')} *
            </label>
            <Input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
              className="bg-gray-900 border-gray-700 text-white"
              placeholder={t('enterCommunityName')}
              required
              maxLength={50}
            />
                              </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('description')}
            </label>
            <Textarea
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              className="bg-gray-900 border-gray-700 text-white"
              placeholder={t('describeCommunity')}
              rows={4}
              maxLength={500}
            />
                            </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={createForm.isPrivate}
                onChange={(e) => setCreateForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-600 rounded focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-300">{t('privateCommunitySetting')}</span>
            </label>
                          </div>

          {createForm.isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('password')} *
              </label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder={t('enterPassword')}
                required={createForm.isPrivate}
                minLength={4}
              />
                    </div>
                  )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !createForm.name.trim()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
            >
              {loading ? t('creating') : t('create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* コミュニティ参加確認モーダル */}
      <Modal 
        isOpen={!!showJoinModal}
        onClose={() => {
          setShowJoinModal(null);
          setJoinPassword('');
        }}
        title={t('joinCommunity')}
      >
        {showJoinModal && (
          <div className="space-y-6">
            {/* コミュニティ情報 */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-white">{showJoinModal.community.name}</h3>
                {showJoinModal.community.password_hash && <Lock className="w-4 h-4 text-yellow-400" />}
              </div>
              {showJoinModal.community.description && (
                <p className="text-gray-300 text-sm">{showJoinModal.community.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {showJoinModal.community.member_count} {t('members')}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  {Math.round(showJoinModal.community.average_rating)} {t('avgRating')}
                </span>
              </div>
            </div>

            <p className="text-gray-300">
              {showJoinModal.community.password_hash 
                ? t('privateCommunityJoinConfirm') 
                : t('publicCommunityJoinConfirm')
              }
            </p>
            
            {/* パスワード入力（プライベートコミュニティの場合のみ） */}
            {showJoinModal.community.password_hash && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('password')} *
                </label>
                <Input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder={t('enterPassword')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmJoinCommunity();
                    }
                  }}
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJoinModal(null);
                  setJoinPassword('');
                }}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={confirmJoinCommunity}
                disabled={loading || (showJoinModal.community.password_hash && !joinPassword.trim())}
                className="flex-1 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
              >
                {loading ? t('joining') : t('join')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 認証モーダル */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login"
        setMode={() => {}}
      />
    </div>
  );
};

export default CommunityPage;