import React from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Eye } from 'lucide-react';
import { Button3D } from '../../ui/Button3D';

interface GetStartedSlideProps {}

const GetStartedSlide: React.FC<GetStartedSlideProps> = () => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-card w-96 h-[500px]">
      <div className="onboarding-content">
        {/* タイトル */}
        <div className="text-center">
          <div className="text-4xl mb-3">🌱</div>
          <h2 className="text-2xl font-bold text-white mb-6">
            {t('onboarding.slide4.title')}
          </h2>
        </div>

        {/* スクリーンショット画像 */}
        <div className="flex justify-center mb-6">
          <img 
            src="/images/onboarding/Slide1.png" 
            alt="Getting Started Screenshot"
            className="w-full h-32 object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* アクション */}
        <div className="space-y-4 mb-8">
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