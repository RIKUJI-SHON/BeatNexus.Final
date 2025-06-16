import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnboardingStore } from '../../store/onboardingStore';
import { Button3D } from '../ui/Button3D';
import WelcomeSlide from './slides/WelcomeSlide';
import BattleGuideSlide from './slides/BattleGuideSlide';
import VotingGuideSlide from './slides/VotingGuideSlide';
import GetStartedSlide from './slides/GetStartedSlide';

const OnboardingModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    isOnboardingModalOpen,
    currentSlide,
    setOnboardingModalOpen,
    setHasSeenOnboarding,
    nextSlide,
    previousSlide,
    setCurrentSlide
  } = useOnboardingStore();

  // モーダルを閉じる処理
  const handleClose = () => {
    setOnboardingModalOpen(false);
    setHasSeenOnboarding(true);
  };

  // スキップ処理
  const handleSkip = () => {
    setOnboardingModalOpen(false);
    setHasSeenOnboarding(true);
  };

  // 完了処理
  const handleComplete = () => {
    setOnboardingModalOpen(false);
    setHasSeenOnboarding(true);
  };

  // モーダルが閉じている場合は何も表示しない
  if (!isOnboardingModalOpen) {
    return null;
  }

  // 現在のスライドコンポーネントを取得（ナビゲーション機能なし）
  const getCurrentSlide = () => {
    switch (currentSlide) {
      case 0:
        return <WelcomeSlide />;
      case 1:
        return <BattleGuideSlide />;
      case 2:
        return <VotingGuideSlide />;
      case 3:
        return <GetStartedSlide />;
      default:
        return <WelcomeSlide />;
    }
  };

  // 次へボタンのハンドラー
  const handleNext = () => {
    if (currentSlide === 3) {
      handleComplete();
    } else {
      nextSlide();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative flex items-center gap-8">
        {/* 左側ナビゲーションボタン */}
        <div className="flex-shrink-0 w-20 flex justify-center">
          {currentSlide > 0 && (
            <Button3D
              onClick={previousSlide}
              variant="secondary"
            >
              ❮
            </Button3D>
          )}
        </div>

        {/* メインコンテンツ */}
        <div className="relative">
          {/* ヘッダー - シンプルなコントロール */}
          <div className="absolute -top-12 left-0 right-0 flex justify-between items-center">
            {/* プログレスインジケーター */}
            <div className="flex space-x-2">
              {[0, 1, 2, 3].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentSlide
                      ? 'bg-cyan-500'
                      : index < currentSlide
                      ? 'bg-cyan-600/70'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center space-x-3">
              {/* スキップボタン */}
              <button
                onClick={handleSkip}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                {t('onboarding.skipTour')}
              </button>
              
              {/* 閉じるボタン */}
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* コンテンツ */}
          {getCurrentSlide()}
        </div>

        {/* 右側ナビゲーションボタン */}
        <div className="flex-shrink-0 w-20 flex justify-center">
          <Button3D
            onClick={handleNext}
            variant="primary"
          >
            ❯
          </Button3D>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal; 