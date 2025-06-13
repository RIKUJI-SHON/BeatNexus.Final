import React, { useState, useEffect } from 'react';
import { Share2, ThumbsUp, ArrowLeft, Clock, MessageCircle, Crown, Play, UserX, X, Flame, Zap, Trophy, Sword, Users, Timer, Volume2, Star, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useBattleStore } from '../../store/battleStore';
import { useAuthStore } from '../../store/authStore';
import { Battle } from '../../types';
import { useTranslation } from 'react-i18next';

interface BattleViewProps {
  battle: Battle;
}

export const BattleView: React.FC<BattleViewProps> = ({ battle }) => {
  const { t } = useTranslation();
  const [hasVoted, setHasVoted] = useState<'A' | 'B' | null>(null);
  const [votesA, setVotesA] = useState(battle.votes_a);
  const [votesB, setVotesB] = useState(battle.votes_b);
  const [comment, setComment] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(true);
  
  const { voteBattle, cancelVote, getUserVote } = useBattleStore();
  const { user } = useAuthStore();

  // 🔍 厳密な型チェックと参加者判定 - battleStoreの変換後データに合わせて修正
  const player1Id = battle.player1_user_id || (battle as any).contestant_a_id;
  const player2Id = battle.player2_user_id || (battle as any).contestant_b_id;
  
  const isUserParticipant = user && user.id ? 
    (String(player1Id) === String(user.id) || String(player2Id) === String(user.id)) : 
    false;
  
  // 🔍 デバッグ情報
  console.log('🔍 ===== PARTICIPANT DEBUG =====');
  console.log('👤 User ID:', user?.id);
  console.log('🎮 Player 1 ID (original):', battle.player1_user_id);
  console.log('🎮 Player 2 ID (original):', battle.player2_user_id);
  console.log('🎮 Player 1 ID (contestant_a_id):', (battle as any).contestant_a_id);
  console.log('🎮 Player 2 ID (contestant_b_id):', (battle as any).contestant_b_id);
  console.log('🎮 Final Player 1 ID:', player1Id);
  console.log('🎮 Final Player 2 ID:', player2Id);
  console.log('🔍 User ID Type:', typeof user?.id);
  console.log('🔍 Player 1 Type:', typeof player1Id);
  console.log('🔍 Player 2 Type:', typeof player2Id);
  console.log('✅ Player 1 Match:', String(player1Id) === String(user?.id));
  console.log('✅ Player 2 Match:', String(player2Id) === String(user?.id));
  console.log('🛡️ Is User Participant:', isUserParticipant);
  console.log('🆔 Battle ID:', battle.id);
  console.log('🔍 ===========================');
  
  // Load user's current vote status when component mounts
  useEffect(() => {
    const loadVoteStatus = async () => {
      setIsLoadingVoteStatus(true);
      try {
        const voteStatus = await getUserVote(battle.id);
        console.log('🔍 Current vote status:', voteStatus);
        if (voteStatus.hasVoted) {
          setHasVoted(voteStatus.vote);
        } else {
          setHasVoted(null);
        }
      } catch (error) {
        console.error('❌ Failed to load vote status:', error);
      } finally {
        setIsLoadingVoteStatus(false);
      }
    };
    
    loadVoteStatus();
  }, [battle.id, getUserVote]);

  // 🔍 参加者状況の監視
  useEffect(() => {
    console.log('🔄 ===== STATUS CHANGE =====');
    console.log('🛡️ Is User Participant:', isUserParticipant);
    console.log('🎨 Should Show Participant UI:', isUserParticipant);
    console.log('👤 Current User ID:', user?.id);
    console.log('🎮 Battle Players:', [player1Id, player2Id]);
    console.log('🔄 ========================');
  }, [isUserParticipant, user?.id, player1Id, player2Id]);
  
  // Calculate time remaining
  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    
    if (diffTime <= 0) {
      return t('battleView.votingEnded');
    }
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}${t('battleView.timeUnits.days')} ${diffHours}${t('battleView.timeUnits.hours')}`;
    } else if (diffHours > 0) {
      return `${diffHours}${t('battleView.timeUnits.hours')} ${diffMinutes}${t('battleView.timeUnits.minutes')}`;
    } else {
      return `${diffMinutes}${t('battleView.timeUnits.minutes')}`;
    }
  };
  
  // Calculate vote percentages
  const totalVotes = votesA + votesB;
  const percentageA = totalVotes > 0 ? (votesA / totalVotes) * 100 : 50;
  
  // Determine who's leading
  const isALeading = votesA > votesB;
  const isBLeading = votesB > votesA;
  const isDraw = votesA === votesB;
  
  // Handle voting - now connects to battleStore
  const handleVote = async (contestant: 'A' | 'B') => {
    if (hasVoted || isVoting || isCancelling || isUserParticipant) return;
    
    console.log('🗳️ Vote button clicked:', { contestant, battleId: battle.id });
    
    setIsVoting(true);
    try {
      await voteBattle(battle.id, contestant);
      
      // Only update local state if vote was successful
      // The battleStore will handle the actual state management
    setHasVoted(contestant);
    if (contestant === 'A') {
        setVotesA((prev: number) => prev + 1);
    } else {
        setVotesB((prev: number) => prev + 1);
    }
    } catch (error) {
      console.error('❌ Vote failed in component:', error);
      // Don't update local state if vote failed
    } finally {
      setIsVoting(false);
    }
  };

  // Handle vote cancellation
  const handleCancelVote = async () => {
    if (!hasVoted || isCancelling || isVoting || isUserParticipant) return;
    
    console.log('🗑️ Cancel vote button clicked:', { currentVote: hasVoted, battleId: battle.id });
    
    const previousVote = hasVoted; // Store before starting cancellation
    setIsCancelling(true);
    
    try {
      await cancelVote(battle.id);
      
      // Only update local state if cancellation was successful
      // Check if the cancelVote function actually succeeded by checking the response
      console.log('✅ Vote cancellation completed, updating local state');
      setHasVoted(null);
      
      if (previousVote === 'A') {
        setVotesA((prev: number) => Math.max(0, prev - 1));
      } else if (previousVote === 'B') {
        setVotesB((prev: number) => Math.max(0, prev - 1));
      }
      
      // 🔄 Force reload vote status from database to ensure consistency
      console.log('🔄 Reloading vote status to ensure consistency...');
      try {
        const voteStatus = await getUserVote(battle.id);
        console.log('📊 Post-cancellation vote status:', voteStatus);
        
        if (voteStatus.hasVoted !== false) {
          console.log('⚠️ Vote still exists in database, correcting local state');
          setHasVoted(voteStatus.vote);
          // Also correct vote counts by refetching from store
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      } catch (reloadError) {
        console.error('❌ Failed to reload vote status:', reloadError);
      }
      
    } catch (error) {
      console.error('❌ Vote cancellation failed in component, NOT updating local state:', error);
      // Keep the previous vote state - don't change anything
      // The user should see their vote is still there
    } finally {
      setIsCancelling(false);
    }
  };

  const getDefaultAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  // バトル形式に応じた情報を取得
  const getBattleFormatInfo = (format: string) => {
    switch (format) {
      case 'MAIN_BATTLE':
        return {
          label: t('battleCard.battleFormats.MAIN_BATTLE'),
          icon: <Crown className="h-5 w-5" />,
          color: 'from-yellow-500 to-amber-600',
          bgColor: 'from-yellow-600/20 to-amber-600/20'
        };
      case 'MINI_BATTLE':
        return {
          label: t('battleCard.battleFormats.MINI_BATTLE'),
          icon: <Zap className="h-5 w-5" />,
          color: 'from-cyan-500 to-blue-600',
          bgColor: 'from-cyan-600/20 to-blue-600/20'
        };
      case 'THEME_CHALLENGE':
        return {
          label: t('battleCard.battleFormats.THEME_CHALLENGE'),
          icon: <Trophy className="h-5 w-5" />,
          color: 'from-purple-500 to-pink-600',
          bgColor: 'from-purple-600/20 to-pink-600/20'
        };
      default:
        return {
          label: t('battleView.subtitle'),
          icon: <Sword className="h-5 w-5" />,
          color: 'from-gray-500 to-gray-600',
          bgColor: 'from-gray-600/20 to-gray-600/20'
        };
    }
  };

  const battleFormatInfo = getBattleFormatInfo(battle.battle_format);

  // Color themes for contestants
  const colorA = '#3B82F6'; // Blue
  const colorB = '#F472B6'; // Pink

  // Mock comments data
  const mockComments = [
    {
      id: '1',
      username: 'BeatMaster',
      avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100',
      content: 'Amazing patterns! The bass is so clean 🔥',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      username: 'RhythmQueen',
      avatar: 'https://images.pexels.com/photos/773371/pexels-photo-773371.jpeg?auto=compress&cs=tinysrgb&w=100',
      content: 'That throat bass transition was insane!',
      timestamp: '1 hour ago'
    },
    {
      id: '3',
      username: 'BassDropper',
      avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100',
      content: 'Both killed it but that second drop was something else',
      timestamp: '30 minutes ago'
    }
  ];
  
  return (
    <div className={`min-h-screen bg-gradient-to-br ${battleFormatInfo.bgColor} from-gray-950 to-gray-900 relative overflow-hidden`}>
      
      {/* Epic Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Lightning Effects */}
        <div className="absolute top-0 left-1/4 w-1 h-32 bg-gradient-to-b from-cyan-400/50 to-transparent animate-pulse transform rotate-12"></div>
        <div className="absolute top-20 right-1/4 w-1 h-24 bg-gradient-to-b from-pink-400/50 to-transparent animate-pulse transform -rotate-12 delay-500"></div>
        
        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-10 w-16 h-16 bg-pink-500/20 rounded-full blur-xl animate-pulse delay-700"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Battle Title & Info Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent h-px top-1/2"></div>
          
          {/* Battle Format Badge - Subtle */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-gray-800/80 to-gray-700/80 border border-gray-600/50 text-white font-bold text-lg shadow-lg mb-6 backdrop-blur-sm">
            <div className="text-gray-300">
              {battleFormatInfo.icon}
            </div>
            <span className="text-gray-200">{battleFormatInfo.label}</span>
          </div>
          
          {/* Main Battle Title with Player Names */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 mb-4 drop-shadow-lg">
              {battle.contestant_a?.username || 'Player A'}
              <span className="text-gray-400 mx-4">VS</span>
              {battle.contestant_b?.username || 'Player B'}
            </h1>
          </div>
          
          {/* Battle Stats */}
          <div className="flex items-center justify-center gap-6 text-gray-300">
            <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
              <Timer className="h-4 w-4 text-cyan-400" />
              <span className="font-medium">{getTimeRemaining(battle.end_voting_at)}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
              <Users className="h-4 w-4 text-pink-400" />
              <span className="font-medium">{totalVotes} {t('battle.votes')}</span>
            </div>
          </div>
        </div>

        {/* Main Battle Arena */}
        <div className="relative">
          
          {/* Central VS Badge - Enhanced */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 hidden lg:block">
            <div className="relative w-40 h-40">
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 opacity-30 blur-2xl animate-pulse"></div>
              
              {/* Lightning Ring */}
              <div className="absolute inset-2 rounded-full border-4 border-gradient-to-r from-cyan-400 to-pink-400 animate-spin-slow"></div>
              
                             {/* Main VS Circle */}
               <div className="absolute inset-4 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                 <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">VS</div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            
            {/* Player A Side - Left */}
            <div className="relative">
              {/* Battle Side Indicator */}
              <div className="absolute -top-4 -left-4 -right-4 -bottom-4 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-xl"></div>
              
              <Card className={`relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 ${
                isALeading ? 'border-cyan-400 shadow-2xl shadow-cyan-500/25' : 
                'border-cyan-500/30'
              } rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-500`}>
                
                {/* Leading Crown Effect */}
                {isALeading && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
                      <Crown className="h-5 w-5 text-white" />
                      <span className="text-white font-bold text-sm">LEADING</span>
                    </div>
                  </div>
                )}

                {/* Player Header */}
                <div className="relative p-6 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-b border-cyan-500/30">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-r from-cyan-400 to-blue-600 shadow-lg">
                        <img
                          src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl(battle.player1_user_id)}
                          alt={battle.contestant_a?.username || 'Contestant A'}
                          className="w-full h-full rounded-full object-cover border-2 border-gray-900"
                        />
                      </div>
                      {hasVoted === 'A' && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <ThumbsUp className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {battle.contestant_a?.username || 'Contestant A'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-black ${
                          isALeading ? 'text-cyan-400 animate-pulse' : 'text-cyan-300'
                        }`}>
                          {votesA}
                        </div>
                        <span className="text-cyan-200 text-sm font-medium">votes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Player */}
                <div className="relative aspect-video bg-black group">
                  {!battle.video_url_a ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-center">
                        <Play className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">Video Loading...</p>
                      </div>
                    </div>
                  ) : (
                    <video
                      src={battle.video_url_a}
                      className="w-full h-full object-contain"
                      controls
                      poster=""
                    />
                  )}
                  
                  {/* Volume Indicator */}
                  <div className="absolute top-4 right-4">
                    <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                      <Volume2 className="h-5 w-5 text-white" />
                    </div>
                  </div>
                                 </div>
              </Card>
            </div>

            {/* Player B Side - Right */}
            <div className="relative">
              {/* Battle Side Indicator */}
              <div className="absolute -top-4 -left-4 -right-4 -bottom-4 rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 blur-xl"></div>
              
              <Card className={`relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 ${
                isBLeading ? 'border-pink-400 shadow-2xl shadow-pink-500/25' : 
                'border-pink-500/30'
              } rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-500`}>
                
                {/* Leading Crown Effect */}
                {isBLeading && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-bounce">
                      <Crown className="h-5 w-5 text-white" />
                      <span className="text-white font-bold text-sm">LEADING</span>
                    </div>
                  </div>
                )}

                {/* Player Header */}
                <div className="relative p-6 bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-b border-pink-500/30">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-r from-pink-400 to-purple-600 shadow-lg">
                        <img
                          src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl(battle.player2_user_id)}
                          alt={battle.contestant_b?.username || 'Contestant B'}
                          className="w-full h-full rounded-full object-cover border-2 border-gray-900"
                        />
                      </div>
                      {hasVoted === 'B' && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                          <ThumbsUp className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {battle.contestant_b?.username || 'Contestant B'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-black ${
                          isBLeading ? 'text-pink-400 animate-pulse' : 'text-pink-300'
                        }`}>
                          {votesB}
                        </div>
                        <span className="text-pink-200 text-sm font-medium">votes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Player */}
                <div className="relative aspect-video bg-black group">
                  {!battle.video_url_b ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-center">
                        <Play className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">Video Loading...</p>
                      </div>
                    </div>
                  ) : (
                    <video
                      src={battle.video_url_b}
                      className="w-full h-full object-contain"
                      controls
                      poster=""
                    />
                  )}
                  
                  {/* Volume Indicator */}
                  <div className="absolute top-4 right-4">
                    <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm">
                      <Volume2 className="h-5 w-5 text-white" />
                    </div>
                  </div>
                                 </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Voting Console Machine - Only show for spectators */}
        {!isUserParticipant && (
          <div className="flex justify-center mt-12">
            <div className="relative">
              
              {/* Main Console Base - Compact Horizontal */}
              <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl px-8 py-5 border-3 border-gray-600 shadow-xl max-w-2xl">
              
              {/* Top Panel with LED Indicators */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-1.5 rounded-full border border-gray-500 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-md shadow-green-500/50"></div>
                  <span className="text-green-400 text-xs font-bold">ACTIVE</span>
                </div>
                <div className="w-px h-3 bg-gray-500"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-md shadow-blue-500/50 delay-500"></div>
                  <span className="text-blue-400 text-xs font-bold">VOTING</span>
                </div>
              </div>

              {/* Console Surface - Centered Buttons Only */}
              <div className="relative bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-6 border border-gray-600">
                
                {isUserParticipant ? (
                  /* Participant View - No Voting Allowed */
                  <div className="flex items-center justify-center">
                    
                    {/* Player A Vote Counter */}
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/30 shadow-lg">
                        <div className="text-cyan-300 text-xs font-bold mb-1 text-center">PLAYER A</div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-cyan-300 transition-all duration-500 ease-out transform">
                            {battle.votes_a}
                          </div>
                          <div className="text-cyan-400 text-xs mt-1">VOTES</div>
                        </div>
                      </div>
                    </div>

                    {/* Participant Console */}
                    <div className="mx-12 flex flex-col items-center">
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-red-500/30 shadow-lg shadow-red-500/20">
                        
                        {/* Participant Status Display */}
                        <div className="text-center mb-4">
                          <div className="flex items-center justify-center mb-2">
                            <Shield className="h-6 w-6 text-red-400 mr-2" />
                            <div className="text-red-400 text-sm font-bold">PARTICIPANT MODE</div>
                          </div>
                          <div className="text-gray-300 text-xs">VOTING DISABLED</div>
                        </div>

                        {/* Battle Status Indicator */}
                        <div className="flex items-center justify-center gap-4 py-3">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600/30 to-orange-600/30 border-2 border-red-500/50 flex items-center justify-center">
                            <UserX className="h-8 w-8 text-red-400" />
                          </div>
                        </div>

                        {/* Message */}
                        <div className="text-center mt-4">
                          <div className="text-gray-400 text-xs leading-relaxed">
                            {t('battle.participantMessage')}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Player B Vote Counter */}
                    <div className="flex flex-col items-center">
                      <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 backdrop-blur-sm rounded-xl p-4 border border-pink-500/30 shadow-lg">
                        <div className="text-pink-300 text-xs font-bold mb-1 text-center">PLAYER B</div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-pink-300 transition-all duration-500 ease-out transform">
                            {battle.votes_b}
                          </div>
                          <div className="text-pink-400 text-xs mt-1">VOTES</div>
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* Spectator View - Voting Allowed */
                  <div className="flex items-center justify-center gap-12">
                    
                    {/* Player A Vote Counter */}
                    <div className="flex flex-col items-center">
                      <div className={`bg-gradient-to-br backdrop-blur-sm rounded-xl p-4 border shadow-lg transition-all duration-500 ${
                        hasVoted === 'A' 
                          ? 'from-green-500/40 to-emerald-600/40 border-green-400/60 shadow-green-500/30 scale-110' 
                          : 'from-cyan-600/20 to-blue-600/20 border-cyan-500/30 shadow-lg'
                      }`}>
                        <div className={`text-xs font-bold mb-1 text-center transition-colors duration-300 ${
                          hasVoted === 'A' ? 'text-green-300' : 'text-cyan-300'
                        }`}>
                          {hasVoted === 'A' ? '✅ YOUR VOTE' : 'PLAYER A'}
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold transition-all duration-500 ease-out transform ${
                            hasVoted === 'A' 
                              ? 'text-green-300 animate-pulse' 
                              : 'text-cyan-300'
                          }`}>
                            {battle.votes_a}
                          </div>
                          <div className={`text-xs mt-1 transition-colors duration-300 ${
                            hasVoted === 'A' ? 'text-green-400' : 'text-cyan-400'
                          }`}>
                            VOTES
                          </div>
                        </div>
                        {hasVoted === 'A' && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Player A Button */}
                    <div className="relative">
                      {/* Button Base Platform */}
                      <div className="absolute -bottom-1.5 -left-1.5 -right-1.5 h-4 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full shadow-md"></div>
                      
                      {/* Button */}
                      {isLoadingVoteStatus ? (
                        <div className="w-20 h-20 rounded-full bg-cyan-600/50 flex items-center justify-center animate-pulse border-3 border-cyan-400/50">
                          <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : hasVoted === 'A' ? (
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 border-3 border-green-400 flex items-center justify-center shadow-xl shadow-green-500/50 animate-pulse">
                            <ThumbsUp className="h-8 w-8 text-white" />
                          </div>
                          <button 
                            onClick={handleCancelVote} 
                            disabled={isCancelling || isVoting}
                            className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                          >
                            {isCancelling ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleVote('A')} 
                          disabled={isVoting || isCancelling || !!hasVoted}
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-3 border-cyan-400 flex items-center justify-center shadow-xl shadow-cyan-500/50 transform hover:scale-110 hover:shadow-cyan-500/70 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
                        >
                          {isVoting ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <ThumbsUp className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-200" />
                          )}
                        </button>
                      )}
                      
                      {/* Label Plate */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-700 to-gray-800 px-3 py-0.5 rounded-full border border-cyan-500/30">
                        <p className="text-cyan-300 font-bold text-xs whitespace-nowrap">
                          A
                        </p>
                      </div>
                    </div>

                    {/* Central Divider with Power Indicator */}
                    <div className="flex flex-col items-center">
                      <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-500 to-transparent"></div>
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 animate-pulse shadow-md my-1"></div>
                      <div className="w-px h-8 bg-gradient-to-b from-transparent via-gray-500 to-transparent"></div>
                    </div>

                    {/* Player B Button */}
                    <div className="relative">
                      {/* Button Base Platform */}
                      <div className="absolute -bottom-1.5 -left-1.5 -right-1.5 h-4 bg-gradient-to-b from-gray-600 to-gray-700 rounded-full shadow-md"></div>
                      
                      {/* Button */}
                      {isLoadingVoteStatus ? (
                        <div className="w-20 h-20 rounded-full bg-pink-600/50 flex items-center justify-center animate-pulse border-3 border-pink-400/50">
                          <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : hasVoted === 'B' ? (
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 border-3 border-green-400 flex items-center justify-center shadow-xl shadow-green-500/50 animate-pulse">
                            <ThumbsUp className="h-8 w-8 text-white" />
                          </div>
                          <button 
                            onClick={handleCancelVote} 
                            disabled={isCancelling || isVoting}
                            className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                          >
                            {isCancelling ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleVote('B')} 
                          disabled={isVoting || isCancelling || !!hasVoted}
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 border-3 border-pink-400 flex items-center justify-center shadow-xl shadow-pink-500/50 transform hover:scale-110 hover:shadow-pink-500/70 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95"
                        >
                          {isVoting ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <ThumbsUp className="h-8 w-8 text-white group-hover:scale-110 transition-transform duration-200" />
                          )}
                        </button>
                      )}
                      
                      {/* Label Plate */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-700 to-gray-800 px-3 py-0.5 rounded-full border border-pink-500/30">
                        <p className="text-pink-300 font-bold text-xs whitespace-nowrap">
                          B
                        </p>
                      </div>
                    </div>

                    {/* Player B Vote Counter */}
                    <div className="flex flex-col items-center">
                      <div className={`bg-gradient-to-br backdrop-blur-sm rounded-xl p-4 border shadow-lg transition-all duration-500 relative ${
                        hasVoted === 'B' 
                          ? 'from-green-500/40 to-emerald-600/40 border-green-400/60 shadow-green-500/30 scale-110' 
                          : 'from-pink-600/20 to-purple-600/20 border-pink-500/30 shadow-lg'
                      }`}>
                        <div className={`text-xs font-bold mb-1 text-center transition-colors duration-300 ${
                          hasVoted === 'B' ? 'text-green-300' : 'text-pink-300'
                        }`}>
                          {hasVoted === 'B' ? '✅ YOUR VOTE' : 'PLAYER B'}
                        </div>
                        <div className="text-center">
                          <div className={`text-3xl font-bold transition-all duration-500 ease-out transform ${
                            hasVoted === 'B' 
                              ? 'text-green-300 animate-pulse' 
                              : 'text-pink-300'
                          }`}>
                            {battle.votes_b}
                          </div>
                          <div className={`text-xs mt-1 transition-colors duration-300 ${
                            hasVoted === 'B' ? 'text-green-400' : 'text-pink-400'
                          }`}>
                            VOTES
                          </div>
                        </div>
                        {hasVoted === 'B' && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Bottom Ventilation Grilles */}
              <div className="absolute -bottom-2 left-6 right-6 h-3 bg-gradient-to-r from-transparent via-gray-600 to-transparent opacity-50">
                <div className="flex justify-center items-center h-full gap-0.5">
                  {Array.from({length: 8}).map((_, i) => (
                    <div key={i} className="w-0.5 h-2 bg-gray-500 rounded-full"></div>
                  ))}
                </div>
              </div>

            </div>

            {/* Side Power Indicators - Compact */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-16 bg-gradient-to-b from-gray-600 to-gray-700 rounded-l-full border border-gray-500 shadow-lg">
              <div className="w-full h-full bg-gradient-to-r from-cyan-500/20 to-transparent rounded-l-full animate-pulse"></div>
            </div>
            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-16 bg-gradient-to-b from-gray-600 to-gray-700 rounded-r-full border border-gray-500 shadow-lg">
              <div className="w-full h-full bg-gradient-to-l from-pink-500/20 to-transparent rounded-r-full animate-pulse"></div>
            </div>

          </div>
        </div>
        )}  {/* Close conditional for voting console */}

        {/* Epic Vote Statistics - Always visible */}
        <Card className="mt-12 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Battle Statistics</h2>
              <div className="flex items-center justify-center gap-6 text-gray-300">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  <span className="font-bold text-white">{totalVotes}</span> total votes
                </div>
              </div>
            </div>

            {/* Epic Progress Bar */}
            <div className="relative mb-6">
              <div className="flex justify-between text-sm font-medium mb-2">
                <span className={`${isALeading ? 'text-cyan-400 font-bold' : 'text-cyan-300'}`}>
                  {battle.contestant_a?.username} - {percentageA.toFixed(1)}%
                </span>
                <span className={`${isBLeading ? 'text-pink-400 font-bold' : 'text-pink-300'}`}>
                  {battle.contestant_b?.username} - {(100 - percentageA).toFixed(1)}%
                </span>
              </div>
              
              <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                <div className="h-full flex">
                  <div 
                    className="transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ 
                      width: `${percentageA}%`,
                      background: `linear-gradient(90deg, ${colorA}, ${colorA}dd)`
                    }}
                  >
                    {isALeading && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
                      />
                    )}
                  </div>
                  <div 
                    className="transition-all duration-1000 ease-out relative overflow-hidden"
                    style={{ 
                      width: `${100 - percentageA}%`,
                      background: `linear-gradient(90deg, ${colorB}dd, ${colorB})`
                    }}
                  >
                    {isBLeading && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Vote Count Display */}
              <div className="flex justify-between mt-3">
                <div className={`text-2xl font-bold ${
                  isALeading ? 'text-cyan-400 drop-shadow-glow' : 'text-cyan-300'
                }`}>
                  {votesA} {isALeading && <Crown className="h-5 w-5 inline text-yellow-400" />}
                </div>
                <div className={`text-2xl font-bold ${
                  isBLeading ? 'text-pink-400 drop-shadow-glow' : 'text-pink-300'
                }`}>
                  {votesB} {isBLeading && <Crown className="h-5 w-5 inline text-yellow-400" />}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Comments Section - Enhanced */}
        <Card className="mt-8 bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700/50 rounded-2xl backdrop-blur-sm shadow-xl">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="h-6 w-6 text-cyan-400" />
              <h2 className="text-2xl font-bold text-white">Community Reactions</h2>
              <div className="bg-cyan-400/20 px-3 py-1 rounded-full">
                <span className="text-cyan-400 font-bold">{mockComments.length}</span>
              </div>
            </div>
            
            <div className="space-y-6 mb-8">
              {mockComments.map((comment, index) => (
                <div key={comment.id} className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                  <div className="relative">
                    <img
                      src={comment.avatar}
                      alt={comment.username}
                      className="w-12 h-12 rounded-full border-2 border-gray-600"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Star className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">
                        {comment.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        {comment.timestamp}
                      </span>
                    </div>
                    <p className="text-gray-300 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="border-t border-gray-700/50 pt-6">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('battleView.addComment')}
                className="w-full p-4 rounded-xl bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 border border-gray-700/30 resize-none"
                rows={3}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  variant="primary"
                  className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-lg"
                  leftIcon={<MessageCircle className="h-4 w-4" />}
                >
                  {t('battleView.postComment')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};