import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, LineChart as ChartLine, ArrowRight, Play, Star, Video, Zap, Crown, Trophy, Target, Upload, Vote, MessageCircle, BarChart3, Shield } from 'lucide-react';
import beatnexusWordmark from '../assets/images/BEATNEXUS-WORDMARK.png';
import heroBackground from '../assets/images/hero-background.png';
import step1Upload from '../assets/images/steps/step1-upload.png';
import step2Matching from '../assets/images/steps/step2-matching.png';
import step3Voting from '../assets/images/steps/step3-voting.png';
import step4Results from '../assets/images/steps/step4-results.png';
import { Card } from '../components/ui/Card';
import { TopThreePodium } from '../components/ui/TopThreePodium';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AuthModal } from '../components/auth/AuthModal';
import { useCanonicalUrl, useDynamicMeta } from '../hooks/useSEO';
import { supabase } from '../lib/supabase';
import { Season, HistoricalSeasonRanking } from '../types';

interface VoterRankingEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  votes: number;
  season_id: string;
}

const HomepageTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [latestEndedSeason, setLatestEndedSeason] = useState<Season | null>(null);
  const [topThreeRankings, setTopThreeRankings] = useState<HistoricalSeasonRanking[]>([]);
  const [topThreeVoterRankings, setTopThreeVoterRankings] = useState<VoterRankingEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [statsData, setStatsData] = useState({
    totalBattles: 0,
    totalVotes: 0,
    loading: true
  });

  // SEO設定
  useCanonicalUrl({
    canonicalUrl: 'https://beatnexus.vercel.app/homepage.test',
    excludeQueryParams: true
  });

  useDynamicMeta({
    title: 'BeatNexus - 新しいランディングページテスト',
    description: 'ビートボクサーのための競技プラットフォーム。動画投稿、自動マッチング、コミュニティ投票でバトルを楽しもう！'
  });

  const requireAuth = useRequireAuth({
    showAuthModal: true,
    setAuthModalOpen: setIsAuthModalOpen,
    setAuthModalMode: setAuthModalMode,
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

  // 統計データを取得
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

        setStatsData({
          totalBattles: battleCount || 0,
          totalVotes: totalVotes,
          loading: false
        });
      } catch (error) {
        console.error('Failed to fetch stats data:', error);
        setStatsData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStatsData();
  }, []);

  const handleJoinNow = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open('https://forms.gle/A5roMYfa6gJFNLpA7', '_blank');
  };

  const handleWatchBattles = (e: React.MouseEvent) => {
    e.preventDefault();
    if (requireAuth(() => navigate('/battles'))) {
      return;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* BeatNexus ワードマークセクション */}
      <section className="relative py-20 bg-gradient-to-b from-black to-gray-900/50">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={heroBackground} 
            alt="" 
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black/50 to-cyan-900/30"></div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <div className="animate-fade-in group mb-12">
            <img 
              src={beatnexusWordmark} 
              alt="BeatNexus" 
              className="relative mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto drop-shadow-2xl group-hover:scale-105 transition-all duration-500 filter group-hover:brightness-110"
            />
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
                  <span className="text-lg">βシーズンに無料で参加する</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </span>
            </button>
            
            <button
              onClick={handleWatchBattles}
              className="flex items-center space-x-2 px-8 py-4 border border-gray-600 rounded-xl hover:border-gray-400 transition-colors duration-200"
            >
              <Play className="w-5 h-5" />
              <span className="text-lg">バトルを観戦する</span>
            </button>
          </div>
        </div>
      </section>

      {/* 1. ファーストビュー：瞬時に訪問者の心を掴む */}
      <section className="relative py-20 flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20">
          <img 
            src={heroBackground} 
            alt="" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          {/* メインキャッチコピー */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-16 animate-fade-in-delay-1">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              全てのビートボクサーに
            </span>
            <br />
            <span className="text-white">
              "次のステップ"を。
            </span>
          </h1>

          {/* 説明文 */}
          <p className="text-lg md:text-xl text-gray-400 animate-fade-in-delay-3">
            動画投稿で気軽にバトル → コミュニティ投票で勝敗が決まる、
            <br />
            ビートボクサー対戦プラットフォーム。
          </p>
        </div>
      </section>

      {/* 2. 課題提起：訪問者の「悩み」に共感する */}
      <section className="py-20 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              こんな課題、ありませんか？
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                icon: Target, 
                title: "モチベーション継続", 
                description: "練習のモチベーションがなかなか続かない" 
              },
              { 
                icon: BarChart3, 
                title: "スキル把握", 
                description: "自分のスキルがシーンでどのレベルなのか、客観的に知りたい" 
              },
              { 
                icon: Shield, 
                title: "気軽な実力試し", 
                description: "大会に出るのはハードルが高いが、気軽に実力を試す場所がない" 
              },
              { 
                icon: Users, 
                title: "コミュニティ", 
                description: "仲間と切磋琢磨し、フィードバックを得る機会が少ない" 
              }
            ].map((item, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700 p-6 text-center hover:bg-gray-800/70 transition-colors duration-200">
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
              が、あなたの「次のステップ」を創り出します。
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-12">
            {[
              {
                icon: ChartLine,
                title: "成長を可視化",
                description: "Eloレートとランキングシステムで、あなたのスキルアップが客観的な数値となって目に見えます。",
                gradient: "from-green-400 to-blue-500"
              },
              {
                icon: Trophy,
                title: "段階的な挑戦",
                description: "気軽なレート戦「Main Battle」から、賞金を懸けた「BeatNexus Summit」まで。あなたのレベルと目標に合わせた挑戦の場があります。",
                gradient: "from-yellow-400 to-orange-500"
              },
              {
                icon: MessageCircle,
                title: "コミュニティとの繋がり",
                description: "投票やコメントを通じて、熱量の高い仲間と繋がり、共に高め合う文化がここにあります。",
                gradient: "from-pink-400 to-purple-500"
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
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
              シンプルな4ステップで始める
            </h2>
            <p className="text-xl text-gray-400">
              複雑な設定は不要。すぐにバトルを楽しめます。
            </p>
          </div>

          {/* フロー図 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {[
              { 
                title: "1. 動画投稿", 
                description: "あなたのビートを動画で投稿", 
                icon: Upload,
                image: step1Upload
              },
              { 
                title: "2. 自動マッチング", 
                description: "最適なレートの対戦相手が自動で決定", 
                icon: Zap,
                image: step2Matching
              },
              { 
                title: "3. コミュニティ投票", 
                description: "オーディエンスがジャッジとして勝敗を決定", 
                icon: Vote,
                image: step3Voting
              },
              { 
                title: "4. 結果・レート更新", 
                description: "結果に基づいてレートが更新され成長を実感", 
                icon: Star,
                image: step4Results
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
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
                icon: Video,
                title: "オンラインバトル",
                description: "動画をアップするだけで、あなたに最適なレートの対戦相手が自動でマッチングされます。"
              },
              {
                icon: Vote,
                title: "コミュニティ投票",
                description: "バトルの勝敗を決めるのは、オーディエンスの1票。プレイヤーだけでなく、誰もがジャッジとして主役になれます。"
              },
              {
                icon: Crown,
                title: "シーズン制ランキング",
                description: "約3ヶ月ごとにシーズンが切り替わり、ランキングがリセット。プレイヤーだけでなく、優れたジャッジを称える「投票者ランキング」も存在します。"
              },
              {
                icon: Star,
                title: "詳細なジャッジシステム",
                description: "「この人、好き！」という直感での投票はもちろん、4つの専門的な視点から評価できる「Judge's Scorecard」機能で、より深くバトルを分析・評価できます。"
              }
            ].map((item, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700 p-8 hover:bg-gray-800/70 transition-colors duration-200">
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

      {/* 5. 社会的証明：信頼と熱狂を「証明」する */}
      <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              既にこれだけ盛り上がっています
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-gray-800/40 border-gray-700/50 p-8 text-center hover:bg-gray-800/60 transition-colors duration-200">
              <div className="text-4xl font-bold text-gray-200 mb-2">40+</div>
              <div className="text-gray-400">事前登録者数</div>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700/50 p-8 text-center hover:bg-gray-800/60 transition-colors duration-200">
              <div className="text-4xl font-bold text-gray-200 mb-2">
                {statsData.loading ? '...' : `${statsData.totalBattles}+`}
              </div>
              <div className="text-gray-400">総バトル数</div>
            </Card>
            <Card className="bg-gray-800/40 border-gray-700/50 p-8 text-center hover:bg-gray-800/60 transition-colors duration-200">
              <div className="text-4xl font-bold text-gray-200 mb-2">
                {statsData.loading ? '...' : `${statsData.totalVotes}+`}
              </div>
              <div className="text-gray-400">コミュニティ投票数</div>
            </Card>
          </div>

          <div className="text-center">
            <h3 className="text-3xl font-bold mb-12 text-white">
              {latestEndedSeason ? `${latestEndedSeason.name} ランキングTOP3` : 'クローズドテスト ランキングTOP3'}
            </h3>
            
            {rankingsLoading ? (
              <div className="text-gray-400 text-xl">読み込み中...</div>
            ) : (topThreeRankings.length > 0 || topThreeVoterRankings.length > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 justify-items-center max-w-6xl mx-auto">
                {/* 左側：プレイヤーランキング */}
                <div className="bg-gray-800/30 rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-lg">
                  <h4 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 lg:mb-8 text-center text-purple-400">
                    プレイヤーランキング
                  </h4>
                  {topThreeRankings.length > 0 ? (
                    <TopThreePodium
                      topThree={topThreeRankings.map(entry => ({
                        ...entry,
                        avatar_url: entry.avatar_url || undefined
                      }))}
                      activeTab="player"
                      getRatingOrSeasonPoints={(entry) => entry.points}
                      getVoteCount={() => 0}
                      getRatingColor={(rating) => {
                        if (rating >= 1600) return 'text-purple-400';
                        if (rating >= 1400) return 'text-blue-400';
                        if (rating >= 1200) return 'text-green-400';
                        return 'text-gray-400';
                      }}
                      getVoteCountColor={() => 'text-gray-400'}
                      getPosition={(entry) => entry.rank}
                      getUserId={(entry) => entry.user_id}
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <p>プレイヤーランキングがありません</p>
                    </div>
                  )}
                </div>

                {/* 右側：投票者ランキング */}
                <div className="bg-gray-800/30 rounded-xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-lg">
                  <h4 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6 lg:mb-8 text-center text-cyan-400">
                    投票者ランキング
                  </h4>
                  {topThreeVoterRankings.length > 0 ? (
                    <TopThreePodium
                      topThree={topThreeVoterRankings.map(entry => ({
                        ...entry,
                        avatar_url: entry.avatar_url || undefined
                      }))}
                      activeTab="voter"
                      getRatingOrSeasonPoints={() => 0}
                      getVoteCount={(entry) => entry.votes}
                      getRatingColor={() => 'text-gray-400'}
                      getVoteCountColor={(voteCount) => {
                        if (voteCount >= 10) return 'text-purple-400';
                        if (voteCount >= 5) return 'text-blue-400';
                        if (voteCount >= 3) return 'text-green-400';
                        return 'text-gray-400';
                      }}
                      getPosition={(entry) => entry.rank}
                      getUserId={(entry) => entry.user_id}
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <p>投票者ランキングがありません</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p>まだ終了したシーズンがありません</p>
                <p className="text-sm mt-2">βシーズンの結果をお楽しみに！</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. 未来への期待感：BeatNexusの「壮大なビジョン」を語る */}
      <section className="py-20 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              BeatNexusの壮大なビジョン
            </h2>
            <p className="text-xl text-gray-400 mb-4">
              ただの対戦ツールではない、シーン全体を巻き込むプラットフォーム
            </p>
            <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
              <p className="text-sm text-yellow-400">
                ※ 以下の内容は将来的な構想・計画であり、現在開発・検討中のものです
              </p>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                BeatNexus Summit 構想
              </h3>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start space-x-3">
                  <Trophy className="w-6 h-6 text-yellow-400 mt-0.5" />
                  <span>シーズン上位者には、賞金付きトーナメントへの道が拓かれる</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Crown className="w-6 h-6 text-purple-400 mt-0.5" />
                  <span>Season 1 の上位8名は、次なるトーナメントの【シード権】を獲得</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Star className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <span>グローバルなビートボックスシーンとの連携を予定</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center lg:text-left">
              <h4 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                フリーミアムモデルの予告
              </h4>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start space-x-3">
                  <Star className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <span><span className="font-bold text-cyan-400">βシーズンは【完全無料】</span>で全機能をご利用いただけます</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Zap className="w-6 h-6 text-yellow-400 mt-0.5" />
                  <span>将来的には、月に指定回数まで無料で挑戦できるレート戦を提供</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Crown className="w-6 h-6 text-purple-400 mt-0.5" />
                  <span>本気で上を目指すプレイヤーのための<span className="font-semibold text-purple-400">「Nexus Unlimited」</span>の導入を計画</span>
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
              よくある質問
            </h2>
          </div>
          
          <div className="space-y-6">
            {[
              {
                question: "初心者でも参加できますか？",
                answer: "もちろんです。BeatNexusはあらゆるレベルのプレイヤーに「次のステップ」を提供するために生まれました。まずは気軽に動画を投稿してみてください。"
              },
              {
                question: "料金はかかりますか？",
                answer: "現在開催中のβシーズンは、全ての機能を完全無料でご利用いただけます。"
              },
              {
                question: "スマートフォンでも利用できますか？",
                answer: "現在はPCでの利用を推奨していますが、モバイル版でもアプリのようにサイトからダウンロードして使うことができます。PWA対応により、ホーム画面に追加してネイティブアプリのような体験を提供しています。"
              },
              {
                question: "不正な投票が心配です。",
                answer: "BeatNexusでは投票の匿名性をなくし、誰が誰に投票したかを公開することで、責任感のある健全なコミュニティを目指しています。"
              }
            ].map((item, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700 p-6">
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
              歴史の始まりに、
            </span>
            <br />
            <span className="text-white">
              乗り遅れるな。
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-8">
            新たなビートボックスの歴史を、共に刻もう。
          </p>
          
          {/* 日程の明記 */}
          <div className="mb-12">
            <Card className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 border-gray-700/50 p-8 inline-block">
              <div className="space-y-2">
                <div className="flex flex-col items-center text-lg">
                  <span className="font-bold text-cyan-400">先行アクセス (事前登録者限定):</span>
                  <span className="text-white">8月1日〜8月7日</span>
                </div>
                <div className="flex flex-col items-center text-lg">
                  <span className="font-bold text-purple-400">完全一般公開:</span>
                  <span className="text-white">8月8日〜</span>
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
                <span className="text-xl font-bold">【無料】でβシーズン先行アクセス権を手に入れる</span>
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
