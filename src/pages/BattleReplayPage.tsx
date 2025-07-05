import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Users, Calendar, ShieldCheck, ShieldX, Swords, TrendingUp, TrendingDown, Minus, Play, AlertTriangle, ArchiveX, Trophy, Star, MessageSquare, Clock, Volume2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArchivedBattle, BattleComment } from '../types';
import { supabase } from '../lib/supabase';
import { useBattleStore } from '../store/battleStore';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Badge } from '../components/ui/Badge';
import { VSIcon } from '../components/ui/VSIcon';
import { ShareBattleButton } from '../components/ui/ShareBattleButton';
import { trackBeatNexusEvents } from '../utils/analytics';
import { Helmet } from 'react-helmet-async';

// カラーパレット（BattleViewと統一）
const colorPairs = [
  { a: '#06b6d4', b: '#ec4899', bg: 'from-cyan-500/20 to-pink-500/20' },
  { a: '#10b981', b: '#f59e0b', bg: 'from-emerald-500/20 to-amber-500/20' },
  { a: '#8b5cf6', b: '#ef4444', bg: 'from-violet-500/20 to-red-500/20' },
  { a: '#06b6d4', b: '#8b5cf6', bg: 'from-cyan-500/20 to-violet-500/20' },
  { a: '#f59e0b', b: '#ec4899', bg: 'from-amber-500/20 to-pink-500/20' }
];

const BattleReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { battleComments, commentsLoading, fetchBattleComments } = useBattleStore();
  const [battle, setBattle] = useState<ArchivedBattle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRatings, setPlayerRatings] = useState<{
    playerA: { rating: number; loading: boolean };
    playerB: { rating: number; loading: boolean };
  }>({
    playerA: { rating: 1200, loading: true },
    playerB: { rating: 1200, loading: true },
  });

  const ogImageUrl = 'https://beat-nexus-heatbeat-test.vercel.app/images/OGP.png';
  const pageTitle = battle ? 
    `${battle.contestant_a?.username || 'Player 1'} vs ${battle.contestant_b?.username || 'Player 2'} - Battle Replay | BeatNexus` : 
    'Battle Replay | BeatNexus';
  const description = battle ?
    `Watch the epic beatbox battle replay between ${battle.contestant_a?.username || 'Player 1'} and ${battle.contestant_b?.username || 'Player 2'}! Final result: ${battle.final_votes_a} vs ${battle.final_votes_b} votes.` :
    'Watch epic beatbox battle replays on BeatNexus.';

  useEffect(() => {
    if (!id) {
      setError(t('battleReplay.notFound.description'));
      setLoading(false);
      return;
    }

    fetchBattleDetails();
  }, [id]);

  const fetchBattleDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // アーカイブされたバトルを取得
      const { data: battleData, error: battleError } = await supabase
        .from('archived_battles')
        .select(`
          *,
          contestant_a:player1_user_id(username, avatar_url),
          contestant_b:player2_user_id(username, avatar_url)
        `)
        .eq('original_battle_id', id)
        .single();

      if (battleError) {
        console.error('Error fetching battle:', battleError);
        setError(t('battleReplay.notFound.description'));
        return;
      }

      if (!battleData) {
        setError(t('battleReplay.notFound.description'));
        return;
      }

      setBattle(battleData);

      // Track archived battle view event
      trackBeatNexusEvents.archivedBattleView(battleData.original_battle_id);

      // コメントを取得
      if (battleData?.id) {
        fetchBattleComments(battleData.id);
      }

    } catch (err) {
      console.error('Error in fetchBattleDetails:', err);
      setError(t('battleReplay.notFound.description'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const loadPlayerRatings = async () => {
    try {
      const { data: playerAData } = await supabase
        .from('profiles')
        .select('rating')
        .eq('id', battle?.player1_user_id || '')
        .single();

      const { data: playerBData } = await supabase
        .from('profiles')
        .select('rating')
        .eq('id', battle?.player2_user_id || '')
        .single();

      setPlayerRatings({
        playerA: { rating: playerAData?.rating || 1200, loading: false },
        playerB: { rating: playerBData?.rating || 1200, loading: false },
      });
    } catch (err) {
      console.warn('Failed to load player ratings', err);
      setPlayerRatings({
        playerA: { rating: 1200, loading: false },
        playerB: { rating: 1200, loading: false },
      });
    }
  };

  useEffect(() => {
    if (battle) {
      loadPlayerRatings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle?.id]);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>{pageTitle}</title>
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={description} />
          <meta property="og:image" content={ogImageUrl} />
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:title" content={pageTitle} />
          <meta property="twitter:description" content={description} />
          <meta property="twitter:image" content={ogImageUrl} />
        </Helmet>
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
          
          <div className="min-h-screen flex items-center justify-center relative z-10">
            <div className="text-center">
              <div className="relative mb-8">
                <div className="animate-spin w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
                <div className="absolute inset-0 animate-ping w-16 h-16 border-4 border-cyan-400/30 rounded-full mx-auto"></div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
                {t('battleView.loading')}
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full mx-auto animate-pulse"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !battle) {
    return (
      <>
        <Helmet>
          <title>{pageTitle}</title>
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={description} />
          <meta property="og:image" content={ogImageUrl} />
          <meta property="twitter:card" content="summary_large_image" />
          <meta property="twitter:title" content={pageTitle} />
          <meta property="twitter:description" content={description} />
          <meta property="twitter:image" content={ogImageUrl} />
        </Helmet>
        <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 relative overflow-hidden">
          {/* Epic Background Effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
          </div>
          
          <div className="min-h-screen flex items-center justify-center relative z-10">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="relative mb-6">
                <AlertTriangle className="h-20 w-20 text-red-400 mx-auto" />
                <div className="absolute inset-0 h-20 w-20 mx-auto animate-ping">
                  <AlertTriangle className="h-20 w-20 text-red-400/30" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent mb-4">
                {t('battleReplay.notFound.title')}
              </h1>
              <p className="text-gray-400 mb-8 leading-relaxed">
                {error || t('battleReplay.notFound.description')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  className="border-gray-600 hover:border-gray-500 hover:bg-gray-800/50"
                >
                  {t('battleReplay.backButton')}
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/my-battles')}
                  className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
                >
                  {t('battleReplay.notFound.myBattlesButton')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isUserWinner = battle.winner_id === user?.id;
  const isDraw = battle.winner_id === null;
  const isParticipant = user && (battle.player1_user_id === user.id || battle.player2_user_id === user.id);
  const currentLocale = i18n.language === 'ja' ? ja : enUS;
  
  // カラーテーマ選択（BattleViewと統一）
  const colorPairIndex = parseInt(battle.id.replace(/\D/g, '')) % colorPairs.length;
  const { a: playerColorA, b: playerColorB, bg: gradientBg } = colorPairs[colorPairIndex];
  
  const totalVotes = battle.final_votes_a + battle.final_votes_b;
  const percentageA = totalVotes > 0 ? (battle.final_votes_a / totalVotes) * 100 : 50;
  const percentageB = 100 - percentageA;
  const isAWinner = battle.winner_id === battle.player1_user_id;
  const isBWinner = battle.winner_id === battle.player2_user_id;
  const isALeading = battle.final_votes_a > battle.final_votes_b;
  const isBLeading = battle.final_votes_b > battle.final_votes_a;

  const getResultBadge = () => {
    // 引き分けの場合
    if (isDraw) {
      return {
        icon: <Swords className="h-4 w-4" />,
        text: t('archivedBattleCard.result.draw'), // 例: "引き分け"
        className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      };
    }

    // 勝者のユーザー名を取得
    const winnerName = battle.winner_id === battle.player1_user_id
      ? (battle.contestant_a?.username || t('archivedBattleCard.playerA'))
      : (battle.contestant_b?.username || t('archivedBattleCard.playerB'));

    // 自分が勝者かどうかでバッジ色を変える（勝者:緑、敗者:赤、観戦者:グレー）
    if (isUserWinner) {
      return {
        icon: <ShieldCheck className="h-4 w-4" />,
        text: `${winnerName}の${t('archivedBattleCard.result.win')}`, // 例: "○○の勝利"
        className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      };
    }

    // 参加していない or 敗者
    return {
      icon: isParticipant ? <ShieldX className="h-4 w-4" /> : <Trophy className="h-4 w-4" />,
      text: `${winnerName}の${t('archivedBattleCard.result.win')}`,
      className: isParticipant
        ? 'bg-red-500/20 text-red-400 border border-red-500/30' // 敗者
        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30', // 観戦者
    };
  };

  const resultBadge = getResultBadge();

  const getDefaultAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  // 動画が利用可能かどうかを判定
  const getVideoStatus = (videoUrl: string | null | undefined) => {
    if (!videoUrl) {
      return {
        available: false,
        message: t('battleReplay.videoNotAvailable.title'),
        description: t('battleReplay.videoNotAvailable.participantMessage')
      };
    }

    return {
      available: true,
      videoUrl: videoUrl
    };
  };

  const player1VideoStatus = getVideoStatus(battle.player1_video_url);
  const player2VideoStatus = getVideoStatus(battle.player2_video_url);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:image" content={ogImageUrl} />
      </Helmet>
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
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-300"
            >
              {t('battleReplay.backButton')}
            </Button>
            
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 mb-3 drop-shadow-lg">
                {t('battleReplay.title')}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className={cn("px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 backdrop-blur-sm", resultBadge.className)}>
                  {resultBadge.icon}
                  {resultBadge.text}
                </div>
                
                <span className="text-gray-400 text-sm flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(battle.archived_at), 'yyyy/MM/dd HH:mm', { locale: currentLocale })}
                </span>
              </div>
            </div>
          </div>

          {/* Battle Title & Info Header */}
          <div className="text-center mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent h-px top-1/2"></div>
            
            {/* Main Battle Title with Player Names (Responsive) */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 md:gap-4 overflow-hidden">
                {/* Player A Username */}
                <span
                  className="truncate max-w-[40vw] text-2xl sm:text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 text-right"
                  title={battle.contestant_a?.username || 'Player A'}
                >
                {battle.contestant_a?.username || 'Player A'}
                </span>

                {/* VS Label (fixed width, no shrink) */}
                <span
                  className="flex-shrink-0 mx-1 sm:mx-2 text-gray-400 text-2xl sm:text-3xl md:text-5xl font-black"
                >
                  VS
                </span>

                {/* Player B Username */}
                <span
                  className="truncate max-w-[40vw] text-2xl sm:text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400"
                  title={battle.contestant_b?.username || 'Player B'}
                >
                {battle.contestant_b?.username || 'Player B'}
                </span>
              </div>
            </div>
            
            {/* Battle Stats */}
            <div className="flex items-center justify-center gap-6 text-gray-300">
              <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2 rounded-full backdrop-blur-sm">
                <Users className="h-4 w-4 text-green-400" />
                <span className="font-medium">{battle.final_votes_a + battle.final_votes_b} votes</span>
              </div>
            </div>
            {/* Share Button */}
            <div className="mt-4 flex justify-center">
              <ShareBattleButton
                battleId={battle.original_battle_id}
                player1Name={battle.contestant_a?.username || 'Player 1'}
                player2Name={battle.contestant_b?.username || 'Player 2'}
                player1UserId={battle.player1_user_id}
                player2UserId={battle.player2_user_id}
              />
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
                    {/* Player A Name - Mobile */}
                    <div className="flex items-center gap-3 mb-4 lg:hidden">
                      <div
                        className="w-10 h-10 rounded-full p-1 flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${playerColorA}, ${playerColorA}80)` }}
                      >
                        <img
                          src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl(battle.player1_user_id)}
                          alt={battle.contestant_a?.username}
                          className="w-full h-full rounded-full border border-gray-900 object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="text-white font-bold text-xl truncate max-w-[70vw]" title={battle.contestant_a?.username || 'Player A'}>
                          {battle.contestant_a?.username || 'Player A'}
                        </div>
                        <div className="text-sm text-gray-300">
                          {playerRatings.playerA.loading ? '...' : playerRatings.playerA.rating}
                        </div>
                      </div>
                    </div>

                    {/* Player A Name - Desktop Layout */}
                    <div className="hidden lg:flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-full p-1 flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${playerColorA}, ${playerColorA}80)` }}
                      >
                        <img
                          src={battle.contestant_a?.avatar_url || getDefaultAvatarUrl(battle.player1_user_id)}
                          alt={battle.contestant_a?.username}
                          className="w-full h-full rounded-full border border-gray-900 object-cover"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div
                          className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px]"
                          title={battle.contestant_a?.username || 'Player A'}
                        >
                          {battle.contestant_a?.username || 'Player A'}
                        </div>
                        <div className="text-sm text-gray-300">
                          {playerRatings.playerA.loading ? '...' : playerRatings.playerA.rating}
                        </div>
                      </div>
                    </div>

                    {/* Player A Video Preview */}
                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2" style={{ borderColor: playerColorA }}>
                      {player1VideoStatus.available && player1VideoStatus.videoUrl ? (
                        <video
                          src={player1VideoStatus.videoUrl}
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
                          <source src={player1VideoStatus.videoUrl} type="video/webm" />
                          <source src={player1VideoStatus.videoUrl} type="video/mp4" />
                          {t('battleReplay.videoNotSupported')}
                        </video>
                      ) : null}
                      
                      {!player1VideoStatus.available || !player1VideoStatus.videoUrl ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900">
                          <ArchiveX className="h-16 w-16 mb-3 opacity-50" />
                          <p className="text-sm text-center px-4">
                            {t('battleReplay.videoNotAvailable.title')}
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
                    </div>
                  </div>

                  {/* VS Separator */}
                  <div className="flex items-center justify-center lg:px-6">
                    <div className="flex flex-col items-center gap-4">
                      <VSIcon className="w-12 h-12 md:w-16 md:h-16" />
                      <div className="text-center bg-gray-800/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-gray-600/30">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-medium">Final Votes</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {totalVotes}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player B Section */}
                  <div className="relative">
                    {/* Player B Name - Desktop Layout (Above Video) */}
                    <div className="hidden lg:flex items-center gap-3 mb-4 lg:justify-end">
                      <div className="flex flex-col lg:items-end">
                        <div
                          className="text-white font-bold text-xl truncate max-w-[140px] md:max-w-[180px]"
                          title={battle.contestant_b?.username || 'Player B'}
                        >
                          {battle.contestant_b?.username || 'Player B'}
                        </div>
                        <div className="text-sm text-gray-300 lg:text-right">
                          {playerRatings.playerB.loading ? '...' : playerRatings.playerB.rating}
                        </div>
                      </div>
                      <div
                        className="w-10 h-10 rounded-full p-1 flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${playerColorB}, ${playerColorB}80)` }}
                      >
                        <img
                          src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl(battle.player2_user_id)}
                          alt={battle.contestant_b?.username}
                          className="w-full h-full rounded-full border border-gray-900 object-cover"
                        />
                      </div>
                    </div>

                    {/* Player B Video Preview */}
                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2" style={{ borderColor: playerColorB }}>
                      {player2VideoStatus.available && player2VideoStatus.videoUrl ? (
                        <video
                          src={player2VideoStatus.videoUrl}
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
                          <source src={player2VideoStatus.videoUrl} type="video/webm" />
                          <source src={player2VideoStatus.videoUrl} type="video/mp4" />
                          {t('battleReplay.videoNotSupported')}
                        </video>
                      ) : null}
                      
                      {!player2VideoStatus.available || !player2VideoStatus.videoUrl ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-800 to-gray-900">
                          <ArchiveX className="h-16 w-16 mb-3 opacity-50" />
                          <p className="text-sm text-center px-4">
                            {t('battleReplay.videoNotAvailable.title')}
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
                    </div>
                      
                    {/* Player B Name - Mobile (Below Video) */}
                    <div className="flex items-center gap-3 mt-4 lg:hidden justify-end">
                      <div className="flex flex-col items-end">
                        <div className="text-white font-bold text-xl truncate max-w-[70vw]" title={battle.contestant_b?.username || 'Player B'}>
                          {battle.contestant_b?.username || 'Player B'}
                        </div>
                        <div className="text-sm text-gray-300">
                          {playerRatings.playerB.loading ? '...' : playerRatings.playerB.rating}
                        </div>
                      </div>
                          <div 
                            className="w-10 h-10 rounded-full p-1 flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${playerColorB}, ${playerColorB}80)` }}
                          >
                            <img
                              src={battle.contestant_b?.avatar_url || getDefaultAvatarUrl(battle.player2_user_id)}
                              alt={battle.contestant_b?.username}
                              className="w-full h-full rounded-full border border-gray-900 object-cover"
                            />
                          </div>
                        </div>

                        {isBWinner && (
                          <div className="absolute top-4 right-4">
                            <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full p-2 shadow-lg animate-pulse">
                              <Crown className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        )}
                  </div>
                </div>
                
                {/* Vote Distribution Bar */}
                <div className="max-w-2xl mx-auto">
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
                            {battle.final_votes_a}
                          </div>
                        )}
                      </div>
                      <div 
                        className="transition-all duration-1000 ease-out relative"
                        style={{ 
                          width: `${percentageB}%`, 
                          background: `linear-gradient(90deg, ${playerColorB}80, ${playerColorB})` 
                        }}
                      >
                        {percentageB > 15 && (
                          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-xs font-bold">
                            {battle.final_votes_b}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Community Reactions */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {t('battleCard.commentsModal.title')}
            </h3>
            <div className="text-sm text-gray-400">
              ({battleComments[battle.id]?.length || 0})
            </div>
          </div>

          {/* Comments List */}
          {commentsLoading[battle.id] ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-400">{t('battleCard.commentsModal.loading')}</span>
            </div>
          ) : !battleComments[battle.id] || battleComments[battle.id].length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">{t('battleCard.commentsModal.noComments')}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {battleComments[battle.id].map((comment: BattleComment) => (
                <div key={comment.id} className="flex items-start gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700/50">
                  <div className="relative">
                    <img
                      src={comment.avatar_url || getDefaultAvatarUrl(comment.user_id)}
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
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        comment.vote === 'A' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'
                      }`}>
                        Player {comment.vote}に投票
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.created_at), 'PPp', { locale: currentLocale })}
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
          )}
        </div>
      </div>
    </>
  );
};

export default BattleReplayPage; 