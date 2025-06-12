import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Users, Calendar, ShieldCheck, ShieldX, Swords, TrendingUp, TrendingDown, Minus, Play, AlertTriangle, ArchiveX } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArchivedBattle } from '../types';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Badge } from '../components/ui/Badge';

const BattleReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const [battle, setBattle] = useState<ArchivedBattle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        .eq('id', id)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-xl font-bold text-white mb-2">{t('battleView.loading')}</h1>
        </div>
      </div>
    );
  }

  if (error || !battle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">{t('battleReplay.notFound.title')}</h1>
          <p className="text-gray-400 mb-6">
            {error || t('battleReplay.notFound.description')}
          </p>
          <div className="space-x-4">
            <Button variant="outline" onClick={handleBack}>
              {t('battleReplay.backButton')}
            </Button>
            <Button variant="primary" onClick={() => navigate('/my-battles')}>
              {t('battleReplay.notFound.myBattlesButton')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isUserWinner = battle.winner_id === user?.id;
  const isDraw = battle.winner_id === null;
  const isParticipant = user && (battle.player1_user_id === user.id || battle.player2_user_id === user.id);
  const currentLocale = i18n.language === 'ja' ? ja : enUS;

  const getResultBadge = () => {
    if (!isParticipant) {
      return {
        icon: <Users className="h-4 w-4" />,
        text: t('battleReplay.result.battleResult'),
        className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
      };
    }

    if (isDraw) {
      return {
        icon: <Swords className="h-4 w-4" />,
        text: t('archivedBattleCard.result.draw'),
        className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      };
    }
    if (isUserWinner) {
      return {
        icon: <ShieldCheck className="h-4 w-4" />,
        text: t('archivedBattleCard.result.win'),
        className: 'bg-green-500/20 text-green-400 border border-green-500/30',
      };
    }
    return {
      icon: <ShieldX className="h-4 w-4" />,
      text: t('archivedBattleCard.result.loss'),
      className: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
  };

  const resultBadge = getResultBadge();

  // 動画が利用可能かどうかを判定（簡略化：常に利用可能）
  const isVideoAvailable = (videoUrl: string | null | undefined): boolean => {
    return Boolean(videoUrl);
  };

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

  const PlayerCard: React.FC<{
    username?: string;
    avatarUrl?: string;
    userId: string;
    isCurrentUser: boolean;
    isWinner?: boolean;
    votes: number;
    isPlayerA: boolean;
    ratingChange?: number | null;
    newRating?: number | null;
    videoStatus: { available: boolean; message?: string; description?: string; videoUrl?: string };
  }> = ({ username, avatarUrl, userId, isCurrentUser, isWinner = false, votes, isPlayerA, ratingChange, newRating, videoStatus }) => {
    const [videoError, setVideoError] = useState(false);

    const handleVideoError = () => {
      setVideoError(true);
    };
    return (
      <Card className={cn(
        "bg-gray-900 border p-6 relative",
        isWinner ? "border-green-500/50 bg-green-900/10" : "border-gray-800"
      )}>
        {/* 勝者の王冠 */}
        {isWinner && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="bg-yellow-500 rounded-full p-2">
              <Crown className="h-6 w-6 text-yellow-900" />
            </div>
          </div>
        )}

        {/* プレイヤー情報 */}
        <div className="flex items-center gap-4 mb-4">
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
            alt={username}
            className="w-12 h-12 rounded-lg border border-gray-700"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">
                {username || 'Unknown User'}
              </h3>
              {isCurrentUser && (
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 text-xs">
                  {t('archivedBattleCard.me')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">{votes} {t('battleReplay.playerInfo.totalVotes')}</span>
              </div>
              {ratingChange !== null && ratingChange !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 text-sm",
                  ratingChange > 0 ? "text-green-400" : ratingChange < 0 ? "text-red-400" : "text-gray-400"
                )}>
                  {ratingChange > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : ratingChange < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  <span>{ratingChange > 0 ? '+' : ''}{ratingChange}</span>
                  {newRating && <span className="text-gray-500">({newRating})</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 動画エリア */}
        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
          {videoStatus.available && videoStatus.videoUrl && !videoError ? (
            <video
              src={videoStatus.videoUrl}
              className="w-full h-full object-contain"
              controls
              preload="metadata"
              onError={handleVideoError}
            >
              <source src={videoStatus.videoUrl} type="video/webm" />
              <source src={videoStatus.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <ArchiveX className="h-16 w-16 mb-4" />
              <div className="text-center px-4">
                <p className="text-lg font-medium mb-2">
                  {videoError ? t('battleReplay.videoDeleted.title') : videoStatus.message}
                </p>
                <p className="text-sm">
                  {videoError ? t('battleReplay.videoDeleted.description') : videoStatus.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="text-gray-400 hover:text-white"
          >
            {t('battleReplay.backButton')}
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white">{t('battleReplay.title')}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-cyan-400 font-medium">
                {battle.battle_format.replace(/_/g, ' ')}
              </span>
              <div className={cn("px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5", resultBadge.className)}>
                {resultBadge.icon}
                {resultBadge.text}
              </div>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(battle.archived_at), 'yyyy/MM/dd HH:mm', { locale: currentLocale })}
              </span>
            </div>
          </div>
        </div>

        {/* バトル結果統計 */}
        <Card className="bg-gray-900 border border-gray-800 p-6 mb-8">
          <div className="text-center">
            <div className="text-6xl font-extrabold text-gray-400 mb-4">VS</div>
            <div className="flex justify-center items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">{battle.final_votes_a}</div>
                <div className="text-sm text-gray-400">{t('battleReplay.playerInfo.playerA')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg text-gray-400 flex items-center gap-1">
                  <Users className="h-5 w-5" />
                  {battle.final_votes_a + battle.final_votes_b} {t('battleReplay.playerInfo.totalVotes')}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{battle.final_votes_b}</div>
                <div className="text-sm text-gray-400">{t('battleReplay.playerInfo.playerB')}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* プレイヤーカード */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PlayerCard
            username={battle.contestant_a?.username}
            avatarUrl={battle.contestant_a?.avatar_url || undefined}
            userId={battle.player1_user_id}
            isCurrentUser={battle.player1_user_id === user?.id}
            isWinner={Boolean(battle.winner_id === battle.player1_user_id)}
            votes={battle.final_votes_a}
            isPlayerA={true}
            ratingChange={battle.player1_rating_change}
            newRating={battle.player1_final_rating}
            videoStatus={player1VideoStatus}
          />

          <PlayerCard
            username={battle.contestant_b?.username}
            avatarUrl={battle.contestant_b?.avatar_url || undefined}
            userId={battle.player2_user_id}
            isCurrentUser={battle.player2_user_id === user?.id}
            isWinner={Boolean(battle.winner_id === battle.player2_user_id)}
            votes={battle.final_votes_b}
            isPlayerA={false}
            ratingChange={battle.player2_rating_change}
            newRating={battle.player2_final_rating}
            videoStatus={player2VideoStatus}
          />
        </div>
      </div>
    </div>
  );
};

export default BattleReplayPage; 