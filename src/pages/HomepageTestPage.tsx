import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, LineChart as ChartLine, ArrowRight, Play, Star, Video, Zap, Crown, Trophy, Target, Upload, Vote, MessageCircle, BarChart3, Shield } from 'lucide-react';
// Wordmark: moved to public images for direct reference
const beatnexusWordmark = '/images/BEATNEXUS-WORDMARK.png';
import step1Upload from '../assets/images/steps/step1-upload.png';
import step2Matching from '../assets/images/steps/step2-matching.png';
import step3Voting from '../assets/images/steps/step3-voting.png';
import step4Results from '../assets/images/steps/step4-results.png';
import { Card } from '../components/ui/Card';
import { TopThreePodium } from '../components/ui/TopThreePodium';
import { AuthModal } from '../components/auth/AuthModal';
import { useCanonicalUrl, useDynamicMeta } from '../hooks/useSEO';
import { supabase } from '../lib/supabase';
import { Season, HistoricalSeasonRanking, Battle } from '../types';
import { useAuthStore } from '../store/authStore';
import { useBattleStore } from '../store/battleStore';
import { BattleCard } from '../components/battle/BattleCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '../components/ui/carousel';
import { getBattleUrlFromBattle } from '../utils/battleUrl';
import BattlesPage from './BattlesPage';
import { useTranslation } from 'react-i18next';
import { AdSlot } from '../components/ads/AdSlot';

interface VoterRankingEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  votes: number;
  season_id: string;
}

const HomepageTestPage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { archivedBattles, fetchArchivedBattles, loading: archivedLoading } = useBattleStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'resetPassword' | 'setNewPassword'>('signup');
  const [latestEndedSeason, setLatestEndedSeason] = useState<Season | null>(null);
  const [topThreeRankings, setTopThreeRankings] = useState<HistoricalSeasonRanking[]>([]);
  const [topThreeVoterRankings, setTopThreeVoterRankings] = useState<VoterRankingEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [statsData, setStatsData] = useState({
    totalBattles: 0,
    totalVotes: 0,
    totalUsers: 0,
    totalSubmissions: 0,
    loading: true
  });
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  // SEO設定
  useCanonicalUrl({
    // canonicalUrlを指定しない場合、自動的に公式ドメインが使用される
    excludeQueryParams: true
  });

  useDynamicMeta({
    title: 'BeatNexus - ビートボクサーのための競技プラットフォーム | オンラインバトル・ランキング',
    description: 'ビートボクサーのための競技プラットフォーム。動画投稿で気軽にバトル、コミュニティ投票で勝敗決定。Eloレーティング、シーズン制ランキング、賞金トーナメントまで。全てのビートボクサーに次のステップを提供します。',
    keywords: 'ビートボックス,バトル,オンライン,競技,ランキング,コミュニティ,投票,動画,トーナメント,beatbox,battle',
    author: 'BeatNexus',
    robots: 'index,follow',
    ogTitle: 'BeatNexus - ビートボクサーのための競技プラットフォーム',
    ogDescription: 'ビートボクサーのための競技プラットフォーム。動画投稿で気軽にバトル、コミュニティ投票で勝敗決定。全てのビートボクサーに次のステップを。',
    ogImage: 'https://beatnexus.app/images/og-image.png',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: 'BeatNexus - ビートボクサーのための競技プラットフォーム',
    twitterDescription: 'ビートボクサーのための競技プラットフォーム。動画投稿で気軽にバトル、コミュニティ投票で勝敗決定。',
    twitterImage: 'https://beatnexus.vercel.app/images/og-image.png'
  });

  // 最新の終了したシーズンのTOP3を取得
  useEffect(() => {
    const fetchLatestSeasonRankings = async () => {
      setRankingsLoading(true);
      try {
        // 全シーズンを取得
        const { data: seasons, error: seasonsError } = await supabase.rpc('get_all_seasons');
        if (seasonsError) throw seasonsError;

        // 終了したシーズンを日付順でソートし、最新のものを取得
        const endedSeasons = seasons?.filter((season: Season) => season.status === 'ended') || [];
        if (endedSeasons.length === 0) return;

        const latestEnded = endedSeasons.sort((a: Season, b: Season) => 
          new Date(b.end_at).getTime() - new Date(a.end_at).getTime()
        )[0];

        setLatestEndedSeason(latestEnded);

        // そのシーズンのランキングTOP3を取得
        const { data: rankings, error: rankingsError } = await supabase.rpc('get_season_rankings_by_id', {
          p_season_id: latestEnded.id
        });

        if (rankingsError) throw rankingsError;

        const top3 = (rankings || []).slice(0, 3).map((entry: {
          user_id: string;
          rank: number;
          points: number;
          username: string;
          avatar_url?: string;
        }) => ({
          id: `${entry.user_id}-${latestEnded.id}`,
          season_id: latestEnded.id,
          user_id: entry.user_id,
          rank: entry.rank,
          points: entry.points,
          username: entry.username,
          avatar_url: entry.avatar_url,
          created_at: new Date().toISOString()
        }));

        setTopThreeRankings(top3);

        // そのシーズンの投票者ランキングTOP3を取得
        const { data: voterRankings, error: voterRankingsError } = await supabase.rpc('get_season_voter_rankings_by_id', {
          p_season_id: latestEnded.id
        });

        if (voterRankingsError) throw voterRankingsError;

        const top3Voters = (voterRankings || []).slice(0, 3).map((entry: {
          rank: number;
          user_id: string;
          username: string;
          avatar_url?: string;
          votes: number;
          season_id: string;
        }) => ({
          rank: entry.rank,
          user_id: entry.user_id,
          username: entry.username,
          avatar_url: entry.avatar_url,
          votes: entry.votes,
          season_id: entry.season_id
        }));

        setTopThreeVoterRankings(top3Voters);
      } catch (error) {
        console.error('Failed to fetch latest season rankings:', error);
      } finally {
        setRankingsLoading(false);
      }
    };

    fetchLatestSeasonRankings();
  }, []);

  // 統計データを取得（β Season 0 実績表示用：累計の概数）
  useEffect(() => {
    const fetchStatsData = async () => {
      try {
        // 総バトル数を取得（アーカイブされたバトル）
        const { count: battleCount, error: battlesError } = await supabase
          .from('archived_battles')
          .select('*', { count: 'exact', head: true });

        if (battlesError) throw battlesError;

        // 総投票数を取得（アクティブバトルの投票 + アーカイブされたバトルの投票）
        const [
          { count: activeBattleVotes, error: activeVotesError },
          { count: archivedBattleVotes, error: archivedVotesError }
        ] = await Promise.all([
          supabase.from('battle_votes').select('*', { count: 'exact', head: true }),
          supabase.from('archived_battle_votes').select('*', { count: 'exact', head: true })
        ]);

        if (activeVotesError) throw activeVotesError;
        if (archivedVotesError) throw archivedVotesError;

        const totalVotes = (activeBattleVotes || 0) + (archivedBattleVotes || 0);

        // 総ユーザー数（profilesの有効ユーザー）
        const { count: profilesCount, error: profilesError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .neq('is_deleted', true);
        if (profilesError) throw profilesError;

        // 総投稿数（submissions）
        const { count: submissionsCount, error: submissionsError } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true });
        if (submissionsError) throw submissionsError;

        setStatsData({
          totalBattles: battleCount || 0,
          totalVotes: totalVotes,
          totalUsers: profilesCount || 0,
          totalSubmissions: submissionsCount || 0,
          loading: false
        });
      } catch (error) {
        console.error('Failed to fetch stats data:', error);
        setStatsData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStatsData();
  }, []);

  // アーカイブ上位（投票数順）取得（Hero内カルーセル用）
  useEffect(() => {
    // 既にロード済みでも軽いので呼び出し許容
    fetchArchivedBattles().catch((e) => console.warn('fetchArchivedBattles failed:', e));
  }, [fetchArchivedBattles]);

  const topArchivedByVotes = React.useMemo(() => {
    if (!archivedBattles || archivedBattles.length === 0) return [] as typeof archivedBattles;
    return [...archivedBattles]
      .sort((a, b) => (b.final_votes_a + b.final_votes_b) - (a.final_votes_a + a.final_votes_b))
      .slice(0, 10);
  }, [archivedBattles]);

  // アクティブカードデザインで表示するための変換（クリックはリプレイへ）
  const topArchivedAsActiveBattles = React.useMemo(() => {
    return topArchivedByVotes.map<Battle>((a) => ({
      id: a.original_battle_id,
      created_at: a.created_at,
      end_voting_at: a.archived_at, // 過去日時 → VOTING ENDED 表示
      player1_submission_id: a.player1_submission_id,
      player2_submission_id: a.player2_submission_id,
      player1_user_id: a.player1_user_id,
      player2_user_id: a.player2_user_id,
      contestant_a_id: a.player1_user_id,
      contestant_b_id: a.player2_user_id,
      status: 'COMPLETED',
      votes_a: a.final_votes_a,
      votes_b: a.final_votes_b,
      battle_format: a.battle_format,
      updated_at: a.updated_at,
      contestant_a: a.contestant_a,
      contestant_b: a.contestant_b,
      is_archived: false, // デザインはアクティブ表示にする
      winner_id: a.winner_id,
      player1_rating_change: a.player1_rating_change,
      player2_rating_change: a.player2_rating_change,
      player1_final_rating: a.player1_final_rating,
      player2_final_rating: a.player2_final_rating,
      video_url_a: a.player1_video_url ?? undefined,
      video_url_b: a.player2_video_url ?? undefined,
    }));
  }, [topArchivedByVotes]);

  // カルーセル自動スクロール（ずっと横に流れる & ループ）
  useEffect(() => {
    if (!carouselApi) return;
    let raf: number | null = null;
    let lastTime = 0;
    const intervalMs = 2800; // スライド間隔

  const tick = (ts: number) => {
      if (!lastTime) lastTime = ts;
      const diff = ts - lastTime;
      if (diff >= intervalMs) {
    // ループ有効のため末尾でも自動で先頭に戻る
    carouselApi.scrollNext();
        lastTime = ts;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [carouselApi]);

  const handleJoinNow = (e: React.MouseEvent) => {
    e.preventDefault();
    // 認証モーダルを開く（サインアップモード）
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  const handleWatchBattles = (e: React.MouseEvent) => {
    e.preventDefault();
    // バトルページに直接遷移
    navigate('/battles');
  };

  // ログインしているユーザーにはBattlesPageを表示
  if (user) {
    return <BattlesPage />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* BeatNexus ワードマークセクション */}
      <section className="relative py-20 bg-black/90">
        {/* 背景画像: ぼかし付き */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="/images/backgroud.png"
            alt="background"
            className="w-full h-full object-cover scale-105 opacity-40"
            loading="lazy"
            decoding="async"
          />
          {/* カラーブレンドレイヤー */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black/60 to-cyan-900/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <div className="animate-fade-in group mb-12">
            <img 
              src={beatnexusWordmark} 
              alt="BeatNexus" 
              className="relative mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto drop-shadow-2xl group-hover:scale-105 transition-all duration-500 filter group-hover:brightness-110"
            />
          </div>

          {/* 一行タグライン: ロゴ直下（重複削除済） */}
          <div className="mb-8 animate-fade-in-delay-1">
            <p className="text-lg md:text-xl font-medium text-gray-300 leading-snug">
              {t('home.landingPage.tagline')}
            </p>
          </div>

          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-delay-2">
            <button
              onClick={handleJoinNow}
              className="relative inline-block p-px font-semibold leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 group"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500 p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
              <span className="relative z-10 block px-8 py-4 rounded-xl bg-gray-950">
                <div className="relative z-10 flex items-center space-x-2">
                  <span className="text-lg">{t('home.landingPage.cta.joinBeta')}</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </span>
            </button>
            
            <button
              onClick={handleWatchBattles}
              className="flex items-center space-x-2 px-8 py-4 border border-gray-600 rounded-xl hover:border-gray-400 transition-colors duration-200"
            >
              <Play className="w-5 h-5" />
              <span className="text-lg">{t('home.landingPage.cta.watchBattles')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* home.wordmark.section.after.banner - ワードマークセクション後のバナー広告 */}
      <section className="py-8 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-4 flex justify-center">
          <AdSlot
            placementKey="home.wordmark.section.after.banner"
            variant="banner"
            className="w-full max-w-4xl"
          />
        </div>
      </section>

      

      {/* 1. ファーストビュー：瞬時に訪問者の心を掴む */}
      <section className="relative py-20 flex items-center justify-center overflow-hidden">
        {/* 背景画像削除: グラデーションのみ */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20"></div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          {/* メインキャッチコピー */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-16 animate-fade-in-delay-1">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {t('home.landingPage.hero.title.forAll')}
            </span>
            <br />
            <span className="text-white">
              {t('home.landingPage.hero.title.nextStep')}
            </span>
          </h1>

          {/* 説明文 */}
          <p className="text-lg md:text-xl text-gray-400 animate-fade-in-delay-3">
            {t('home.landingPage.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Hero直下：アーカイブバトル上位カルーセル（投票数順） */}
      <section className="py-10 bg-gradient-to-b from-black/0 to-black/0">
        <div className="w-full max-w-none px-2 sm:px-6 lg:px-10">
          <div className="mb-4 text-sm text-gray-400 sr-only">Archived Top Battles</div>
          {archivedLoading && topArchivedAsActiveBattles.length === 0 ? (
            <div className="text-center text-gray-400">Loading…</div>
          ) : topArchivedAsActiveBattles.length > 0 ? (
            <div className="relative">
              <Carousel className="w-full" opts={{ align: 'start', loop: true, dragFree: true }} setApi={setCarouselApi}>
                <CarouselContent>
                  {topArchivedAsActiveBattles.map((battle) => (
                    <CarouselItem key={battle.id} className="pl-8 basis-[95%] sm:basis-[70%] md:basis-[60%] lg:basis-1/2 xl:basis-[45%] 2xl:basis-[40%]">
                      <div className="relative p-2 sm:p-3 md:p-4">
                        {/* クリックオーバーレイ（常にリプレイに遷移） */}
                        <div
                          className="absolute inset-0 z-10 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            const slug = getBattleUrlFromBattle(battle);
                            navigate(`/battle-replay/${slug}`);
                          }}
                        />
                        <div className="relative z-0 origin-center mx-auto py-1">
                          <BattleCard battle={battle} />
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="-left-2 sm:-left-4 top-1/2 -translate-y-1/2 bg-gray-800/70 border-gray-700 hover:bg-gray-700">
                  <span className="sr-only">Previous</span>
                </CarouselPrevious>
                <CarouselNext className="-right-2 sm:-right-4 top-1/2 -translate-y-1/2 bg-gray-800/70 border-gray-700 hover:bg-gray-700">
                  <span className="sr-only">Next</span>
                </CarouselNext>
              </Carousel>
            </div>
          ) : (
            <div className="text-center text-gray-500">No archived battles yet.</div>
          )}
        </div>
      </section>

      {/* Season Announcement & Beta Stats (moved below Hero) */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 mb-4">
              {t('home.landingPage.announcement.badge')}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{t('home.landingPage.announcement.title.season1')}</span> {t('home.landingPage.announcement.title.rest')}
            </h2>
            <p className="text-gray-300">{t('home.landingPage.announcement.subtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card className="bg-gray-800/60 border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-400/20 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/Profile.png"
                    alt={t('home.landingPage.announcement.stats.totalUsers')}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t('home.landingPage.announcement.stats.totalUsers')}</p>
                  <p className="text-2xl font-bold text-white">{statsData.loading ? '—' : statsData.totalUsers.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-gray-800/60 border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-400/20 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/VS.png"
                    alt={t('home.landingPage.announcement.stats.totalSubmissions')}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t('home.landingPage.announcement.stats.totalSubmissions')}</p>
                  <p className="text-2xl font-bold text-white">{statsData.loading ? '—' : statsData.totalSubmissions.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-gray-800/60 border-gray-700 p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-400/20 flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/onboarding/judge.png"
                    alt={t('home.landingPage.announcement.stats.totalVotes')}
                    className="w-8 h-8 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t('home.landingPage.announcement.stats.totalVotes')}</p>
                  <p className="text-2xl font-bold text-white">{statsData.loading ? '—' : statsData.totalVotes.toLocaleString()}</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={handleJoinNow}
              className="relative inline-block p-px font-semibold leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 group"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500 p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
              <span className="relative z-10 block px-8 py-4 rounded-xl bg-gray-950">
                <div className="relative z-10 flex items-center space-x-2">
                  <span className="text-lg">{t('home.landingPage.announcement.cta.joinNow')}</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. 課題提起：訪問者の「悩み」に共感する */}
      <section className="py-20 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('home.landingPage.challenges.title')}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                key: 'motivation',
                icon: Target, 
                title: t('home.landingPage.challenges.motivation.title'), 
                description: t('home.landingPage.challenges.motivation.description')
              },
              { 
                key: 'skillAssessment',
                icon: BarChart3, 
                title: t('home.landingPage.challenges.skillAssessment.title'), 
                description: t('home.landingPage.challenges.skillAssessment.description')
              },
              { 
                key: 'casualChallenge',
                icon: Shield, 
                title: t('home.landingPage.challenges.casualChallenge.title'), 
                description: t('home.landingPage.challenges.casualChallenge.description')
              },
              { 
                key: 'community',
                icon: Users, 
                title: t('home.landingPage.challenges.community.title'), 
                description: t('home.landingPage.challenges.community.description')
              }
            ].map((item) => (
              <Card key={item.key} className="bg-gray-800/50 border-gray-700 p-6 text-center hover:bg-gray-800/70 transition-colors duration-200">
                <item.icon className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                <h3 className="text-lg font-semibold mb-3 text-white">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 解決策と提供価値：BeatNexusが「未来」を見せる */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                BeatNexus
              </span>
              {t('home.landingPage.solution.title')}
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-12">
            {[
              {
                key: 'visualizeGrowth',
                icon: ChartLine,
                title: t('home.landingPage.solution.visualizeGrowth.title'),
                description: t('home.landingPage.solution.visualizeGrowth.description'),
                gradient: "from-green-400 to-blue-500"
              },
              {
                key: 'gradualChallenge',
                icon: Trophy,
                title: t('home.landingPage.solution.gradualChallenge.title'),
                description: t('home.landingPage.solution.gradualChallenge.description'),
                gradient: "from-yellow-400 to-orange-500"
              },
              {
                key: 'communityConnection',
                icon: MessageCircle,
                title: t('home.landingPage.solution.communityConnection.title'),
                description: t('home.landingPage.solution.communityConnection.description'),
                gradient: "from-pink-400 to-purple-500"
              }
            ].map((item) => (
              <div key={item.key} className="text-center">
                <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r ${item.gradient} flex items-center justify-center`}>
                  <item.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-white">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 機能紹介：BeatNexusの「仕組み」を具体的に示す */}
      <section className="py-20 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('home.landingPage.howItWorks.title')}
            </h2>
            <p className="text-xl text-gray-400">
              {t('home.landingPage.howItWorks.subtitle')}
            </p>
          </div>

          {/* フロー図 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {[
              { 
                key: 'upload',
                title: t('home.landingPage.howItWorks.steps.upload.title'), 
                description: t('home.landingPage.howItWorks.steps.upload.description'), 
                icon: Upload,
                image: step1Upload
              },
              { 
                key: 'matching',
                title: t('home.landingPage.howItWorks.steps.matching.title'), 
                description: t('home.landingPage.howItWorks.steps.matching.description'), 
                icon: Zap,
                image: step2Matching
              },
              { 
                key: 'voting',
                title: t('home.landingPage.howItWorks.steps.voting.title'), 
                description: t('home.landingPage.howItWorks.steps.voting.description'), 
                icon: Vote,
                image: step3Voting
              },
              { 
                key: 'results',
                title: t('home.landingPage.howItWorks.steps.results.title'), 
                description: t('home.landingPage.howItWorks.steps.results.description'), 
                icon: Star,
                image: step4Results
              }
            ].map((item) => (
              <div key={item.key} className="text-center">
                <div className="relative mb-6">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-lg shadow-lg"
                  />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>

          {/* 主要機能の詳細 */}
          <div className="grid lg:grid-cols-2 gap-12">
            {[
              {
                key: 'onlineBattle',
                icon: Video,
                title: t('home.landingPage.howItWorks.features.onlineBattle.title'),
                description: t('home.landingPage.howItWorks.features.onlineBattle.description')
              },
              {
                key: 'communityVoting',
                icon: Vote,
                title: t('home.landingPage.howItWorks.features.communityVoting.title'),
                description: t('home.landingPage.howItWorks.features.communityVoting.description')
              },
              {
                key: 'seasonRanking',
                icon: Crown,
                title: t('home.landingPage.howItWorks.features.seasonRanking.title'),
                description: t('home.landingPage.howItWorks.features.seasonRanking.description')
              },
              {
                key: 'judgeSystem',
                icon: Star,
                title: t('home.landingPage.howItWorks.features.judgeSystem.title'),
                description: t('home.landingPage.howItWorks.features.judgeSystem.description')
              }
            ].map((item) => (
              <Card key={item.key} className="bg-gray-800/50 border-gray-700 p-8 hover:bg-gray-800/70 transition-colors duration-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-3 text-white">{item.title}</h3>
                    <p className="text-gray-300 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* home.features.section.after.inline - 主要機能詳細セクション後のインライン広告 */}
      <section className="py-12 bg-gradient-to-b from-gray-900 to-gray-850">
        <div className="max-w-4xl mx-auto px-4 flex justify-center">
          <AdSlot
            placementKey="home.features.section.after.inline"
            variant="inline"
            className="w-full max-w-2xl"
          />
        </div>
      </section>

      {/* 5. 社会的証明：信頼と熱狂を「証明」する */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('home.landingPage.socialProof.title')}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-gray-800/40 border-gray-700/50 p-8 text-center hover:bg-gray-800/60 transition-colors duration-200">
              <div className="text-4xl font-bold text-gray-200 mb-2">40+</div>
              <div className="text-gray-400">{t('home.landingPage.socialProof.stats.preRegistration')}</div>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700/50 p-8 text-center hover:bg-gray-800/60 transition-colors duration-200">
              <div className="text-4xl font-bold text-gray-200 mb-2">
                {statsData.loading ? '...' : `${statsData.totalBattles}+`}
              </div>
              <div className="text-gray-400">{t('home.landingPage.socialProof.stats.totalBattles')}</div>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700/50 p-8 text-center hover:bg-gray-800/60 transition-colors duration-200">
              <div className="text-4xl font-bold text-gray-200 mb-2">
                {statsData.loading ? '...' : `${statsData.totalVotes}+`}
              </div>
              <div className="text-gray-400">{t('home.landingPage.socialProof.stats.communityVotes')}</div>
            </Card>
          </div>

          <div className="text-center">
            <h3 className="text-3xl font-bold mb-12 text-white">
              {latestEndedSeason ? `${latestEndedSeason.name} ${t('home.landingPage.socialProof.ranking.title')}` : t('home.landingPage.socialProof.ranking.closedTest')}
            </h3>
            
            {rankingsLoading ? (
              <div className="text-gray-400 text-xl">{t('home.landingPage.socialProof.ranking.loading')}</div>
            ) : (topThreeRankings.length > 0 || topThreeVoterRankings.length > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 justify-items-center max-w-6xl mx-auto">
                {/* 左側：プレイヤーランキング */}
                <div className="bg-gray-800/30 rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-lg">
                  <h4 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 lg:mb-8 text-center text-purple-400">
                    {t('home.landingPage.socialProof.ranking.playerRanking')}
                  </h4>
                  {topThreeRankings.length > 0 ? (
                    <TopThreePodium
                      topThree={topThreeRankings.map(entry => ({
                        ...entry,
                        avatar_url: entry.avatar_url || undefined
                      }))}
                      activeTab="player"
                      getRatingOrSeasonPoints={(entry) => (entry as HistoricalSeasonRanking).points}
                      getVoteCount={() => 0}
                      getRatingColor={(rating) => {
                        if (rating >= 1600) return 'text-purple-400';
                        if (rating >= 1400) return 'text-blue-400';
                        if (rating >= 1200) return 'text-green-400';
                        return 'text-gray-400';
                      }}
                      getVoteCountColor={() => 'text-gray-400'}
                      getPosition={(entry) => (entry as HistoricalSeasonRanking).rank}
                      getUserId={(entry) => (entry as HistoricalSeasonRanking).user_id}
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <p>{t('home.landingPage.socialProof.ranking.noPlayerRanking')}</p>
                    </div>
                  )}
                </div>

                {/* 右側：投票者ランキング */}
                <div className="bg-gray-800/30 rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-lg">
                  <h4 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 lg:mb-8 text-center text-cyan-400">
                    {t('home.landingPage.socialProof.ranking.voterRanking')}
                  </h4>
                  {topThreeVoterRankings.length > 0 ? (
                    <TopThreePodium
                      topThree={topThreeVoterRankings.map(entry => ({
                        ...entry,
                        avatar_url: entry.avatar_url || undefined
                      }))}
                      activeTab="voter"
                      getRatingOrSeasonPoints={() => 0}
                      getVoteCount={(entry) => (entry as VoterRankingEntry).votes}
                      getRatingColor={() => 'text-gray-400'}
                      getVoteCountColor={(voteCount) => {
                        if (voteCount >= 10) return 'text-purple-400';
                        if (voteCount >= 5) return 'text-blue-400';
                        if (voteCount >= 3) return 'text-green-400';
                        return 'text-gray-400';
                      }}
                      getPosition={(entry) => (entry as VoterRankingEntry).rank}
                      getUserId={(entry) => (entry as VoterRankingEntry).user_id}
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <p>{t('home.landingPage.socialProof.ranking.noVoterRanking')}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p>{t('home.landingPage.socialProof.ranking.noSeasonEnded')}</p>
                <p className="text-sm mt-2">{t('home.landingPage.socialProof.ranking.betaSeasonNote')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* home.stats.section.after.infeed - 統計・ランキングセクション後のインフィード広告 */}
      <section className="py-12 bg-gradient-to-b from-black to-gray-850">
        <div className="max-w-4xl mx-auto px-4 flex justify-center">
          <AdSlot
            placementKey="home.stats.section.after.infeed"
            variant="infeed"
            className="w-full max-w-3xl"
          />
        </div>
      </section>

      {/* 6. 未来への期待感：BeatNexusの「壮大なビジョン」を語る */}
      <section className="py-20 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('home.landingPage.vision.title')}
            </h2>
            <p className="text-xl text-gray-400 mb-4">
              {t('home.landingPage.vision.subtitle')}
            </p>
            <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
              <p className="text-sm text-yellow-400">
                {t('home.landingPage.vision.disclaimer')}
              </p>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {t('home.landingPage.vision.summit.title')}
              </h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start space-x-3">
                  <Trophy className="w-6 h-6 text-yellow-400 mt-0.5" />
                  <span>{t('home.landingPage.vision.summit.prizeTournament')}</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Crown className="w-6 h-6 text-purple-400 mt-0.5" />
                  <span>{t('home.landingPage.vision.summit.seedRights')}</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Star className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <span>{t('home.landingPage.vision.summit.globalConnection')}</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center lg:text-left">
              <h4 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {t('home.landingPage.vision.freemium.title')}
              </h4>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start space-x-3">
                  <Star className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: t('home.landingPage.vision.freemium.betaFree') }} />
                </li>
                <li className="flex items-start space-x-3">
                  <Zap className="w-6 h-6 text-yellow-400 mt-0.5" />
                  <span>{t('home.landingPage.vision.freemium.futureModel')}</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Crown className="w-6 h-6 text-purple-400 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: t('home.landingPage.vision.freemium.unlimited') }} />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ：訪問者の「疑問」を解消する */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t('home.landingPage.faq.title')}
            </h2>
          </div>
          
          <div className="space-y-6">
            {[
              {
                key: 'beginner',
                question: t('home.landingPage.faq.beginner.question'),
                answer: t('home.landingPage.faq.beginner.answer')
              },
              {
                key: 'pricing',
                question: t('home.landingPage.faq.pricing.question'),
                answer: t('home.landingPage.faq.pricing.answer')
              },
              {
                key: 'mobile',
                question: t('home.landingPage.faq.mobile.question'),
                answer: t('home.landingPage.faq.mobile.answer')
              },
              {
                key: 'fairness',
                question: t('home.landingPage.faq.fairness.question'),
                answer: t('home.landingPage.faq.fairness.answer')
              }
            ].map((item) => (
              <Card key={item.key} className="bg-gray-800/50 border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-3 text-white">Q. {item.question}</h3>
                <p className="text-gray-300">A. {item.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 8. クロージング：最後のひと押しで「行動」を促す */}
      <section className="py-20 bg-gradient-to-t from-black to-gray-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              {t('home.landingPage.closing.title.history')}
            </span>
            <br />
            <span className="text-white">
              {t('home.landingPage.closing.title.dontMiss')}
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-8">
            {t('home.landingPage.closing.subtitle')}
          </p>
          
          {/* 日程の明記 */}
          <div className="mb-12">
            <Card className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-gray-700/50 p-8 inline-block">
              <div className="space-y-2">
                <div className="flex flex-col items-center text-lg">
                  <span className="font-bold text-cyan-400">{t('home.landingPage.closing.schedule.earlyAccess')}</span>
                  <span className="text-white">{t('home.landingPage.closing.schedule.earlyAccessDate')}</span>
                </div>
                <div className="flex flex-col items-center text-lg">
                  <span className="font-bold text-purple-400">{t('home.landingPage.closing.schedule.publicRelease')}</span>
                  <span className="text-white">{t('home.landingPage.closing.schedule.publicReleaseDate')}</span>
                </div>
              </div>
            </Card>
          </div>
          
          {/* 最終CTAボタン */}
          <button
            onClick={handleJoinNow}
            className="relative inline-block p-px font-semibold leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95 group"
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500 p-[3px] opacity-100 animate-pulse"></span>
            <span className="relative z-10 block px-12 py-6 rounded-xl bg-gray-950">
              <div className="relative z-10 flex items-center space-x-3">
                <span className="text-xl font-bold">{t('home.landingPage.closing.finalCta')}</span>
                <ArrowRight className="w-6 h-6" />
              </div>
            </span>
          </button>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        setMode={setAuthModalMode}
        initialMode={authModalMode}
      />
    </div>
  );
};

export default HomepageTestPage;
