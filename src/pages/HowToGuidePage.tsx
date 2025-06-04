import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const HowToGuidePage: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Main Content */}
      <div className={`relative z-10 text-center px-6 transform transition-all duration-1000 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}>
        {/* Coming Soon Text */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4 animate-pulse">
            {t('comingSoon.title')}
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 mx-auto mb-6 rounded-full"></div>
        </div>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
          {t('comingSoon.subtitle')}
        </p>

        {/* Feature Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('comingSoon.features.stepByStep')}</h3>
            <p className="text-white/60 text-sm">{t('comingSoon.features.stepByStepDesc')}</p>
          </div>
          
          <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('comingSoon.features.proTips')}</h3>
            <p className="text-white/60 text-sm">{t('comingSoon.features.proTipsDesc')}</p>
          </div>
          
          <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300">
            <div className="text-4xl mb-3">🎬</div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('comingSoon.features.videoGuides')}</h3>
            <p className="text-white/60 text-sm">{t('comingSoon.features.videoGuidesDesc')}</p>
          </div>
        </div>

        {/* Launch Info */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl border border-purple-400/30 p-8 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-3">
            {t('comingSoon.launch.title')}
          </h3>
          <p className="text-white/70 mb-4">
            {t('comingSoon.launch.description')}
          </p>
          <div className="flex items-center justify-center space-x-2 text-cyan-400">
            <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
            <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-100"></span>
            <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-200"></span>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-12">
          <p className="text-white/60 mb-4">{t('comingSoon.meanwhile')}</p>
          <a 
            href="/battles" 
            className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
          >
            <span>{t('comingSoon.exploreBattles')}</span>
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-10 left-10 text-4xl animate-bounce delay-500">🎵</div>
      <div className="absolute top-20 right-20 text-3xl animate-bounce delay-1000">🎤</div>
      <div className="absolute bottom-20 left-20 text-3xl animate-bounce delay-1500">🔥</div>
      <div className="absolute bottom-10 right-10 text-4xl animate-bounce delay-2000">⚡</div>
    </div>
  );
};

export default HowToGuidePage; 