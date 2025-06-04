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

      <section className="py-24 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('home.shadows.title.main')} <span className="text-cyan-400">{t('home.shadows.title.highlighted')}</span>?
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {t('home.shadows.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gray-800 p-8 rounded-lg animate-fade-in">
              <Play className="h-12 w-12 text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {t('home.shadows.card1.title')}
              </h3>
              <p className="text-gray-400">
                {t('home.shadows.card1.description')}
              </p>
            </Card>

            <Card className="bg-gray-800 p-8 rounded-lg animate-fade-in-delay-1">
              <Star className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {t('home.shadows.card2.title')}
              </h3>
              <p className="text-gray-400">
                {t('home.shadows.card2.description')}
              </p>
            </Card>

            <Card className="bg-gray-800 p-8 rounded-lg animate-fade-in-delay-2">
              <Users className="h-12 w-12 text-yellow-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {t('home.shadows.card3.title')}
              </h3>
              <p className="text-gray-400">
                {t('home.shadows.card3.description')}
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-950">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            {t('home.elevate.title.main')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">{t('home.elevate.title.highlighted')}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gray-900 border border-gray-800 p-6 text-center hover:transform hover:-translate-y-2 transition-all duration-300">
              <Mic className="h-12 w-12 text-cyan-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">{t('home.elevate.card1.title')}</h3>
              <p className="text-gray-400 text-sm">
                {t('home.elevate.card1.description')}
              </p>
            </Card>

            <Card className="bg-gray-900 border border-gray-800 p-6 text-center hover:transform hover:-translate-y-2 transition-all duration-300">
              <Users className="h-12 w-12 text-purple-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">{t('home.elevate.card2.title')}</h3>
              <p className="text-gray-400 text-sm">
                {t('home.elevate.card2.description')}
              </p>
            </Card>

            <Card className="bg-gray-900 border border-gray-800 p-6 text-center hover:transform hover:-translate-y-2 transition-all duration-300">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">{t('home.elevate.card3.title')}</h3>
              <p className="text-gray-400 text-sm">
                {t('home.elevate.card3.description')}
              </p>
            </Card>

            <Card className="bg-gray-900 border border-gray-800 p-6 text-center hover:transform hover:-translate-y-2 transition-all duration-300">
              <ChartLine className="h-12 w-12 text-green-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">{t('home.elevate.card4.title')}</h3>
              <p className="text-gray-400 text-sm">
                {t('home.elevate.card4.description')}
              </p>
            </Card>
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