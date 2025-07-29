import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Users, LineChart as ChartLine, ArrowRight, Play, Star, Video, Zap, Crown, Target, Upload, Vote } from 'lucide-react';
import beatnexusWordmark from '../assets/images/BEATNEXUS-WORDMARK.png';
import heroBackground from '../assets/images/hero-background.png';
import step1Upload from '../assets/images/steps/step1-upload.png';
import step2Matching from '../assets/images/steps/step2-matching.png';
import step3Voting from '../assets/images/steps/step3-voting.png';
import step4Results from '../assets/images/steps/step4-results.png';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import LatestBattles from '../components/home/LatestBattles';
import { useAuthStore } from '../store/authStore';
import BattlesPage from './BattlesPage';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { AuthModal } from '../components/auth/AuthModal';
import { useTranslation, Trans } from 'react-i18next';
import { useCanonicalUrl, useDynamicMeta } from '../hooks/useSEO';

const HomePage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { t } = useTranslation();

  // SEO設定
  useCanonicalUrl({
    canonicalUrl: 'https://beatnexus.vercel.app/',
    excludeQueryParams: true
  });

  useDynamicMeta({
    title: 'BeatNexus - Beatbox Battle Community',
    description: 'ビートボクサーのための競技プラットフォーム。動画投稿、自動マッチング、コミュニティ投票でバトルを楽しもう！'
  });

  const requireAuth = useRequireAuth({
    showAuthModal: true,
    setAuthModalOpen: setIsAuthModalOpen,
    setAuthModalMode: () => {},
  });

  const handleJoinNow = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open('https://forms.gle/A5roMYfa6gJFNLpA7', '_blank');
  };

  const handleWatchBattles = (e: React.MouseEvent) => {
    e.preventDefault();
    if (requireAuth(() => navigate('/battles'))) {
      navigate('/battles');
    }
  };

  if (user) {
    return <BattlesPage />;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section - 改良版 */}
      <section className="relative py-16 md:py-24 flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          {/* 背景画像 - src/assets/images/フォルダに配置した画像を使用 */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBackground})` }}>
            {/* フォールバック: オンライン画像（開発用） */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat [background-image:var(--fallback-bg)]"></div>
            
            {/* グラデーションオーバーレイで可読性を確保 */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/85 to-gray-950/90"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-gray-900/40"></div>
          </div>
        </div>

        {/* Enhanced Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container-ultra-wide relative z-10 text-center">
          {/* Main Title - BEATNEXUS Wordmark */}
          <div className="mb-6 animate-fade-in relative">
            <div className="relative group">
              {/* Glow Effect Background */}
              <div className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity duration-500">
                <img 
                  src={beatnexusWordmark} 
                  alt=""
                  className="mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto blur-sm scale-110 filter brightness-150"
                />
              </div>
              
              {/* Main Wordmark */}
              <img 
                src={beatnexusWordmark} 
                alt="BEATNEXUS"
                className="relative mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto drop-shadow-2xl group-hover:scale-105 transition-all duration-500 filter group-hover:brightness-110"
              />
            </div>
          </div>
          
          {/* Value Proposition */}
          <div className="mb-8 animate-fade-in-delay-1">
            {/* 新しいキャッチフレーズ */}
            <p className="text-lg md:text-xl text-gray-300 mb-4 font-medium">
              {t('home.hero.subtitle.nextStep')}
            </p>
            
            {/* 投票に焦点を当てた更新されたサブタイトル */}
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              {t('home.hero.subtitle.compete')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{t('home.hero.subtitle.climbRanking')}</span>
            </h2>

            {/* Season Information */}
            <div className="mt-6 mb-4 animate-fade-in-delay-3">
              <div className="inline-block bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl px-6 py-4 shadow-xl">
                {/* Season Badge Image */}
                <div className="mb-3">
                  <img 
                    src="/images/ranking-title-badge.png" 
                    alt="BeatNexus β Season 0"
                    className="mx-auto max-w-24 sm:max-w-28 h-auto drop-shadow-lg"
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm md:text-base text-gray-300">
                  <span className="font-bold text-cyan-400">{t('home.hero.seasonInfo.earlyAccess')}</span>
                  <span className="hidden sm:inline">|</span>
                  <span>{t('home.hero.seasonInfo.earlyAccessLabel')}</span>
                  <span className="hidden sm:inline">|</span>
                  <span className="font-bold text-purple-400">{t('home.hero.seasonInfo.publicRelease')}</span>
                  <span>{t('home.hero.seasonInfo.publicReleaseLabel')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button - Modern Gradient Border Design */}
          <div className="flex items-center justify-center animate-fade-in-delay-2">
            <div className="relative group">
              <button
                onClick={handleJoinNow}
                className="relative inline-block p-px font-semibold leading-6 text-white bg-gray-800 shadow-2xl cursor-pointer rounded-xl shadow-zinc-900 transition-transform duration-300 ease-in-out hover:scale-105 active:scale-95"
              >
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 via-blue-500 to-purple-500 p-[2px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>

                <span className="relative z-10 block px-6 py-3 rounded-xl bg-gray-950">
                  <div className="relative z-10 flex items-center space-x-2">
                    <span className="transition-all duration-500 group-hover:translate-x-1">
                      {t('home.hero.button.joinNow')}
                    </span>
                    <svg
                      className="w-6 h-6 transition-transform duration-500 group-hover:translate-x-1"
                      data-slot="icon"
                      aria-hidden="true"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        clipRule="evenodd"
                        d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                        fillRule="evenodd"
                      />
                    </svg>
                  </div>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - BeatNexusの実際の流れ */}
      <section className="py-32 bg-gray-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container-ultra-wide relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 mb-8">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="text-cyan-400 font-medium text-sm tracking-wide">{t('home.howItWorks.title')}</span>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t('home.howItWorks.subtitle').split(' ').slice(0, -1).join(' ')} <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{t('home.howItWorks.subtitle').split(' ').slice(-1)[0]}</span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full mx-auto mb-6"></div>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t('home.howItWorks.description')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 container-ultra-wide">
            {/* Step 1: Upload */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-8 text-center">
              {/* Background Image */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 group-hover:opacity-30 transition-opacity duration-500" style={{ backgroundImage: `url(${step1Upload})` }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/60 via-gray-900/80 to-gray-950/90"></div>
                </div>
              </div>
              
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/40 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-10 w-10 text-cyan-400" />
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                  {t('home.howItWorks.steps.upload.title')}
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t('home.howItWorks.steps.upload.description')}
                </p>
              </div>
            </Card>

            {/* Step 2: Matching */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-8 text-center">
              {/* Background Image */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 group-hover:opacity-30 transition-opacity duration-500" style={{ backgroundImage: `url(${step2Matching})` }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-gray-900/80 to-gray-950/90"></div>
                </div>
              </div>
              
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/40 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-10 w-10 text-purple-400" />
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-sm">2</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">
                  {t('home.howItWorks.steps.matching.title')}
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t('home.howItWorks.steps.matching.description')}
                </p>
              </div>
            </Card>

            {/* Step 3: Voting */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-yellow-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-8 text-center">
              {/* Background Image */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 group-hover:opacity-30 transition-opacity duration-500" style={{ backgroundImage: `url(${step3Voting})` }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/60 via-gray-900/80 to-gray-950/90"></div>
                </div>
              </div>
              
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/40 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Vote className="h-10 w-10 text-yellow-400" />
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-yellow-400 transition-colors">
                  {t('home.howItWorks.steps.voting.title')}
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t('home.howItWorks.steps.voting.description')}
                </p>
              </div>
            </Card>

            {/* Step 4: Results */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-8 text-center">
              {/* Background Image */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 group-hover:opacity-30 transition-opacity duration-500" style={{ backgroundImage: `url(${step4Results})` }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-green-900/60 via-gray-900/80 to-gray-950/90"></div>
                </div>
              </div>
              
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/40 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Crown className="h-10 w-10 text-green-400" />
                </div>
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-sm">4</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-green-400 transition-colors">
                  {t('home.howItWorks.steps.results.title')}
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t('home.howItWorks.steps.results.description')}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section - 実際の機能を強調 */}
      <section className="py-32 bg-gray-950 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-yellow-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container-ultra-wide relative z-10">
          <div className="text-center mb-20">
            {/* Ranking Title Badge */}
            <div className="mb-12">
              <img 
                src="/images/ranking-title-badge.png" 
                alt="Ranking Badge"
                className="mx-auto max-w-xs sm:max-w-sm md:max-w-md h-auto drop-shadow-2xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 container-ultra-wide">
            {/* Player Ranking */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-8">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>
              <div className="relative">
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                  {t('home.rankings.playerRanking.title')}
                </h3>
                <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mb-4"></div>
                <p className="text-gray-300 leading-relaxed mb-6">
                  {t('home.rankings.playerRanking.description')}
                </p>
                {/* Beta Season Reward */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="text-cyan-400 font-bold text-sm mb-2">{t('home.rankings.playerRanking.betaReward.title')}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{t('home.rankings.playerRanking.betaReward.description')}</p>
                </div>
              </div>
            </Card>

            {/* Voter Ranking */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-8">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>
              <div className="relative">
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">
                  {t('home.rankings.voterRanking.title')}
                </h3>
                <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4"></div>
                <p className="text-gray-300 leading-relaxed mb-6">
                  {t('home.rankings.voterRanking.description')}
                </p>
                {/* Beta Season Reward */}
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="text-purple-400 font-bold text-sm mb-2">{t('home.rankings.voterRanking.betaReward.title')}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">{t('home.rankings.voterRanking.betaReward.description')}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Latest Battles Section */}
      <LatestBattles />

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 text-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="container-ultra-wide relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            <Trans
              i18nKey="home.cta.title"
              components={{
                span: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400" />
              }}
            />
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            {t('home.cta.subtitle')}
          </p>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Mic className="h-6 w-6" />}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl px-12 py-5 text-xl font-bold hover:scale-105 transition-transform duration-300"
            onClick={handleJoinNow}
          >
            {t('home.cta.button')}
          </Button>
          <p className="text-sm text-gray-500 mt-6">
            {t('home.cta.note')}
          </p>
        </div>
      </section>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="signup"
        setMode={() => {}}
      />
    </div>
  );
};

export default HomePage;