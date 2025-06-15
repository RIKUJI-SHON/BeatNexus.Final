import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Users, Calendar, ShieldCheck, ShieldX, Swords, TrendingUp, TrendingDown, Minus, Play, AlertTriangle, ArchiveX, Trophy, Star } from 'lucide-react';
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
import { VSIcon } from '../components/ui/VSIcon';

// カラーパレット（BattleCardと同じ）
const colorPairs = [
  { a: '#3B82F6', b: '#F472B6', bg: 'from-blue-600/20 to-pink-600/20' },
  { a: '#10B981', b: '#8B5CF6', bg: 'from-emerald-600/20 to-purple-600/20' },
  { a: '#F59E0B', b: '#3B82F6', bg: 'from-amber-600/20 to-blue-600/20' },
  { a: '#6366F1', b: '#F97316', bg: 'from-indigo-600/20 to-orange-600/20' },
  { a: '#EC4899', b: '#10B981', bg: 'from-pink-600/20 to-emerald-600/20' },
];

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="text-center relative z-10">
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
    );
  }

  if (error || !battle) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="text-center max-w-md mx-auto p-6 relative z-10">
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
    );
  }

  const isUserWinner = battle.winner_id === user?.id;
  const isDraw = battle.winner_id === null;
  const isParticipant = user && (battle.player1_user_id === user.id || battle.player2_user_id === user.id);
  const currentLocale = i18n.language === 'ja' ? ja : enUS;
  
  // カラーテーマ選択
  const colorPairIndex = parseInt(battle.id.replace(/\D/g, '')) % colorPairs.length;
  const { a: colorA, b: colorB, bg: gradientBg } = colorPairs[colorPairIndex];
  
  const totalVotes = battle.final_votes_a + battle.final_votes_b;
  const percentageA = totalVotes > 0 ? (battle.final_votes_a / totalVotes) * 100 : 50;
  const percentageB = 100 - percentageA;
  const isAWinner = battle.winner_id === battle.player1_user_id;
  const isBWinner = battle.winner_id === battle.player2_user_id;

  const getResultBadge = () => {
    if (!isParticipant) {
      return {
        icon: <Trophy className="h-4 w-4" />,
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
        className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      };
    }
    return {
      icon: <ShieldX className="h-4 w-4" />,
      text: t('archivedBattleCard.result.loss'),
      className: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };
  };

  const resultBadge = getResultBadge();

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
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 max-w-7xl py-8 relative z-10">
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-3">
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

        {/* Battle Result Overview */}
        <Card className={`bg-gradient-to-br ${gradientBg} from-gray-900/90 to-gray-950/90 border border-gray-700/50 backdrop-blur-sm mb-8 relative overflow-hidden`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45"></div>
          </div>
          
          <div className="relative p-8">
            {/* VS Header with usernames */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="text-right flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 truncate">
                    {battle.contestant_a?.username || 'Player A'}
                  </h2>
                  <div 
                    className="text-sm font-medium tracking-wide uppercase opacity-80"
                    style={{ color: colorA }}
                  >
                    {t('battleReplay.playerInfo.playerA')}
                  </div>
                </div>
                
                <div className="text-6xl md:text-8xl font-black text-white px-4">
                  VS
                </div>
                
                <div className="text-left flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 truncate">
                    {battle.contestant_b?.username || 'Player B'}
                  </h2>
                  <div 
                    className="text-sm font-medium tracking-wide uppercase opacity-80"
                    style={{ color: colorB }}
                  >
                    {t('battleReplay.playerInfo.playerB')}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Confrontation Area */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 mb-8">
                              {/* Player A Video Preview */}
              <div className="relative">
                <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2" style={{ borderColor: colorA }}>
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
                  
                  {/* Player A Info - Top Left */}
                  <div className="absolute top-4 left-4 flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full p-1 flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${colorA}, ${colorA}80)` }}
                    >
                      <img
                        src={battle.contestant_a?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.player1_user_id}`}
                        alt={battle.contestant_a?.username}
                        className="w-full h-full rounded-full border border-gray-900 object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-sm truncate max-w-[120px] drop-shadow-lg">
                        {battle.contestant_a?.username || 'Player A'}
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="text-xl font-bold drop-shadow-lg"
                          style={{ color: colorA }}
                        >
                          {battle.final_votes_a}
                        </div>
                        <span className="text-xs text-gray-300 drop-shadow-lg">{t('battleCard.votes')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Winner Badge */}
                  {isAWinner && (
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
                  <VSIcon className="w-12 h-12 md:w-16 md:h-16" />
                  <div className="text-center bg-gray-800/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-gray-600/30">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Votes</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {totalVotes}
                    </div>
                  </div>
                </div>
              </div>

              {/* Player B Video Preview */}
              <div className="relative">
                <div className="aspect-video bg-black rounded-xl overflow-hidden relative shadow-2xl border-2" style={{ borderColor: colorB }}>
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
                  
                  {/* Player B Info - Top Left */}
                  <div className="absolute top-4 left-4 flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full p-1 flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${colorB}, ${colorB}80)` }}
                    >
                      <img
                        src={battle.contestant_b?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${battle.player2_user_id}`}
                        alt={battle.contestant_b?.username}
                        className="w-full h-full rounded-full border border-gray-900 object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-bold text-sm truncate max-w-[120px] drop-shadow-lg">
                        {battle.contestant_b?.username || 'Player B'}
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="text-xl font-bold drop-shadow-lg"
                          style={{ color: colorB }}
                        >
                          {battle.final_votes_b}
                        </div>
                        <span className="text-xs text-gray-300 drop-shadow-lg">{t('battleCard.votes')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Winner Badge */}
                  {isBWinner && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full p-2 shadow-lg animate-pulse">
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Vote Distribution Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between text-sm text-gray-400 mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorA }}
                  ></div>
                  <span className="font-medium">{battle.contestant_a?.username || 'Player A'}</span>
                  <span className="font-bold">{percentageA.toFixed(1)}%</span>
                </div>
                <span className="font-medium text-gray-300">Vote Distribution</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{percentageB.toFixed(1)}%</span>
                  <span className="font-medium">{battle.contestant_b?.username || 'Player B'}</span>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorB }}
                  ></div>
                </div>
              </div>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden shadow-inner border border-gray-700">
                <div className="h-full flex">
                  <div 
                    className="transition-all duration-1000 ease-out relative"
                    style={{ 
                      width: `${percentageA}%`, 
                      background: `linear-gradient(90deg, ${colorA}, ${colorA}80)` 
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
                      background: `linear-gradient(90deg, ${colorB}80, ${colorB})` 
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
        </Card>


      </div>
    </div>
  );
};

export default BattleReplayPage; 