import React, { useState, useEffect } from 'react';
import { Share2, ThumbsUp, ArrowLeft, Clock, MessageCircle, Crown, Play, UserX, X, Users, Timer, Volume2, Star, Shield, AlertTriangle, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { VoteCommentModal } from '../ui/VoteCommentModal';
import { useBattleStore } from '../../store/battleStore';
import { useAuthStore } from '../../store/authStore';
import { Battle } from '../../types';
import { useTranslation } from 'react-i18next';
import { VSIcon } from '../ui/VSIcon';
import { VotingTips } from '../ui/VotingTips';
import { trackBeatNexusEvents } from '../../utils/analytics';
import { getCurrentRank } from '../../lib/rankUtils';
import { supabase } from '../../lib/supabase';
import { getDefaultAvatarUrl } from '../../utils';
import { useNotificationStore } from '../../store/notificationStore';

interface BattleViewProps {
  battle: Battle;
  isArchived?: boolean; // アーカイブバトルかどうかを示すフラグ
}

export const BattleView: React.FC<BattleViewProps> = ({ battle, isArchived = false }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [hasVoted, setHasVoted] = useState<'A' | 'B' | null>(null);
  const [votesA, setVotesA] = useState(battle.votes_a);
  const [votesB, setVotesB] = useState(battle.votes_b);
  const [comment, setComment] = useState('');
  const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(true);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState<'A' | 'B' | null>(null);
  const [playerRatings, setPlayerRatings] = useState<{
    playerA: { rating: number; loading: boolean };
    playerB: { rating: number; loading: boolean };
  }>({
    playerA: { rating: 1200, loading: true },
    playerB: { rating: 1200, loading: true }
  });
  

  
  // Stores
  const { 
    voteBattle, 
    voteBattleWithComment, 
    cancelVote, 
    getUserVote, 
    fetchBattleComments, 
    battleComments, 
    commentsLoading 
  } = useBattleStore();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  
  // 🔍 厳密な型チェックと参加者判定 - battleStoreの変換後データに合わせて修正
  const player1Id = battle.player1_user_id || (battle as any).contestant_a_id;
  const player2Id = battle.player2_user_id || (battle as any).contestant_b_id;
  
  const isUserParticipant = user && user.id ? 
    (String(player1Id) === String(user.id) || String(player2Id) === String(user.id)) : 
    false;
  
  const showVoteDetails = hasVoted !== null || isArchived || isUserParticipant;

  // プロフィールページへの遷移関数
  const navigateToProfile = (userId: string) => {
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

  // Load player season points
  const loadPlayerRatings = async () => {
    try {
      // Player Aのシーズンポイント取得
      const { data: playerAData, error: errorA } = await supabase
        .from('profiles')
        .select('season_points')
        .eq('id', battle.player1_user_id)
        .single();

      // Player Bのシーズンポイント取得
      const { data: playerBData, error: errorB } = await supabase
        .from('profiles')
        .select('season_points')
        .eq('id', battle.player2_user_id)
        .single();

      setPlayerRatings({
        playerA: { 
          rating: playerAData?.season_points || 1200, 
          loading: false 
        },
        playerB: { 
          rating: playerBData?.season_points || 1200, 
          loading: false 
        }
      });

      if (errorA) console.warn('⚠️ Player A season points fetch error:', errorA);
      if (errorB) console.warn('⚠️ Player B season points fetch error:', errorB);
    } catch (error) {
      console.error('❌ Failed to load player season points:', error);
      setPlayerRatings({
        playerA: { rating: 1200, loading: false },
        playerB: { rating: 1200, loading: false }
      });
    }
  };

  // Load user's current vote status when component mounts
  useEffect(() => {
    const loadVoteStatus = async () => {
      setIsLoadingVoteStatus(true);
      try {
        const voteStatus = await getUserVote(battle.id);

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
    
    // Track battle view event based on battle type
    if (isArchived) {
      trackBeatNexusEvents.archivedBattleView(battle.id);
    } else {
      trackBeatNexusEvents.activeBattleView(battle.id);
    }
    
    loadVoteStatus();
    loadPlayerRatings(); // レート情報を読み込み
    // Load comments when component mounts
    fetchBattleComments(battle.id);
  }, [battle.id, getUserVote, fetchBattleComments]);

  // Get comments for this battle
  const comments = battleComments[battle.id] || [];
  const isLoadingComments = commentsLoading[battle.id] || false;

  // Handle simple vote without comment
  const handleSimpleVote = async (player: 'A' | 'B') => {
    if (!user || isUserParticipant || hasVoted) return;
    
    setIsVoting(true);
    try {
      await voteBattle(battle.id, player);
      
      // Track vote event
      trackBeatNexusEvents.battleVote(battle.id);
      
      // Update local state
      setHasVoted(player);
      if (player === 'A') {
        setVotesA(prev => prev + 1);
      } else {
        setVotesB(prev => prev + 1);
      }
      
      // Refresh comments to show the new vote
      await fetchBattleComments(battle.id);
      
      // Close modal
      setShowVoteModal(null);
    } catch (error) {
      console.error('❌ Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle vote with comment
  const handleVoteWithComment = async (player: 'A' | 'B', comment: string) => {
    if (!user || isUserParticipant || hasVoted) return;
    
    setIsVoting(true);
    try {
      await voteBattleWithComment(battle.id, player, comment);
      
      // Track vote event
      trackBeatNexusEvents.battleVote(battle.id);
      
      // Update local state
      setHasVoted(player);
      if (player === 'A') {
        setVotesA(prev => prev + 1);
      } else {
        setVotesB(prev => prev + 1);
      }
      
      // Refresh comments to show the new vote/comment
      await fetchBattleComments(battle.id);
      
      // Close modal
      setShowVoteModal(null);
    } catch (error) {
      console.error('❌ Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle cancel vote
  const handleCancelVote = async () => {
    if (!hasVoted) return;
    
    setIsVoting(true);
    try {
      await cancelVote(battle.id);
      
      // Update local state
      if (hasVoted === 'A') {
        setVotesA(prev => Math.max(0, prev - 1));
      } else {
        setVotesB(prev => Math.max(0, prev - 1));
      }
      setHasVoted(null);
      
      // Refresh comments
      await fetchBattleComments(battle.id);
    } catch (error) {
      console.error('❌ Cancel vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };



  // Format timestamp for comments
  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffTime = now.getTime() - commentTime.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };


  
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
  
  // 色の固定化のため、colorPairs配列は不要になりました

  // 固定色: プレイヤーAを青、プレイヤーBを赤  
  const playerColorA = '#3B82F6'; // Blue for Player A
  const playerColorB = '#EF4444'; // Red for Player B
  const gradientBg = 'from-blue-500/20 to-red-500/20';

  const handleShareBattle = () => {
    const player1Name = battle.contestant_a?.username || 'Player 1';
    const player2Name = battle.contestant_b?.username || 'Player 2';

    const isParticipant = user?.id === battle.player1_user_id || user?.id === battle.player2_user_id;

    const isJa = i18n.language.startsWith('ja');

    let shareText = '';

    if (isParticipant) {
      // Participant templates (fixed)
      const opponentUsername = user?.id === battle.player1_user_id ? player2Name : player1Name;
      shareText = isJa
        ? `BeatNexusでバトル中です！🔥\n対戦相手は ${opponentUsername} さん！\n\n最高のパフォーマンスをしたので、ぜひ見て応援（投票）お願いします！💪\n\n投票はこちらから👇`
        : `I'm in a battle on BeatNexus! 🥊\nFacing off against the incredible ${opponentUsername}.\n\nGave it my all on this one. Check it out and drop a vote if you're feelin' my performance! 🙏\n\nWatch & Vote here 👇`;
    } else {
      // Spectator templates (two variants each lang)
      if (isJa) {
        const templates = [
          `【🔥BATTLE ALERT🔥】\n${player1Name} 🆚 ${player2Name}\n\nBeatNexusで超ハイレベルなビートボックスバトルが勃発！\n勝敗はあなたの投票で決まる！今すぐジャッジに参加しよう！\n\n🎤 観戦＆投票はこちら👇`,
          `君の一票が勝敗を分ける。\n${player1Name} vs ${player2Name}、究極のビートボックス対決！🔥\n\nどっちのフロウが、スキルが、より心を揺さぶる？\nあなたの耳でジャッジしてください！\n\n🎧 投票ページへ👇`
        ];
        shareText = templates[Math.floor(Math.random() * templates.length)];
      } else {
        const templates = [
          `🔥 EPIC BATTLE ALERT 🔥\n${player1Name} 🆚 ${player2Name} are throwing down on BeatNexus!\n\nWho takes the win? YOU decide! This is a must-watch for any beatbox fan.\n\n🎤 Cast your vote now! 👇`,
          `Your vote is the final say. 🎧\n${player1Name} vs ${player2Name} in an insane clash on BeatNexus.\n\nWho's got the better flow, tech, and musicality?\nBe the judge and make your voice heard!\n\nJudge the battle now 👇`
        ];
        shareText = templates[Math.floor(Math.random() * templates.length)];
      }
    }

    const url = `${window.location.origin}/battle/${battle.id}`;
    const tags = "#BeatNexus #ビートボックス #Beatbox";
    const taggedTextBase = `${shareText}\n\n${tags}`;

    // X(Twitter) counts any URL as 23 characters. Reserve that + 1 space.
    const MAX_TEXT_LEN = 280 - 24; // 23 for URL + 1 space

    let taggedText = taggedTextBase;
    if (taggedText.length > MAX_TEXT_LEN) {
      const excess = taggedText.length - MAX_TEXT_LEN;
      const newShare = shareText.slice(0, Math.max(0, shareText.length - excess - 1)).trimEnd() + '…';
      taggedText = `${newShare}\n\n${tags}`;
    }

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(taggedText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 relative overflow-hidden">
      
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
          
          {/* Main Battle Title with Player Names */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 mb-4 drop-shadow-lg">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:gap-4">
                <div className="text-right">
                  <span 
                    className="truncate max-w-full inline-block" 
                    title={battle.contestant_a?.username || 'Player A'}
                  >
                    {battle.contestant_a?.username || 'Player A'}
                  </span>
                </div>
                <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">VS</span>
                <div className="text-left">
                  <span 
                    className="truncate max-w-full inline-block" 
                    title={battle.contestant_b?.username || 'Player B'}
                  >
                    {battle.contestant_b?.username || 'Player B'}
                  </span>
                </div>
              </div>
            </h1>
          </div>
          
          {/* Battle Stats */}
          <div className="flex items-center justify-center gap-6 text-gray-300">
            <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
              <Timer className="h-4 w-4 text-cyan-400" />
              <span className="font-medium">{getTimeRemaining(battle.end_voting_at)}</span>
            </div>
            {/* Total votes always visible */}
            <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
              <Users className="h-4 w-4 text-green-400" />
              <span className="font-medium">{totalVotes} votes</span>
            </div>
          </div>
        </div>

        {/* Battle Result Overview */}
        <div className="battle-card mb-8">
          <div className="battle-card__content relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45"></div>
          </div>
          
          <div className="relative p-8">


            {/* Battle Arena */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center mb-8">
              {/* Player A Section */}
              <div className="relative">
                {/* Player A Name - Above Video on Mobile, Separate Position on Desktop */}
                <div className="flex items-center gap-3 mb-4 lg:hidden">
                  <div 
                    className="w-16 h-16 rounded-full p-1 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${playerColorA}, ${playerColorA}80)` }}
                    onClick={() => navigateToProfile(battle.player1_user_id)}
                  >
                    <img
                      src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl()}
                      alt={battle.contestant_a?.username}
                      className="w-full h-full rounded-full border border-gray-900 object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div 
                      className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px] cursor-pointer hover:text-cyan-300 transition-colors" 
                      title={battle.contestant_a?.username || 'Player A'}
                      onClick={() => navigateToProfile(battle.player1_user_id)}
                    >
                      {battle.contestant_a?.username || 'Player A'}
                    </div>
                    <div className="flex items-center gap-2">
                      {playerRatings.playerA.loading ? (
                        <div className="text-sm text-gray-400">読み込み中...</div>
                      ) : (
                        <div className="text-sm font-medium text-white">
                          {playerRatings.playerA.rating}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player A Name - Desktop Layout */}
                <div className="hidden lg:flex items-center gap-3 mb-4">
                  <div 
                    className="w-16 h-16 rounded-full p-1 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${playerColorA}, ${playerColorA}80)` }}
                    onClick={() => navigateToProfile(battle.player1_user_id)}
                  >
                    <img
                      src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl()}
                      alt={battle.contestant_a?.username}
                      className="w-full h-full rounded-full border border-gray-900 object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div 
                      className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px] cursor-pointer hover:text-cyan-300 transition-colors" 
                      title={battle.contestant_a?.username || 'Player A'}
                      onClick={() => navigateToProfile(battle.player1_user_id)}
                    >
                      {battle.contestant_a?.username || 'Player A'}
                    </div>
                    <div className="flex items-center gap-2">
                      {playerRatings.playerA.loading ? (
                        <div className="text-sm text-gray-400">読み込み中...</div>
                      ) : (
                        <div className="text-sm font-medium text-white">
                          {playerRatings.playerA.rating}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player A Video Preview */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2" style={{ borderColor: playerColorA }}>
                  {battle.video_url_a ? (
                    <video
                      src={battle.video_url_a}
                      className="w-full h-full object-contain"
                      controls
                      preload="metadata"
                      onError={(e) => {
                        console.error('Player A video error:', e);
                        e.currentTarget.style.display = 'none';
                        const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                        if (errorDiv) errorDiv.style.display = 'flex';
                      }}
                    >
                      <source src={battle.video_url_a} type="video/webm" />
                      <source src={battle.video_url_a} type="video/mp4" />
                      {t('battleReplay.videoNotSupported')}
                    </video>
                  ) : null}
                  
                  {!battle.video_url_a ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900">
                      <Play className="h-16 w-16 mb-3 opacity-50" />
                      <p className="text-sm text-center px-4">
                        {t('battleView.videoLoading')}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900" style={{ display: 'none' }}>
                      <AlertTriangle className="h-16 w-16 mb-3 opacity-50" />
                      <p className="text-sm text-center px-4">
                        {t('battleReplay.videoError')}
                      </p>
                    </div>
                  )}

                  {/* Winner Badge */}
                  {isALeading && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full p-2 shadow-lg animate-pulse">
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* VS Separator */}
              <div className="flex items-center justify-center lg:px-6">
                <div className="flex flex-col items-center gap-4">
                  <VSIcon className="w-20 h-20 md:w-24 md:h-24" />
                </div>
              </div>

              {/* Player B Section */}
              <div className="relative">
                {/* Player B Name - Desktop Layout (Above Video) */}
                <div className="hidden lg:flex items-center gap-3 mb-4 lg:justify-end">
                  <div className="flex flex-col lg:items-end">
                    <div 
                      className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px] cursor-pointer hover:text-cyan-300 transition-colors" 
                      title={battle.contestant_b?.username || 'Player B'}
                      onClick={() => navigateToProfile(battle.player2_user_id)}
                    >
                      {battle.contestant_b?.username || 'Player B'}
                    </div>
                    <div className="flex items-center gap-2 lg:flex-row-reverse">
                      {playerRatings.playerB.loading ? (
                        <div className="text-sm text-gray-400">読み込み中...</div>
                      ) : (
                        <div className="text-sm font-medium text-white">
                          {playerRatings.playerB.rating}
                        </div>
                      )}
                    </div>
                  </div>
                  <div 
                    className="w-16 h-16 rounded-full p-1 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${playerColorB}, ${playerColorB}80)` }}
                    onClick={() => navigateToProfile(battle.player2_user_id)}
                  >
                    <img
                      src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl()}
                      alt={battle.contestant_b?.username}
                      className="w-full h-full rounded-full border border-gray-900 object-cover"
                    />
                  </div>
                </div>

                {/* Player B Video Preview */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2" style={{ borderColor: playerColorB }}>
                  {battle.video_url_b ? (
                    <video
                      src={battle.video_url_b}
                      className="w-full h-full object-contain"
                      controls
                      preload="metadata"
                      onError={(e) => {
                        console.error('Player B video error:', e);
                        e.currentTarget.style.display = 'none';
                        const errorDiv = e.currentTarget.nextElementSibling as HTMLElement;
                        if (errorDiv) errorDiv.style.display = 'flex';
                      }}
                    >
                      <source src={battle.video_url_b} type="video/webm" />
                      <source src={battle.video_url_b} type="video/mp4" />
                      {t('battleReplay.videoNotSupported')}
                    </video>
                  ) : null}
                  
                  {!battle.video_url_b ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900">
                      <Play className="h-16 w-16 mb-3 opacity-50" />
                      <p className="text-sm text-center px-4">
                        {t('battleView.videoLoading')}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900" style={{ display: 'none' }}>
                      <AlertTriangle className="h-16 w-16 mb-3 opacity-50" />
                      <p className="text-sm text-center px-4">
                        {t('battleReplay.videoError')}
                      </p>
                    </div>
                  )}

                  {/* Winner Badge */}
                  {isBLeading && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full p-2 shadow-lg animate-pulse">
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Player B Name - Below Video on Mobile */}
                <div className="flex items-center gap-3 mt-4 lg:hidden justify-end">
                  <div className="flex flex-col items-end">
                    <div 
                      className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px] cursor-pointer hover:text-cyan-300 transition-colors" 
                      title={battle.contestant_b?.username || 'Player B'}
                      onClick={() => navigateToProfile(battle.player2_user_id)}
                    >
                      {battle.contestant_b?.username || 'Player B'}
                    </div>
                    <div className="flex items-center gap-2 flex-row-reverse">
                      {playerRatings.playerB.loading ? (
                        <div className="text-sm text-gray-400">読み込み中...</div>
                      ) : (
                        <div className="text-sm font-medium text-white">
                          {playerRatings.playerB.rating}
                        </div>
                      )}
                    </div>
                  </div>
                  <div 
                    className="w-16 h-16 rounded-full p-1 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${playerColorB}, ${playerColorB}80)` }}
                    onClick={() => navigateToProfile(battle.player2_user_id)}
                  >
                    <img
                      src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl()}
                      alt={battle.contestant_b?.username}
                      className="w-full h-full rounded-full border border-gray-900 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Vote Distribution Bar - Only show if voted, archived, or participant */}
            {(hasVoted || isArchived || isUserParticipant) && (
              <div className="max-w-2xl mx-auto">
                <div className="flex justify-between text-sm text-gray-400 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: playerColorA }}
                    ></div>
                    <span 
                      className="font-medium truncate max-w-[100px] md:max-w-[130px] cursor-pointer hover:text-cyan-300 transition-colors" 
                      title={battle.contestant_a?.username || 'Player A'}
                      onClick={() => navigateToProfile(battle.player1_user_id)}
                    >
                      {battle.contestant_a?.username || 'Player A'}
                    </span>
                    <span className="font-bold flex-shrink-0">{percentageA.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold flex-shrink-0">{(100 - percentageA).toFixed(1)}%</span>
                    <span 
                      className="font-medium truncate max-w-[100px] md:max-w-[130px] cursor-pointer hover:text-cyan-300 transition-colors" 
                      title={battle.contestant_b?.username || 'Player B'}
                      onClick={() => navigateToProfile(battle.player2_user_id)}
                    >
                      {battle.contestant_b?.username || 'Player B'}
                    </span>
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: playerColorB }}
                    ></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-800 rounded-full overflow-hidden shadow-inner border border-gray-700">
                  <div className="h-full flex">
                    <div 
                      className="transition-all duration-1000 ease-out relative"
                      style={{ 
                        width: `${percentageA}%`, 
                        background: `linear-gradient(90deg, ${playerColorA}, ${playerColorA}80)` 
                      }}
                    >
                      {percentageA > 15 && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-xs font-bold">
                          {votesA}
                        </div>
                      )}
                    </div>
                    <div 
                      className="transition-all duration-1000 ease-out relative"
                      style={{ 
                        width: `${100 - percentageA}%`, 
                        background: `linear-gradient(90deg, ${playerColorB}80, ${playerColorB})` 
                      }}
                    >
                      {(100 - percentageA) > 15 && (
                        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-xs font-bold">
                          {votesB}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Old Battle Arena - Remove entire section */}
        <div className="relative" style={{ display: 'none' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            
            {/* Player A Side - Left */}
            <div className="relative">
              {/* Battle Side Indicator */}
              <div className="absolute -top-4 -left-4 -right-4 -bottom-4 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-xl"></div>
              
              <div className="battle-card">
                <div className="battle-card__content relative overflow-hidden">
                
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
                    <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => navigateToProfile(battle.player1_user_id)}>
                      <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-r from-cyan-400 to-blue-600 shadow-lg">
                        <img
                          src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl()}
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
                      <h3 
                        className="text-2xl font-bold text-white mb-1 truncate max-w-[180px] md:max-w-[220px] cursor-pointer hover:text-cyan-300 transition-colors" 
                        title={battle.contestant_a?.username || 'Contestant A'}
                        onClick={() => navigateToProfile(battle.player1_user_id)}
                      >
                        {battle.contestant_a?.username || 'Contestant A'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-black ${
                          isALeading ? 'text-cyan-400 animate-pulse' : 'text-cyan-300'
                        }`}>
                          {showVoteDetails ? votesA : '--'}
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
                </div>
              </div>
            </div>

            {/* Player B Side - Right */}
            <div className="relative">
              {/* Battle Side Indicator */}
              <div className="absolute -top-4 -left-4 -right-4 -bottom-4 rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 blur-xl"></div>
              
              <div className="battle-card">
                <div className="battle-card__content relative overflow-hidden">
                
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
                    <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => navigateToProfile(battle.player2_user_id)}>
                      <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-r from-pink-400 to-purple-600 shadow-lg">
                        <img
                          src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl()}
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
                      <h3 
                        className="text-2xl font-bold text-white mb-1 truncate max-w-[180px] md:max-w-[220px] cursor-pointer hover:text-pink-300 transition-colors" 
                        title={battle.contestant_b?.username || 'Contestant B'}
                        onClick={() => navigateToProfile(battle.player2_user_id)}
                      >
                        {battle.contestant_b?.username || 'Contestant B'}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-black ${
                          isBLeading ? 'text-pink-400 animate-pulse' : 'text-pink-300'
                        }`}>
                          {showVoteDetails ? votesB : '--'}
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Voting Console Machine - Show for all users */}
        <div className="flex justify-center mt-12">
            <div className="relative">
              
              {/* Main Console Base - Compact Horizontal */}
              <div className="relative bg-gray-900 rounded-2xl px-8 py-5 border-3 border-gray-600 shadow-xl max-w-2xl">
              
              {/* Top Panel with Voting Tips */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-1.5 rounded-full border border-gray-500">
                <VotingTips 
                  playerAName={battle.contestant_a?.username || 'Player A'}
                  playerBName={battle.contestant_b?.username || 'Player B'}
                />
              </div>

              {/* Console Surface - Centered Buttons Only */}
              <div className="relative bg-gray-800 rounded-xl p-6 border border-gray-600">
                
                                  {/* Unified View - Show vote counters for all users, voting buttons only for non-participants */}
                  <div className="flex items-center justify-center gap-4 md:gap-8">
                    
                    {/* Player A Vote Counter - Shown only after vote or participant/archived */}
                    {showVoteDetails && (
                    <div className="flex flex-col items-center">
                        <div className={`bg-gray-800 rounded-xl p-2 md:p-4 border shadow-lg transition-all duration-500 relative w-16 md:w-20 flex flex-col items-center ${
                        hasVoted === 'A' 
                            ? 'border-green-400/60 shadow-green-500/30 ring-2 ring-green-400' 
                          : 'border-cyan-500/30 shadow-lg'
                      }`}>
                        <div className={`text-xs font-bold mb-1 text-center transition-colors duration-300 ${
                          hasVoted === 'A' ? 'text-green-300' : 'text-cyan-300'
                        }`}>
                            PLAYER A
                        </div>
                        <div className="text-center">
                          <div className={`text-xl md:text-3xl font-bold transition-all duration-500 ease-out transform ${
                            hasVoted === 'A' 
                              ? 'text-green-300 animate-pulse' 
                              : 'text-cyan-300'
                          }`}>
                            {showVoteDetails ? votesA : '--'}
                          </div>
                          <div className={`text-xs mt-1 transition-colors duration-300 ${
                            hasVoted === 'A' ? 'text-green-400' : 'text-cyan-400'
                          }`}>
                            VOTES
                          </div>
                        </div>
                        {hasVoted === 'A' && (
                          <div className="absolute -top-2 -right-2 w-4 h-4 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                    )}
                    
                    {/* Player A Button - Only show for non-participants */}
                    {!isUserParticipant && (
                      <div className="relative">
                        {/* Button */}
                        {isLoadingVoteStatus ? (
                          <div className="w-15 h-12 rounded-full bg-cyan-600/50 flex items-center justify-center animate-pulse">
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : hasVoted === 'A' ? (
                          <div className="relative">
                            <button className="vote-btn-player-a vote-btn-voted">
                              <div className="back"></div>
                              <div className="front">
                                <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                              </div>
                            </button>
                            <button 
                              onClick={handleCancelVote} 
                              disabled={isVoting}
                              className="absolute -top-1 -right-1 w-5 h-5 md:w-7 md:h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                            >
                              <X className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowVoteModal('A')} 
                            disabled={isVoting || !!hasVoted || isUserParticipant}
                            className="vote-btn-player-a"
                          >
                            <div className="back"></div>
                            <div className="front">
                              <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                          </button>
                        )}
                        
                        {/* Label Plate */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-700 to-gray-800 px-3 py-0.5 rounded-full border border-cyan-500/30">
                          <p className="text-cyan-300 font-bold text-xs whitespace-nowrap">
                            A
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Central Total Votes Counter or Divider */}
                    {!hasVoted && !isUserParticipant ? (
                    <div className="flex flex-col items-center">
                        <div className="bg-gray-800 rounded-xl p-2 md:p-4 border border-purple-500/30 shadow-lg transition-all duration-500">
                          <div className="text-xs font-bold mb-1 text-center text-purple-300">
                            TOTAL
                          </div>
                          <div className="text-center">
                            <div className="text-xl md:text-3xl font-bold text-purple-300">
                              {totalVotes}
                            </div>
                            <div className="text-xs mt-1 text-purple-400">
                              VOTES
                            </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                      <div className="w-px h-12 bg-gradient-to-b from-transparent via-gray-600/60 to-transparent"></div>
                      )}

                    {/* Player B Button - Only show for non-participants */}
                    {!isUserParticipant && (
                      <div className="relative">
                        {/* Button */}
                        {isLoadingVoteStatus ? (
                          <div className="w-15 h-12 rounded-full bg-pink-600/50 flex items-center justify-center animate-pulse">
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : hasVoted === 'B' ? (
                          <div className="relative">
                            <button className="vote-btn-player-b vote-btn-voted">
                              <div className="back"></div>
                              <div className="front">
                                <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                              </div>
                            </button>
                            <button 
                              onClick={handleCancelVote} 
                              disabled={isVoting}
                              className="absolute -top-1 -right-1 w-5 h-5 md:w-7 md:h-7 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                            >
                              <X className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowVoteModal('B')} 
                            disabled={isVoting || !!hasVoted || isUserParticipant}
                            className="vote-btn-player-b"
                          >
                            <div className="back"></div>
                            <div className="front">
                              <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                          </button>
                        )}
                        
                        {/* Label Plate */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gray-700 to-gray-800 px-3 py-0.5 rounded-full border border-pink-500/30">
                          <p className="text-pink-300 font-bold text-xs whitespace-nowrap">
                            B
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Player B Vote Counter - Shown only after vote or participant/archived */}
                    {showVoteDetails && (
                    <div className="flex flex-col items-center">
                        <div className={`bg-gray-800 rounded-xl p-2 md:p-4 border shadow-lg transition-all duration-500 relative w-16 md:w-20 flex flex-col items-center ${
                        hasVoted === 'B' 
                            ? 'border-green-400/60 shadow-green-500/30 ring-2 ring-green-400' 
                          : 'border-pink-500/30 shadow-lg'
                      }`}>
                        <div className={`text-xs font-bold mb-1 text-center transition-colors duration-300 ${
                          hasVoted === 'B' ? 'text-green-300' : 'text-pink-300'
                        }`}>
                            PLAYER B
                        </div>
                        <div className="text-center">
                          <div className={`text-xl md:text-3xl font-bold transition-all duration-500 ease-out transform ${
                            hasVoted === 'B' 
                              ? 'text-green-300 animate-pulse' 
                              : 'text-pink-300'
                          }`}>
                            {showVoteDetails ? votesB : '--'}
                          </div>
                          <div className={`text-xs mt-1 transition-colors duration-300 ${
                            hasVoted === 'B' ? 'text-green-400' : 'text-pink-400'
                          }`}>
                            VOTES
                          </div>
                        </div>
                        {hasVoted === 'B' && (
                          <div className="absolute -top-2 -right-2 w-4 h-4 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                    )}

                  </div>

                  {/* (share button moved) */}

              </div>

              {/* Bottom Share Button */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-600 to-purple-600 px-4 py-1.5 rounded-full border border-purple-400 flex items-center gap-2 shadow-md cursor-pointer select-none hover:scale-105 transition-transform z-50" onClick={handleShareBattle}>
                <Share2 className="h-4 w-4 text-white" />
                <span className="text-xs font-semibold text-white">SHARE</span>
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

        {/* Community Reactions */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-8 relative mt-16 md:mt-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {t('battleView.comments')}
            </h3>
            <div className="text-sm text-gray-400">
              ({comments.length})
            </div>
          </div>

          {/* Comments List */}
          <div>
              {isLoadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-400">{t('battleView.loading')}</span>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700/50">
                      <div className="relative">
                        <img
                          src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`}
                          alt={comment.username}
                          className="w-10 h-10 rounded-full border-2 border-gray-600"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                          comment.vote === 'A' ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' : 'bg-gradient-to-r from-pink-500 to-pink-400'
                        }`}>
                          <span className="text-white font-bold text-xs">{comment.vote}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{comment.username}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                        {comment.comment ? (
                          <p className="text-gray-300 text-sm">{comment.comment}</p>
                        ) : (
                          <p className="text-gray-500 text-sm italic">投票のみ</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">{t('battleView.noComments')}</p>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Vote Method Selection Modal */}
      {showVoteModal && (
        <VoteCommentModal
          isOpen={!!showVoteModal}
          onClose={() => setShowVoteModal(null)}
          onVote={(comment) => handleVoteWithComment(showVoteModal!, comment)}
          onSimpleVote={handleSimpleVote}
          player={showVoteModal || 'A'}
          playerName={showVoteDetails ? (showVoteModal === 'A' ? battle.contestant_a?.username : battle.contestant_b?.username) : battle.contestant_a?.username}
          isLoading={isVoting}
        />
      )}
    </div>
  );
};