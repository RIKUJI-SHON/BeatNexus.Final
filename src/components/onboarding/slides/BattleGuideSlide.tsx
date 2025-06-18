import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Users, Trophy, Clock } from 'lucide-react';
import { Button3D } from '../../ui/Button3D';

interface BattleGuideSlideProps {}

const BattleGuideSlide: React.FC<BattleGuideSlideProps> = () => {
  const { t } = useTranslation();

  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
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
            {t('onboarding.slide2.title')}
          </h2>
        </div>



        {/* ステップ */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 text-base">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Play className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-gray-300 font-medium">{t('onboarding.slide2.step1')}</span>
          </div>
          <div className="flex items-center gap-3 text-base">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-gray-300 font-medium">{t('onboarding.slide2.step2')}</span>
          </div>
          <div className="flex items-center gap-3 text-base">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-gray-300 font-medium">{t('onboarding.slide2.step3')}</span>
          </div>
          <div className="flex items-center gap-3 text-base">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-300 font-medium">{t('onboarding.slide2.period')}</span>
          </div>
        </div>


      </div>
    </div>
  );
};

export default BattleGuideSlide; 