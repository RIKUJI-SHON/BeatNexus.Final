import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  MessageSquare, 
  Trophy,
  Users,
  Settings,
  LogOut,
  Shield,
  UserMinus,
  Crown,
  Send,
  Hash,
  Star,
  Calendar,
  UserPlus,
  MoreVertical,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useCommunityStore } from '../store/communityStore';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { getRankFromRating } from '../utils/rankUtils';
import { formatDistanceToNow } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import beatnexusWordmark from '../assets/images/BEATNEXUS-WORDMARK.png';
import heroBackground from '../assets/images/hero-background.png';

type TabType = 'ranking' | 'chat' | 'members';

const CommunityDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const {
    currentCommunity,
    currentCommunityMembers,
    chatMessages,
    myRole,
    loading,
    fetchCommunityDetails,
    fetchChatMessages,
    sendChatMessage,
    subscribeToCommunityChat,
    unsubscribeFromCommunityChat,
    leaveCommunity,
    deleteCommunity,
    kickMember,
    updateMemberRole
  } = useCommunityStore();

  const [activeTab, setActiveTab] = useState<TabType>('ranking');
  const [chatMessage, setChatMessage] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMemberActionModal, setShowMemberActionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberAction, setMemberAction] = useState<'kick' | 'promote' | 'demote'>('kick');

  const locale = i18n.language === 'ja' ? ja : enUS;

  useEffect(() => {
    if (id) {
      fetchCommunityDetails(id);
      fetchChatMessages(id);
      subscribeToCommunityChat(id);
    }

    return () => {
      unsubscribeFromCommunityChat();
    };
  }, [id]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !id) return;

    await sendChatMessage(id, chatMessage.trim());
    setChatMessage('');
  };

  const handleLeaveCommunity = async () => {
    if (!id) return;

    const result = await leaveCommunity(id);
    if (result.success) {
      toast.success(t('leftCommunity'));
      navigate('/community');
    } else {
      toast.error(result.message);
    }
    setShowLeaveModal(false);
  };

  const handleDeleteCommunity = async () => {
    if (!id) return;

    const result = await deleteCommunity(id);
    if (result.success) {
      toast.success(t('communityDeleted'));
      navigate('/community');
    } else {
      toast.error(result.message);
    }
    setShowDeleteModal(false);
  };

  const handleMemberAction = async () => {
    if (!id || !selectedMember) return;

    let result;
    switch (memberAction) {
      case 'kick':
        result = await kickMember(id, selectedMember.user_id);
        if (result.success) {
          toast.success(t('memberKicked'));
        }
        break;
      case 'promote':
        result = await updateMemberRole(id, selectedMember.user_id, 'admin');
        if (result.success) {
          toast.success(t('memberPromoted'));
        }
        break;
      case 'demote':
        result = await updateMemberRole(id, selectedMember.user_id, 'member');
        if (result.success) {
          toast.success(t('memberDemoted'));
        }
        break;
    }

    if (result && !result.success) {
      toast.error(result.message);
    }

    setShowMemberActionModal(false);
    setSelectedMember(null);
  };

  if (loading && !currentCommunity) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
          <p className="text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!currentCommunity || !myRole) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="bg-gray-900 border-gray-700 p-12 text-center">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('communityNotFound')}</h3>
            <p className="text-gray-400 mb-6">{t('communityNotFoundDesc')}</p>
            <Button
              onClick={() => navigate('/community')}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToCommunities')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const rankInfo = getRankFromRating(currentCommunity.average_rating);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ヒーローセクション */}
      <section 
        className="relative py-12 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9)), url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/30 to-purple-900/30"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ナビゲーション */}
          <div className="mb-6">
            <Button
              onClick={() => navigate('/community')}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToCommunities')}
            </Button>
          </div>

          {/* コミュニティ情報 */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Hash className="w-8 h-8 text-cyan-400" />
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  {currentCommunity.name}
                </h1>
                {myRole === 'owner' && <Crown className="w-6 h-6 text-yellow-400" />}
                {myRole === 'admin' && <Shield className="w-6 h-6 text-cyan-400" />}
              </div>
              
              {currentCommunity.description && (
                <p className="text-gray-300 text-lg mb-4 max-w-2xl">
                  {currentCommunity.description}
                </p>
              )}

              {/* 統計情報 */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span className="text-white font-medium">{currentCommunity.member_count}</span>
                  <span className="text-gray-400">{t('members')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className={`font-medium ${rankInfo.color}`}>
                    {Math.round(currentCommunity.average_rating)}
                  </span>
                  <span className="text-gray-400">{t('avgRating')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-400">
                    {formatDistanceToNow(new Date(currentCommunity.created_at), { 
                      addSuffix: true, 
                      locale 
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex items-center gap-3">
              <Badge 
                variant={myRole === 'owner' ? 'warning' : myRole === 'admin' ? 'info' : 'default'}
                className="px-3 py-1"
              >
                {t(myRole === 'owner' ? 'owner' : myRole === 'admin' ? 'admin' : 'member')}
              </Badge>
              
              {myRole !== 'owner' && (
                <Button
                  onClick={() => setShowLeaveModal(true)}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('leaveCommunity')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タブナビゲーション */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 p-1 bg-gray-900 rounded-lg border border-gray-700">
            <button
              onClick={() => setActiveTab('ranking')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'ranking'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Trophy className="w-4 h-4" />
              {t('memberRanking')}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {t('chat')}
            </button>
            {(myRole === 'owner' || myRole === 'admin') && (
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'members'
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                {t('memberManagement')}
              </button>
            )}
          </div>
        </div>

        {/* タブコンテンツ */}
        {activeTab === 'ranking' && (
          <Card className="bg-gray-900 border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  {t('memberRanking')}
                </h2>
                <Badge variant="default" className="bg-gray-700 text-gray-300">
                  {currentCommunityMembers.length} {t('members')}
                </Badge>
              </div>

              {currentCommunityMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">{t('noMembers')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentCommunityMembers.map((member) => {
                    const memberRankInfo = getRankFromRating(member.rating);
                    const isMe = member.user_id === user?.id;
                    
                    return (
                      <div
                        key={member.user_id}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          isMe 
                            ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30' 
                            : 'bg-gray-800 hover:bg-gray-750'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* ランク */}
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700">
                            <span className="text-xl font-bold text-white">
                              {member.rank_in_community}
                            </span>
                          </div>

                          {/* プロフィール */}
                          <Avatar
                            src={member.avatar_url || ''}
                            alt={member.username || 'User'}
                            size="md"
                          />
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Link 
                                to={`/profile/${member.user_id}`}
                                className="font-semibold text-white hover:text-cyan-400 transition-colors"
                              >
                                {member.username || 'Unknown User'}
                              </Link>
                              {member.role === 'owner' && (
                                <Crown className="w-4 h-4 text-yellow-400" />
                              )}
                              {member.role === 'admin' && (
                                <Shield className="w-4 h-4 text-cyan-400" />
                              )}
                              {isMe && (
                                <Badge variant="info" className="text-xs">
                                  {t('you')}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {t('joined')}: {formatDistanceToNow(new Date(member.joined_at), { 
                                addSuffix: true, 
                                locale 
                              })}
                            </div>
                          </div>
                        </div>

                        {/* レーティング */}
                        <div className="text-right">
                          <div className={`text-xl font-bold ${memberRankInfo.color}`}>
                            {member.rating}
                          </div>
                                                     <div className="text-sm text-gray-400">
                             {memberRankInfo.name}
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'chat' && (
          <Card className="bg-gray-900 border-gray-700 h-[600px] flex flex-col">
            {/* チャットヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                {t('communityChat')}
              </h2>
              <Badge variant="default" className="bg-gray-700 text-gray-300">
                {chatMessages.length} {t('messages')}
              </Badge>
            </div>

            {/* チャットメッセージ */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">{t('noMessages')}</p>
                  <p className="text-gray-500 text-sm mt-2">{t('startConversation')}</p>
                </div>
              ) : (
                chatMessages.map((message) => {
                  const isMe = message.user_id === user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar
                        src={message.avatar_url || ''}
                        alt={message.username || 'User'}
                        size="sm"
                      />
                      <div className={`flex-1 max-w-xs md:max-w-md ${isMe ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : ''}`}>
                          <span className="text-sm font-medium text-gray-300">
                            {message.username || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(message.created_at), { 
                              addSuffix: true, 
                              locale 
                            })}
                          </span>
                        </div>
                        <div
                          className={`inline-block px-3 py-2 rounded-lg ${
                            isMe
                              ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                              : 'bg-gray-800 text-gray-100'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* チャット入力 */}
            <div className="border-t border-gray-700 p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={t('typeMessage')}
                  className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  maxLength={500}
                />
                <Button 
                  type="submit" 
                  disabled={!chatMessage.trim()}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        )}

        {activeTab === 'members' && (myRole === 'owner' || myRole === 'admin') && (
          <Card className="bg-gray-900 border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-cyan-400" />
                  {t('memberManagement')}
                </h2>
                <Badge variant="warning" className="bg-yellow-500/20 text-yellow-400">
                  {t('adminOnly')}
                </Badge>
              </div>

              <div className="space-y-3">
                {currentCommunityMembers.map((member) => {
                  const canManage = myRole === 'owner' || 
                    (myRole === 'admin' && member.role === 'member');
                  const isMe = member.user_id === user?.id;
                  
                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar
                          src={member.avatar_url || ''}
                          alt={member.username || 'User'}
                          size="md"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">
                              {member.username || 'Unknown User'}
                            </span>
                            {member.role === 'owner' && (
                              <Badge variant="warning" className="text-xs">
                                <Crown className="w-3 h-3 mr-1" />
                                {t('owner')}
                              </Badge>
                            )}
                            {member.role === 'admin' && (
                              <Badge variant="info" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {t('admin')}
                              </Badge>
                            )}
                            {isMe && (
                              <Badge variant="default" className="text-xs bg-gray-600 text-gray-300">
                                {t('you')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {t('rating')}: {member.rating} • {t('joined')}: {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true, locale })}
                          </div>
                        </div>
                      </div>
                      
                      {canManage && !isMe && (
                        <div className="flex items-center gap-2">
                          {member.role === 'member' && myRole === 'owner' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(member);
                                setMemberAction('promote');
                                setShowMemberActionModal(true);
                              }}
                              className="border-cyan-600 text-cyan-400 hover:bg-cyan-600 hover:text-white"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              {t('promoteToAdmin')}
                            </Button>
                          )}
                          {member.role === 'admin' && myRole === 'owner' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMember(member);
                                setMemberAction('demote');
                                setShowMemberActionModal(true);
                              }}
                              className="border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white"
                            >
                              {t('demoteToMember')}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setMemberAction('kick');
                              setShowMemberActionModal(true);
                            }}
                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          >
                            <UserMinus className="w-4 h-4 mr-1" />
                            {t('kickMember')}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* コミュニティ削除・退出セクション */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t('dangerZone')}
                </h3>
                
                <div className="space-y-4">
                  {myRole !== 'owner' && (
                    <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-800 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white mb-1">{t('leaveCommunity')}</h4>
                        <p className="text-sm text-gray-400">{t('leaveCommunityDescription')}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowLeaveModal(true)}
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        {t('leaveCommunity')}
                      </Button>
                    </div>
                  )}
                  
                  {myRole === 'owner' && (
                    <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-800 rounded-lg">
                      <div>
                        <h4 className="font-medium text-white mb-1">{t('deleteCommunity')}</h4>
                        <p className="text-sm text-gray-400">{t('deleteCommunityDescription')}</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteModal(true)}
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('deleteCommunity')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 退出確認モーダル */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title={t('confirmLeaveCommunity')}
      >
        <div className="space-y-6">
          <div className="text-center">
            <LogOut className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('leaveCommunityTitle')}
            </h3>
            <p className="text-gray-400">
              {t('leaveCommunityDesc', { name: currentCommunity.name })}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowLeaveModal(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleLeaveCommunity}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? t('leaving') : t('leaveCommunity')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('confirmDeleteCommunity')}
      >
        <div className="space-y-6">
          <div className="text-center">
            <Trash2 className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('deleteCommunityTitle')}
            </h3>
            <p className="text-gray-400">
              {t('deleteCommunityDesc', { name: currentCommunity.name })}
            </p>
            <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm font-medium">
                {t('deleteCommunityWarning')}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleDeleteCommunity}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? t('deleting') : t('deleteCommunity')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* メンバー操作確認モーダル */}
      <Modal
        isOpen={showMemberActionModal}
        onClose={() => {
          setShowMemberActionModal(false);
          setSelectedMember(null);
        }}
        title={
          memberAction === 'kick' ? t('confirmKick') :
          memberAction === 'promote' ? t('confirmPromote') :
          t('confirmDemote')
        }
      >
        <div className="space-y-6">
          <div className="text-center">
            {memberAction === 'kick' && <UserMinus className="w-16 h-16 text-red-400 mx-auto mb-4" />}
            {memberAction === 'promote' && <UserPlus className="w-16 h-16 text-cyan-400 mx-auto mb-4" />}
            {memberAction === 'demote' && <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />}
            
            <h3 className="text-lg font-semibold text-white mb-2">
              {memberAction === 'kick' && t('kickMemberTitle')}
              {memberAction === 'promote' && t('promoteMemberTitle')}
              {memberAction === 'demote' && t('demoteMemberTitle')}
            </h3>
            <p className="text-gray-400">
              {memberAction === 'kick' && t('kickMemberDesc', { name: selectedMember?.username })}
              {memberAction === 'promote' && t('promoteMemberDesc', { name: selectedMember?.username })}
              {memberAction === 'demote' && t('demoteMemberDesc', { name: selectedMember?.username })}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowMemberActionModal(false);
                setSelectedMember(null);
              }}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleMemberAction}
              className={`flex-1 ${
                memberAction === 'kick' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : memberAction === 'promote'
                  ? 'bg-cyan-600 hover:bg-cyan-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              } text-white`}
              disabled={loading}
            >
              {loading ? t('processing') : 
               memberAction === 'kick' ? t('kickMember') :
               memberAction === 'promote' ? t('promoteToAdmin') :
               t('demoteToMember')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CommunityDetailPage; 