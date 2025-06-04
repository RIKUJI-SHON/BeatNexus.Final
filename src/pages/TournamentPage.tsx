import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Crown, Star, Zap, Calendar, Users, Medal, Sparkles } from 'lucide-react';

const TournamentPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 flex justify-center items-center opacity-10">
            <Trophy className="w-96 h-96 text-yellow-400" />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Crown className="w-20 h-20 text-yellow-400 animate-pulse" />
                <div className="absolute -top-2 -right-2">
                  <Sparkles className="w-8 h-8 text-yellow-300 animate-spin" />
                </div>
              </div>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6">
              {t('tournament.title')}
            </h1>
            
            <div className="text-2xl md:text-3xl text-gray-300 mb-8 font-light">
              {t('tournament.subtitle')}
            </div>
            
            <div className="inline-flex items-center bg-yellow-400/20 border border-yellow-400/30 rounded-full px-8 py-4 text-yellow-300 font-semibold text-lg">
              <Zap className="w-6 h-6 mr-3 animate-bounce" />
              {t('tournament.comingSoon')}
              <Zap className="w-6 h-6 ml-3 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-4 group-hover:scale-110 transition-transform">
                <Medal className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              {t('tournament.features.eliteOnly.title')}
            </h3>
            <p className="text-gray-300 text-center leading-relaxed">
              {t('tournament.features.eliteOnly.description')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              {t('tournament.features.seasonal.title')}
            </h3>
            <p className="text-gray-300 text-center leading-relaxed">
              {t('tournament.features.seasonal.description')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full p-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              {t('tournament.features.bigPrizes.title')}
            </h3>
            <p className="text-gray-300 text-center leading-relaxed">
              {t('tournament.features.bigPrizes.description')}
            </p>
          </div>
        </div>

        {/* Tournament Structure Preview */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/10 mb-16">
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            {t('tournament.structure.title')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Star className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-yellow-400 mb-4">
                {t('tournament.structure.step1.title')}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {t('tournament.structure.step1.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-blue-400 mb-4">
                {t('tournament.structure.step2.title')}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {t('tournament.structure.step2.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-400 mb-4">
                {t('tournament.structure.step3.title')}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {t('tournament.structure.step3.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Launch Info */}
        <div className="text-center bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl p-12 border border-purple-500/30">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t('tournament.launch.title')}
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('tournament.launch.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              onClick={() => window.location.href = '/ranking'}
            >
              {t('tournament.launch.checkRankings')}
            </button>
            
            <button 
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 backdrop-blur-sm"
              onClick={() => window.location.href = '/battles'}
            >
              {t('tournament.launch.practiceNow')}
            </button>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="fixed top-20 left-10 opacity-20 animate-float">
          <Trophy className="w-16 h-16 text-yellow-400" />
        </div>
        <div className="fixed bottom-20 right-10 opacity-20 animate-float-delayed">
          <Medal className="w-12 h-12 text-purple-400" />
        </div>
        <div className="fixed top-1/2 right-20 opacity-10 animate-spin-slow">
          <Star className="w-20 h-20 text-blue-400" />
        </div>
      </div>
    </div>
  );
};

export default TournamentPage; 