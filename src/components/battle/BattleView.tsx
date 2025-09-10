import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Share2, ThumbsUp, MessageCircle, Play, Users, Timer } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

import { VoteCommentModal } from '../ui/VoteCommentModal';
import { useBattleStore } from '../../store/battleStore';
import { useAuthStore } from '../../store/authStore';
import { useAuthModal } from '../auth/AuthProvider';
import { Battle } from '../../types';
import { useTranslation } from 'react-i18next';
import { VSIcon } from '../ui/VSIcon';
import { VotingTips } from '../ui/VotingTips';
import { trackBeatNexusEvents } from '../../utils/analytics';
import { ShareModal } from '../ui/ShareModal';
import { ScoreBreakdownModal } from '../ui/ScoreBreakdownModal';
import type { ScoreBreakdownEntry } from '../../types/scoreBreakdown';
import { buildBattleShareText } from '../../utils/share';
import { generateBattleUrl } from '../../utils/battleUrl';

import { supabase } from '../../lib/supabase';
import { getDefaultAvatarUrl } from '../../utils';
import { isIOSDevice } from '../../utils/videoSupport';
import { HybridVideoPlayer } from '../ui/HybridVideoPlayer';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
// import { getIOSCompatibleUrl } from '../../utils/iosVideoMapping';
import { SupportTipModal } from './SupportTipModal';
import { toast } from '../../store/toastStore';

interface BattleViewProps {
  battle: Battle;
  isArchived?: boolean; // アーカイブバトルかどうかを示すフラグ
}

export const BattleView: React.FC<BattleViewProps> = ({ battle, isArchived = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasVoted, setHasVoted] = useState<'A' | 'B' | null>(null);
  const [votesA, setVotesA] = useState(battle.votes_a);
  const [votesB, setVotesB] = useState(battle.votes_b);
  const [isLoadingVoteStatus, setIsLoadingVoteStatus] = useState(true);
  const [showPaymentResult, setShowPaymentResult] = useState<'succeeded' | 'failed' | 'processing' | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState<'A' | 'B' | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [supportTarget, setSupportTarget] = useState<{ userId: string; name?: string } | null>(null);
  const [openVoteSupportOn, setOpenVoteSupportOn] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoreEntries, setScoreEntries] = useState<ScoreBreakdownEntry[]>([]);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [playerRatings, setPlayerRatings] = useState<{
    playerA: { rating: number; loading: boolean };
    playerB: { rating: number; loading: boolean };
  }>({
    playerA: { rating: 1200, loading: true },
    playerB: { rating: 1200, loading: true }
  });
  
  // Phase 3: 遅延読み込み用の状態管理
  const [playerAVideoLoaded, setPlayerAVideoLoaded] = useState(false);
  const [playerBVideoLoaded, setPlayerBVideoLoaded] = useState(false);
  
  // Intersection Observer用のref
  const playerARef = useRef<HTMLDivElement>(null);
  const playerBRef = useRef<HTMLDivElement>(null);
  
  // ビューポート内にある要素を検知
  const playerAInView = useIntersectionObserver(playerARef);
  const playerBInView = useIntersectionObserver(playerBRef);
  

  
  // Stores
  const { 
    voteBattle, 
    voteBattleWithComment, 
    getUserVote, 
    fetchBattleComments, 
    battleComments, 
  commentsLoading,
  getBattleScoreBreakdown,
  getArchivedBattleScoreBreakdown,
  } = useBattleStore();
  const { user } = useAuthStore();
  const { openAuthModal } = useAuthModal();
  
  // 🔍 厳密な型チェックと参加者判定 - battleStoreの変換後データに合わせて修正
  const player1Id = battle.player1_user_id || battle.contestant_a_id;
  const player2Id = battle.player2_user_id || battle.contestant_b_id;
  
  const isUserParticipant = user && user.id ? 
    (String(player1Id) === String(user.id) || String(player2Id) === String(user.id)) : 
    false;
  
  const showVoteDetails = hasVoted !== null || isArchived || isUserParticipant;

  const openScoreBreakdown = useCallback(async () => {
    if (!isUserParticipant) return; // ガード
    try {
      setScoreLoading(true);
      const entries = isArchived
        ? await getArchivedBattleScoreBreakdown(battle.id)
        : await getBattleScoreBreakdown(battle.id);
      setScoreEntries(entries);
      setScoreModalOpen(true);
    } catch (e: unknown) {
      console.error('❌ Failed to load score breakdown:', e);
      const msg = (e as { message?: string })?.message || '内訳の取得に失敗しました';
      toast.error('Score', msg);
    } finally {
      setScoreLoading(false);
    }
  }, [battle.id, isArchived, isUserParticipant, getBattleScoreBreakdown, getArchivedBattleScoreBreakdown]);

  // 単独支援モーダルを開く（受け取り設定チェック付き）
  const openSupportModalFor = async (userId: string, name?: string) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    try {
      // 受け取り先ユーザーのStripe受け取り可否を確認
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_charges_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('⚠️ Failed to check recipient connect status:', error);
      }

      const ready = data?.stripe_charges_enabled === true;
      if (!ready) {
        // 受け取り設定が未完了の場合は通知のみ（i18nで日英対応）
        toast.warning('Super Tip', t('superTip.errors.recipientNotReady'));
        return;
      }
    } catch (e) {
      console.error('❌ Error checking recipient connect status:', e);
      // 失敗時は安全側でブロックし、ユーザーに通知（i18nで日英対応）
      toast.warning('Super Tip', t('superTip.errors.recipientNotReady'));
      return;
    }

    setSupportTarget({ userId, name });
    setSupportModalOpen(true);
  };

  const closeSupportModal = () => {
    setSupportModalOpen(false);
    setSupportTarget(null);
  };

  // 単独支援モーダルから「投票しながら支援」を選択したとき
  const openVoteSupportFromSupportModal = useCallback(() => {
    // どちらのプレイヤーに対する支援か分からないため、受取人と一致する側を推定
    if (!supportTarget) return;
    const targetUserId = supportTarget.userId;
    const side: 'A' | 'B' | null = String(targetUserId) === String(player1Id) ? 'A' : (String(targetUserId) === String(player2Id) ? 'B' : null);
  setOpenVoteSupportOn(true);
    if (!side) {
      // サイドが特定できない場合はA側で開く（安全なフォールバック）
      setShowVoteModal('A');
    } else {
      setShowVoteModal(side);
    }
    // 支援ONで開くため、一旦閉じてVoteCommentModal側のpropsで制御
    setSupportModalOpen(false);
  }, [player1Id, player2Id, supportTarget]);

  // プロフィールページへの遷移関数
  const navigateToProfile = (userId: string) => {
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

  // Load player season points
  const loadPlayerRatings = useCallback(async () => {
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
  }, [battle.player1_user_id, battle.player2_user_id]);

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
  }, [battle.id, getUserVote, fetchBattleComments, isArchived, loadPlayerRatings]);

  // Phase 3: Player A の遅延読み込み制御
  useEffect(() => {
    if (playerAInView && !playerAVideoLoaded) {
      console.log('🎬 Player A is in view, loading video...');
      setPlayerAVideoLoaded(true);
    }
  }, [playerAInView, playerAVideoLoaded]);

  // Phase 3: Player B の遅延読み込み制御（iOS最適化版）
  useEffect(() => {
    if (playerBInView && !playerBVideoLoaded) {
      console.log('🎬 Player B is in view, loading video...');
      // Cloudflare Stream プレイヤーでは <video> 要素が直接 DOM に存在しない場合があるため
      // 旧ロジックの readyState ポーリングは機能せず片側が永遠に読み込まれない問題が発生していた。
      // iOS でも Player A のマウント（playerAVideoLoaded）を確認後、短い遅延で B を解放する簡易方式に変更。
      if (isIOSDevice()) {
        if (!playerAVideoLoaded) {
          console.log('⏳ iOS: waiting Player A mount before loading B...');
          // Player A がまだなら次のレンダーで再評価
          return;
        }
        setTimeout(() => {
          console.log('🚀 iOS: loading Player B after short delay');
          setPlayerBVideoLoaded(true);
        }, 400); // 体感的に十分な短い遅延
      } else {
        console.log('🚀 Non-iOS device detected, loading Player B immediately...');
        setPlayerBVideoLoaded(true);
      }
    }
  }, [playerBInView, playerBVideoLoaded, playerAVideoLoaded]);

  // 投票状態を更新（Webhook反映の遅延を考慮して短時間ポーリング）
  const refreshVoteStatus = useCallback(async () => {
    try {
      const maxTries = 8; // 最大約4秒（500ms * 8）
      for (let i = 0; i < maxTries; i++) {
        const voteStatus = await getUserVote(battle.id);
        if (voteStatus.hasVoted && voteStatus.vote) {
          setHasVoted(voteStatus.vote);
          // コメントもリフレッシュ
          await fetchBattleComments(battle.id);
          return;
        }
        // まだ反映されていなければ少し待って再試行
        await new Promise((r) => setTimeout(r, 500));
      }
      // 最終的に未反映の場合は未投票扱いのまま
    } catch (error) {
      console.error('❌ Failed to refresh vote status:', error);
    }
  }, [battle.id, getUserVote, fetchBattleComments]);

  // SuperTip決済のリダイレクト戻りを検知（Stripeの標準パラメータにも対応）
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const legacyPayment = params.get('payment'); // payment=success/canceled（従来）
    const sessionId = params.get('session_id');
    const redirectStatus = params.get('redirect_status'); // Stripe標準: succeeded/failed/canceled
    const pi = params.get('payment_intent'); // Stripe標準

    const isSuccess = (legacyPayment === 'success' && !!sessionId) || redirectStatus === 'succeeded' || redirectStatus === 'requires_capture';
    const isCanceled = legacyPayment === 'canceled' || redirectStatus === 'canceled' || redirectStatus === 'failed';

    if (isSuccess) {
      console.log('🎉 SuperTip payment success detected:', { sessionId, pi, redirectStatus });
      // 投票状態をポーリングで更新
      refreshVoteStatus();
      // クエリを消してクリーンなURLに戻す
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    } else if (isCanceled) {
      console.log('❌ SuperTip payment canceled:', { sessionId, pi, redirectStatus });
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
  }, [refreshVoteStatus]);

  // Get comments for this battle
  const comments = battleComments[battle.id] || [];
  const isLoadingComments = commentsLoading[battle.id] || false;

  // Handle simple vote without comment
  const handleSimpleVote = async (player: 'A' | 'B', scoreSheet?: { skills: {A:number;B:number}; musicality:{A:number;B:number}; originality:{A:number;B:number} }) => {
    // 非ログインユーザーの場合はAuthModalを開く
    if (!user) {
      openAuthModal('login');
      return;
    }
    
    if (isUserParticipant || hasVoted) return;
    
    setIsVoting(true);
    try {
      await voteBattle(battle.id, player, scoreSheet);
      
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
  const handleVoteWithComment = async (player: 'A' | 'B', comment: string, scoreSheet?: { skills: {A:number;B:number}; musicality:{A:number;B:number}; originality:{A:number;B:number} }) => {
    // 非ログインユーザーの場合はAuthModalを開く
    if (!user) {
      openAuthModal('login');
      return;
    }
    
    if (isUserParticipant || hasVoted) return;
    
    setIsVoting(true);
    try {
      await voteBattleWithComment(battle.id, player, comment, scoreSheet);
      
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

  // 取り消し機能は廃止: UI/ロジックを削除（再投票不可・分布表示は維持）

  // Handle vote button click - check authentication first
  const handleVoteButtonClick = (player: 'A' | 'B') => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    
    if (isUserParticipant || hasVoted || isVoting) return;
    
    setShowVoteModal(player);
  };



  
  // Calculate time remaining
  const getTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    
    if (diffTime <= 0) {
      return 'VOTING ENDED';
    }
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      const totalHours = diffDays * 24 + diffHours;
      return `${totalHours} HOURS LEFT`;
    } else if (diffHours > 0) {
      return `${diffHours} HOURS LEFT`;
    } else {
      return `${diffMinutes} MINUTES LEFT`;
    }
  };
  
  // Calculate vote percentages
  const totalVotes = votesA + votesB;
  const percentageA = totalVotes > 0 ? (votesA / totalVotes) * 100 : 50;
  
  // 色の固定化のため、colorPairs配列は不要になりました

  // 固定色: プレイヤーAを青、プレイヤーBを赤  
  const playerColorA = '#3B82F6'; // Blue for Player A
  const playerColorB = '#EF4444'; // Red for Player B

  // Share Modal 状態
  const [shareOpen, setShareOpen] = useState(false);
  const handleShareBattle = () => {
    setShareOpen(true);
  };

  // 共有テキスト事前生成 (動的: 言語 / 参加者)
  const isParticipant = user?.id && (String(user.id) === String(player1Id) || String(user.id) === String(player2Id));
  const player1Name = battle.contestant_a?.username || 'Player 1';
  const player2Name = battle.contestant_b?.username || 'Player 2';
  const opponentUsername = isParticipant
    ? (String(user?.id) === String(player1Id) ? player2Name : player1Name)
    : undefined;
  const isJa = (navigator?.language || 'en').startsWith('ja');
  const shareText = buildBattleShareText({
    isParticipant: !!isParticipant,
    isJa,
    opponentUsername,
    player1Name,
    player2Name
  });
  const battleUrlSlug = `${typeof window !== 'undefined' ? window.location.origin : ''}/battle/${generateBattleUrl(player1Name, player2Name, battle.id)}`;

  // 決済完了リダイレクトからのクエリ (?superTip=...) を処理
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const st = params.get('superTip');
    if (!st) return;
    let status: 'succeeded' | 'failed' | 'processing' = 'processing';
    if (st === 'succeeded') status = 'succeeded';
    else if (st === 'failed' || st === 'canceled') status = 'failed';
    setShowPaymentResult(status);

    // 成功時はコメントを再取得
    if (status === 'succeeded') {
      fetchBattleComments(battle.id).catch(() => void 0);
    }

    // URLからクエリを除去（リロード時に再表示しない）
    params.delete('superTip');
    const cleaned = params.toString();
    navigate({ pathname: location.pathname, search: cleaned ? `?${cleaned}` : '' }, { replace: true });

    // 数秒後に自動クローズ
    const timer = setTimeout(() => setShowPaymentResult(null), 4000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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
      {/* Super Tip 完了モーダル */}
      {showPaymentResult && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={() => setShowPaymentResult(null)}>
          <div className="bg-gray-900 rounded-lg shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-3">
              {showPaymentResult === 'succeeded' && t('superTip.complete.title.success')}
              {showPaymentResult === 'failed' && t('superTip.complete.title.failed')}
              {showPaymentResult === 'processing' && t('superTip.complete.title.processing')}
            </h3>
            <p className="text-gray-300 mb-4">
              {showPaymentResult === 'succeeded' && t('superTip.complete.desc.success')}
              {showPaymentResult === 'failed' && t('superTip.complete.desc.failed')}
              {showPaymentResult === 'processing' && t('superTip.complete.desc.processing')}
            </p>
            <button
              onClick={() => setShowPaymentResult(null)}
              className="w-full px-4 py-2 rounded bg-emerald-600 text-white hover:brightness-110"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="relative container-ultra-wide py-8">
        
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
                    <div className="flex items-center gap-3">
                      <div 
                        className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px] cursor-pointer hover:text-cyan-300 transition-colors" 
                        title={battle.contestant_a?.username || 'Player A'}
                        onClick={() => navigateToProfile(battle.player1_user_id)}
                      >
                        {battle.contestant_a?.username || 'Player A'}
                      </div>
                      <button
                        type="button"
                        onClick={() => openSupportModalFor(battle.player1_user_id, battle.contestant_a?.username || 'Player A')}
                        className="support-gradient-button text-sm"
                        aria-label={t('superTip.supportButton')}
                      >
                        <span>📣</span>
                        <span>{t('superTip.supportButton')}</span>
                      </button>
                    </div>
                    <div className="mt-1">
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
                    <div className="flex items-center gap-3">
                      <div 
                        className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px] cursor-pointer hover:text-cyan-300 transition-colors" 
                        title={battle.contestant_a?.username || 'Player A'}
                        onClick={() => navigateToProfile(battle.player1_user_id)}
                      >
                        {battle.contestant_a?.username || 'Player A'}
                      </div>
                      <button
                        type="button"
                        onClick={() => openSupportModalFor(battle.player1_user_id, battle.contestant_a?.username || 'Player A')}
                        className="support-gradient-button text-sm"
                        aria-label={t('superTip.supportButton')}
                      >
                        <span>📣</span>
                        <span>{t('superTip.supportButton')}</span>
                      </button>
                    </div>
                    <div className="mt-1">
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
                <div ref={playerARef} className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2" style={{ borderColor: playerColorA }}>
                  {playerAVideoLoaded ? (
                    <HybridVideoPlayer
                      streamVideoId={battle.stream_video_id_a}
                      videoUrl={battle.video_url_a}
                      controls
                      className="w-full h-full object-contain"
                      muted={isIOSDevice()}
                      onError={() => {
                        console.error('Player A video error');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-center text-gray-400">
                        <Play className="h-16 w-16 mx-auto mb-3 opacity-70" />
                        <p className="text-sm">Player A 動画読み込み中...</p>
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
                    <div className="flex items-center gap-3 lg:flex-row-reverse">
                      <div 
                        className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px] cursor-pointer hover:text-cyan-300 transition-colors" 
                        title={battle.contestant_b?.username || 'Player B'}
                        onClick={() => navigateToProfile(battle.player2_user_id)}
                      >
                        {battle.contestant_b?.username || 'Player B'}
                      </div>
                      <button
                        type="button"
                        onClick={() => openSupportModalFor(battle.player2_user_id, battle.contestant_b?.username || 'Player B')}
                        className="support-gradient-button text-sm"
                        aria-label={t('superTip.supportButton')}
                      >
                        <span>📣</span>
                        <span>{t('superTip.supportButton')}</span>
                      </button>
                    </div>
                    <div className="mt-1 lg:text-right">
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
                <div ref={playerBRef} className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2" style={{ borderColor: playerColorB }}>
                  {playerBVideoLoaded ? (
                    <HybridVideoPlayer
                      streamVideoId={battle.stream_video_id_b}
                      videoUrl={battle.video_url_b}
                      controls
                      className="w-full h-full object-contain"
                      muted={isIOSDevice()}
                      onError={() => {
                        console.error('Player B video error');
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-center text-gray-400">
                        <Play className="h-16 w-16 mx-auto mb-3 opacity-70" />
                        <p className="text-sm">Player B 動画読み込み中...</p>
                        {isIOSDevice() && (
                          <p className="text-xs mt-1 text-blue-400">
                            iOS最適化: Player A読み込み完了後に開始
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Player B Name - Below Video on Mobile */}
                <div className="flex items-center gap-3 mt-4 lg:hidden justify-end">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div 
                        className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px] cursor-pointer hover:text-cyan-300 transition-colors" 
                        title={battle.contestant_b?.username || 'Player B'}
                        onClick={() => navigateToProfile(battle.player2_user_id)}
                      >
                        {battle.contestant_b?.username || 'Player B'}
                      </div>
                      <button
                        type="button"
                        onClick={() => openSupportModalFor(battle.player2_user_id, battle.contestant_b?.username || 'Player B')}
                        className="support-gradient-button text-sm"
                        aria-label={t('superTip.supportButton')}
                      >
                        <span>📣</span>
                        <span>{t('superTip.supportButton')}</span>
                      </button>
                    </div>
                    <div className="mt-1 text-right">
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
                <div className="flex justify-between text-sm text-gray-400 mb-2">
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
                {isUserParticipant && (
                  <div className="flex justify-center mb-2">
                    <button
                      type="button"
                      onClick={openScoreBreakdown}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600 text-white border border-gray-500 shadow"
                    >
                      {t('battleView.scoreBreakdownButton', 'スコア内訳を見る')}
                    </button>
                  </div>
                )}
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
                          <button className="vote-btn-player-a vote-btn-voted" disabled>
                            <div className="back"></div>
                            <div className="front">
                              <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleVoteButtonClick('A')} 
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
                          <button className="vote-btn-player-b vote-btn-voted" disabled>
                            <div className="back"></div>
                            <div className="front">
                              <ThumbsUp className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleVoteButtonClick('B')} 
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
                    comment.isSuperTip ? (
                      <div
                        key={comment.id}
                        className={(() => {
                          // Decide side: prefer explicit superTipVote; fallback to recipient mapping
                          const side: 'A' | 'B' | undefined = (comment.superTipVote as 'A' | 'B' | undefined)
                            ?? ((comment.superTipRecipientUserId === battle.player1_user_id) ? 'A'
                              : (comment.superTipRecipientUserId === battle.player2_user_id) ? 'B'
                              : undefined);
                          // Tier by amount
                          const amt = comment.superTipAmountJpy ?? 0;
                          const tier = amt >= 3000 ? 4 : amt >= 1000 ? 3 : amt >= 500 ? 2 : 1;
                          const sideCls = side === 'A' ? 'supertip-side-A' : side === 'B' ? 'supertip-side-B' : '';
                          return `supertip-card ${sideCls} supertip-tier-${tier}`.trim();
                        })()}
                      >
                        <div className="supertip-card-info p-4">
                          <div className="flex items-start gap-4">
                            <div className="relative shrink-0">
                              <img
                                src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`}
                                alt={comment.username}
                                className={(() => {
                                  const side: 'A' | 'B' | undefined = (comment.superTipVote as 'A' | 'B' | undefined)
                                    ?? ((comment.superTipRecipientUserId === battle.player1_user_id) ? 'A'
                                      : (comment.superTipRecipientUserId === battle.player2_user_id) ? 'B'
                                      : undefined);
                                  const border = side === 'A' ? 'border-cyan-300/70' : side === 'B' ? 'border-pink-300/70' : 'border-yellow-300/70';
                                  return `w-10 h-10 rounded-full border-2 ${border}`;
                                })()}
                              />
                              {(hasVoted || isArchived || isUserParticipant) && (() => {
                                const side: 'A' | 'B' | undefined = (comment.superTipVote as 'A' | 'B' | undefined)
                                  ?? ((comment.superTipRecipientUserId === battle.player1_user_id) ? 'A'
                                    : (comment.superTipRecipientUserId === battle.player2_user_id) ? 'B'
                                    : undefined);
                                if (!side) return null; // スタンドアロン支援はタグ非表示
                                const cls = side === 'A'
                                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                                  : 'bg-gradient-to-r from-pink-500 to-pink-400';
                                return (
                                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${cls}`}>
                                    <span className="text-white font-bold text-xs">{side}</span>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-white">{comment.username}</span>
                                <span className="text-xs text-gray-400">
                                  {new Date(comment.created_at).toLocaleDateString('ja-JP')}
                                </span>
                                <span className="supertip-badge ml-2 hidden md:inline-flex">
                                  <span className="supertip-badge__dot" />
                                  {t('superTip.preview.badge')}
                                </span>
                                {/* Removed standalone label from comment card */}
                              </div>
                              {comment.comment ? (
                                <p className="text-gray-200 text-sm leading-relaxed">{comment.comment}</p>
                              ) : (
                                <p className="text-gray-400 text-sm italic">{t('battleView.voteOnly')}</p>
                              )}
                            </div>
                            {typeof comment.superTipAmountJpy === 'number' && (
                              <div className="ml-auto self-center text-right text-white/95 text-base sm:text-lg md:text-2xl font-extrabold tracking-tight whitespace-nowrap">
                                ¥{Intl.NumberFormat('ja-JP').format(comment.superTipAmountJpy)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={comment.id} className="flex items-start gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700/50">
                        <div className="relative">
                          <img
                            src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`}
                            alt={comment.username}
                            className="w-10 h-10 rounded-full border-2 border-gray-600"
                          />
                          {(hasVoted || isArchived || isUserParticipant) && (
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                              comment.vote === 'A' ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' : 'bg-gradient-to-r from-pink-500 to-pink-400'
                            }`}>
                              <span className="text-white font-bold text-xs">{comment.vote}</span>
                            </div>
                          )}
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
                            <p className="text-gray-500 text-sm italic">{t('battleView.voteOnly')}</p>
                          )}
                        </div>
                      </div>
                    )
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
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          baseUrl={battleUrlSlug}
          text={shareText}
          hashtags={["BeatNexus", "ビートボックス", "Beatbox"]}
        />
      </div>

      {/* Vote Method Selection Modal */}
      {showVoteModal && (
        <VoteCommentModal
          isOpen={!!showVoteModal}
          onClose={() => { setShowVoteModal(null); setOpenVoteSupportOn(false); }}
          onVote={(comment, scoreSheet) => handleVoteWithComment(showVoteModal!, comment, scoreSheet)}
          onSimpleVote={(p, scoreSheet) => handleSimpleVote(p, scoreSheet)}
          player={showVoteModal || 'A'}
          isLoading={isVoting}
          battleId={battle.id}
          recipientUserId={showVoteModal === 'A' ? (battle.player1_user_id || battle.contestant_a_id || undefined) : (battle.player2_user_id || battle.contestant_b_id || undefined)}
          onRefreshVoteStatus={refreshVoteStatus}
          initialSupportOn={openVoteSupportOn}
        />
      )}

      {/* Support Tip Modal */}
      {supportModalOpen && supportTarget && (
        <SupportTipModal
          isOpen={supportModalOpen}
          onClose={closeSupportModal}
          battleId={battle.id}
          recipientUserId={supportTarget.userId}
          recipientName={supportTarget.name}
          onRequestVoteSupport={openVoteSupportFromSupportModal}
          onSuccess={async () => {
            try {
              // 決済成功後にコメントを再取得（webhookで反映された後に一覧へ）
              await fetchBattleComments(battle.id);
            } finally {
              closeSupportModal();
            }
          }}
        />
      )}

      {/* Score Breakdown Modal (participants only) */}
      {isUserParticipant && (
        <ScoreBreakdownModal
          isOpen={scoreModalOpen}
          onClose={() => setScoreModalOpen(false)}
          entries={scoreEntries}
          loading={scoreLoading}
          title={t('battleView.scoreBreakdownTitle', 'スコア内訳')}
        />
      )}
    </div>
  );
};