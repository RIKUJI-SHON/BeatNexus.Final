import React from 'react';
import { useTranslation } from 'react-i18next';

interface GetStartedSlideProps {}

const GetStartedSlide: React.FC<GetStartedSlideProps> = () => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* タイトル */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <img 
              src="/images/VS.png" 
              alt="VS"
              className="w-12 h-12 object-contain filter brightness-110"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-6">
            {t('onboarding.slide4.title')}
          </h2>
        </div>

        {/* Slide4.png画像表示 */}
        <div className="flex justify-center items-center mb-8">
          <img 
            src="/images/onboarding/Slide4.png" 
            alt="Get Started Guide"
            className="max-w-full max-h-64 object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default GetStartedSlide; 