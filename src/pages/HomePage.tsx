import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Users, Trophy, LineChart as ChartLine, ArrowRight, Play, Star, Shield } from 'lucide-react';
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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/2034851/pexels-photo-2034851.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950/90 to-gray-950/95" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-8 animate-fade-in tracking-wider drop-shadow-2xl logo-glow">
            {t('home.hero.title.main')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto animate-fade-in-delay-1">
            {t('home.hero.subtitle.main')} <span className="font-semibold">{t('home.hero.subtitle.battle')}</span>, <span className="font-semibold">{t('home.hero.subtitle.share')}</span>, <span className="font-semibold">{t('home.hero.subtitle.connect')}</span>, {t('home.hero.subtitle.and')} <span className="font-semibold">{t('home.hero.subtitle.grow')}</span>. {t('home.hero.subtitle.join')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-delay-2">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Mic className="h-5 w-5" />}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full px-10"
              onClick={handleStartBattle}
            >
              {t('home.hero.button.startBattle')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              rightIcon={<ArrowRight className="h-5 w-5" />}
              className="border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 rounded-full px-10"
              onClick={handleWatchBattles}
            >
              {t('home.hero.button.watchBattles')}
            </Button>
          </div>
        </div>
      </section>

      <section className="py-32 bg-gray-900 relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 mb-8">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="text-cyan-400 font-medium text-sm tracking-wide">DISCOVER FEATURES</span>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t('home.shadows.title.main')} <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{t('home.shadows.title.highlighted')}</span>?
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full mx-auto mb-6"></div>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t('home.shadows.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Card className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-10 rounded-3xl hover:border-cyan-500/30 transition-all duration-500 animate-fade-in group-hover:transform group-hover:-translate-y-2">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <Play className="h-10 w-10 text-cyan-400" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                    {t('home.shadows.card1.title')}
                  </h3>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mb-4"></div>
                  <p className="text-gray-300 leading-relaxed">
                    {t('home.shadows.card1.description')}
                  </p>
                </div>
              </Card>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Card className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-10 rounded-3xl hover:border-purple-500/30 transition-all duration-500 animate-fade-in-delay-1 group-hover:transform group-hover:-translate-y-2">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <Star className="h-10 w-10 text-purple-400" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">
                    {t('home.shadows.card2.title')}
                  </h3>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4"></div>
                  <p className="text-gray-300 leading-relaxed">
                    {t('home.shadows.card2.description')}
                  </p>
                </div>
              </Card>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Card className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 p-10 rounded-3xl hover:border-yellow-500/30 transition-all duration-500 animate-fade-in-delay-2 group-hover:transform group-hover:-translate-y-2">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-500/30 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-10 w-10 text-yellow-400" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-yellow-400 transition-colors">
                    {t('home.shadows.card3.title')}
                  </h3>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mb-4"></div>
                  <p className="text-gray-300 leading-relaxed">
                    {t('home.shadows.card3.description')}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-gray-950 relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-yellow-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-green-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 mb-8">
              <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300 font-medium text-sm tracking-wide">PLATFORM CAPABILITIES</span>
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {t('home.elevate.title.main')} <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{t('home.elevate.title.highlighted')}</span>
            </h2>
            <div className="w-40 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Card className="relative bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 p-8 text-center hover:border-cyan-500/30 transition-all duration-500 group-hover:-translate-y-3 rounded-3xl">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <Mic className="h-10 w-10 text-cyan-400" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                    {t('home.elevate.card1.title')}
                  </h3>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {t('home.elevate.card1.description')}
                  </p>
                </div>
              </Card>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Card className="relative bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 p-8 text-center hover:border-purple-500/30 transition-all duration-500 group-hover:-translate-y-3 rounded-3xl">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <Users className="h-10 w-10 text-purple-400" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">
                    {t('home.elevate.card2.title')}
                  </h3>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {t('home.elevate.card2.description')}
                  </p>
                </div>
              </Card>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Card className="relative bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 p-8 text-center hover:border-yellow-500/30 transition-all duration-500 group-hover:-translate-y-3 rounded-3xl">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl border border-yellow-500/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <Trophy className="h-10 w-10 text-yellow-400" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-yellow-400 transition-colors">
                    {t('home.elevate.card3.title')}
                  </h3>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {t('home.elevate.card3.description')}
                  </p>
                </div>
              </Card>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Card className="relative bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 p-8 text-center hover:border-green-500/30 transition-all duration-500 group-hover:-translate-y-3 rounded-3xl">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <ChartLine className="h-10 w-10 text-green-400" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-green-400 transition-colors">
                    {t('home.elevate.card4.title')}
                  </h3>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {t('home.elevate.card4.description')}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <LatestBattles />

      <section className="py-24 bg-gray-900 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-white mb-6">
            {t('home.ready.title.main')} <span className="text-cyan-400">{t('home.ready.title.highlighted')}</span>?
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-xl mx-auto">
            {t('home.ready.subtitle')}
          </p>
          <Button
            variant="primary"
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full px-12 py-5 text-xl"
            onClick={handleStartBattle}
          >
            {t('home.ready.button')}
          </Button>
          <p className="text-sm text-gray-500 mt-6">
            {t('home.ready.availability')}
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