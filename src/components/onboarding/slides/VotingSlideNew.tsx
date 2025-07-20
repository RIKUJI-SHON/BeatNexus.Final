import React from 'react';
import { useTranslation } from 'react-i18next';

const VotingSlideNew: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部タイトル */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white" data-testid="voting-slide-title">
            {t('onboarding.slide3.title').split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < t('onboarding.slide3.title').split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </h2>
        </div>

        {/* 中央画像（左右並び） */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="flex-1 text-center">
            <img 
              src="/images/Tournaments.png" 
              alt="Tournaments"
              className="w-full h-20 object-contain rounded-lg"
              data-testid="tournaments-image"
            />
          </div>
          <div className="flex-1 text-center">
            <img 
              src="/images/onboarding/judge.png" 
              alt="Official Judge"
              className="w-full h-20 object-contain rounded-lg"
              data-testid="judge-image"
            />
          </div>
        </div>

        {/* 下部説明 */}
        <div className="text-center">
          <p className="text-gray-300 text-sm leading-relaxed" data-testid="voting-slide-description">
            {t('onboarding.slide3.description')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VotingSlideNew;
