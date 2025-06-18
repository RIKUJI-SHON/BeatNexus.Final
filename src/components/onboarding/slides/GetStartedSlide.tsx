import React from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Eye } from 'lucide-react';
import { Button3D } from '../../ui/Button3D';

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



        {/* アクション */}
        <div className="space-y-5 mb-8">
          <div className="flex items-center gap-4 p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Camera className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-base text-gray-300 font-medium">{t('onboarding.slide4.action1')}</span>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-purple-500/10 rounded-xl border border-purple-500/30 hover:bg-purple-500/20 transition-colors">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Eye className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-base text-gray-300 font-medium">{t('onboarding.slide4.action2')}</span>
          </div>
        </div>


      </div>
    </div>
  );
};

export default GetStartedSlide; 