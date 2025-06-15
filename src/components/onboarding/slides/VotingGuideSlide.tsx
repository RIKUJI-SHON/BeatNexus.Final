import React from 'react';
import { useTranslation } from 'react-i18next';
import { Vote, Crown } from 'lucide-react';

interface VotingGuideSlideProps {
  onNext: () => void;
  onPrevious: () => void;
}

const VotingGuideSlide: React.FC<VotingGuideSlideProps> = ({ onNext, onPrevious }) => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-card w-96 h-[500px]">
      <div className="onboarding-content">
        {/* タイトル */}
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <img 
              src="/images/VS.png" 
              alt="VS"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-6">
            {t('onboarding.slide3.title')}
          </h2>
        </div>

        {/* スクリーンショット画像 */}
        <div className="flex justify-center mb-6">
          <img 
            src="/images/onboarding/Slide3.png" 
            alt="Voting and Community Screenshot"
            className="w-full h-32 object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* 機能 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-base">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Vote className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-300 font-medium">投票でコミュニティ参加</span>
          </div>
          <div className="flex items-center gap-3 text-base">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-gray-300 font-medium">{t('onboarding.slide3.benefit')}</span>
          </div>
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex gap-3">
          <button
            onClick={onPrevious}
            className="flex-1 px-6 py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition-colors"
          >
            {t('onboarding.previous')}
          </button>
          <button
            onClick={onNext}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
          >
            {t('onboarding.slide3.cta')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VotingGuideSlide; 