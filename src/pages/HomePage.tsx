import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Users, Trophy, LineChart as ChartLine, ArrowRight, Play, Star, Shield, Video, Zap, Crown, Target, Upload, Vote } from 'lucide-react';
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
import { useTranslation } from 'react-i18next';

const HomePage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { t } = useTranslation();

  const requireAuth = useRequireAuth({
    showAuthModal: true,
    setAuthModalOpen: setIsAuthModalOpen,
    setAuthModalMode: () => {},
  });

  const handleStartBattle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (requireAuth(() => navigate('/post'))) {
      navigate('/post');
    }
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

        <div className="container mx-auto px-4 relative z-10 text-center">
          {/* Main Title - BEATNEXUS Wordmark */}
          <div className="mb-6 animate-fade-in relative">
            <div className="relative group">
              {/* Glow Effect Background */}
              <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500">
                <img 
                  src={beatnexusWordmark} 
                  alt=""
                  className="mx-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto blur-md scale-110 filter brightness-150"
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
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              ビートボックスバトルで競い合い、<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">ランキングを駆け上がろう</span>！
            </h2>
          </div>

          {/* CTA Buttons - Premium Design */}
          <div className="flex flex-col sm:flex-row justify-center gap-6 animate-fade-in-delay-2">
            {/* 今すぐ参加 - Premium Gradient Button */}
            <button 
              onClick={handleStartBattle}
              className="group relative overflow-hidden px-10 py-4 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl text-white font-bold text-base transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25 min-w-[200px]"
            >
              {/* Reverse Gradient on Hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              
              {/* Button Content */}
              <div className="relative flex items-center justify-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all group-hover:rotate-12 duration-300">
                  <Upload className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </div>
                <span className="tracking-wide">今すぐ参加</span>
                {/* Subtle glow behind text */}
                <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"></div>
              </div>
            </button>

            {/* バトルを観戦 - Gradient Border Button */}
            <button 
              onClick={handleWatchBattles}
              className="group relative overflow-hidden px-10 py-4 bg-gray-900 border-2 border-transparent rounded-2xl text-white font-bold text-base transition-all duration-300 hover:scale-105 min-w-[200px]"
              style={{
                background: 'linear-gradient(135deg, #1f2937, #111827), linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
            >
              {/* Hover Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              
              {/* Button Content */}
              <div className="relative flex items-center justify-center gap-3">
                <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30 group-hover:border-purple-500/50 transition-all group-hover:rotate-12 duration-300">
                  <Play className="h-5 w-5 text-cyan-400 group-hover:text-purple-400 group-hover:scale-110 transition-all" />
                </div>
                <span className="tracking-wide bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:from-purple-400 group-hover:via-pink-400 group-hover:to-cyan-400 transition-all duration-300">
                  バトルを観戦
                </span>
                {/* Subtle glow behind text */}
                <div className="absolute inset-0 bg-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"></div>
              </div>
            </button>
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

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 mb-8">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="text-cyan-400 font-medium text-sm tracking-wide">HOW IT WORKS</span>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              シンプルな <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">4ステップ</span>
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full mx-auto mb-6"></div>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              動画投稿から勝者決定まで、すべて自動化されたバトルシステム
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
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
                  動画投稿
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  ビートボックス動画をアップロード。24時間に1回投稿可能で、自動的にマッチング待機状態に。
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
                  自動マッチング
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  ELOレーティングをもとに相手を自動選択。段階的にマッチング範囲を拡大して最適な対戦相手を発見。
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
                  コミュニティ投票
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  5日間の投票期間でコミュニティが勝者を決定。投票参加でポイントを獲得し、投票者ランキングも上昇。
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
                  結果＆ランキング
                </h3>
                <div className="w-12 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  勝者決定後、ELOレーティングが自動更新。バトル履歴はアーカイブされ、ランキングが更新される。
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

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 mb-8">
              <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-medium text-sm tracking-wide">PLATFORM FEATURES</span>
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              パワフルな <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">プラットフォーム機能</span>
            </h2>
            <div className="w-40 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* ELO Rating System */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-8">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <ChartLine className="h-10 w-10 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                  ELOレーティング
                </h3>
                <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mb-4"></div>
                <p className="text-gray-300 leading-relaxed">
                  チェスと同じELOシステムでスキルを正確に評価。バトル形式別のKファクターで公平なランキングを実現。
                </p>
              </div>
            </Card>

            {/* Community Voting */}
            <Card className="group relative bg-gradient-to-br from-gray-900 via-gray-850 to-gray-950 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 rounded-xl overflow-hidden backdrop-blur-sm p-8">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
              </div>
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-10 w-10 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">
                  投票者ランキング
                </h3>
                <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4"></div>
                <p className="text-gray-300 leading-relaxed">
                  コミュニティ投票への参加でポイント獲得。投票数ベースの専用ランキングでコミュニティ貢献度を評価。
                </p>
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

        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            準備はできた？ <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">バトルを始めよう</span>！
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            今すぐ参加して、世界中のビートボクサーと競い合い、ランキングの頂点を目指そう。
          </p>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Mic className="h-6 w-6" />}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl px-12 py-5 text-xl font-bold hover:scale-105 transition-transform duration-300"
            onClick={handleStartBattle}
          >
            今すぐバトル開始
          </Button>
          <p className="text-sm text-gray-500 mt-6">
            無料でご利用いただけます • 24時間投稿制限あり
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