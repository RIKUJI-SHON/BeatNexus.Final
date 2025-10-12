import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboardingStore } from '../../store/onboardingStore';

interface GuideHeroSectionProps {
  className?: string;
}

const GuideHeroSection: React.FC<GuideHeroSectionProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { setOnboardingModalOpen } = useOnboardingStore();

  const handleOpenGuide = () => {
    setOnboardingModalOpen(true);
  };

  return (
    <section className={`relative mb-8 overflow-hidden rounded-2xl border border-gray-700/50 ${className}`}>
      <div
        className="relative h-64 sm:h-72 md:h-80 lg:h-96 rounded-2xl overflow-hidden cursor-pointer group"
        onClick={handleOpenGuide}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenGuide();
          }
        }}
        aria-label={t('battlesPage.welcome.guide.checkGuide', 'How-to Guide を見る')}
      >
        {/* 背景: LPと同じ画像 + グラデーションオーバーレイ */}
        <div className="absolute inset-0">
          <img
            src="/images/backgroud.png"
            alt="background"
            className="w-full h-full object-cover scale-105 opacity-45"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-900/85 to-gray-950/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-transparent to-gray-900/40" />
        </div>

        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-4 left-4 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-4 right-4 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-between text-center px-6 py-8">
          <div />
          <div className="group-hover:scale-105 transition-transform duration-300 relative -ml-2 sm:-ml-3">
            {/* Top layer onboarding image replacing wordmark */}
            <img
              src="/images/onboarding/Slide1.png"
              alt="How to Guide"
              className="mx-auto w-64 sm:w-72 md:w-80 lg:w-[30rem] h-auto drop-shadow-2xl rounded-2xl transition-all duration-300"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="text-sm text-gray-400">
            <span className="text-cyan-400 font-semibold group-hover:text-cyan-300 transition-colors">
              {t('battlesPage.welcome.guide.newHere', '初めての方は')} {t('battlesPage.welcome.guide.checkGuide', 'ガイドをチェック')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GuideHeroSection;
