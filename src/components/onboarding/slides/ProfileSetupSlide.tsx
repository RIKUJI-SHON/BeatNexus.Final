import { useEffect, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileSettingsModalStore } from '../../../store/profileSettingsModalStore';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { Settings } from 'lucide-react';

export type ProfileSetupHandle = {
  // オンボーディングからは使用しないが、互換性のために残す
  saveBio: () => Promise<boolean>;
};

const ProfileSetupSlide = forwardRef<ProfileSetupHandle>(function ProfileSetupSlide() {
  const { t } = useTranslation();
  const { openModal } = useProfileSettingsModalStore();
  const { nextSlide } = useOnboardingStore();

  // スライドがマウントされたら自動でモーダルを開く
  useEffect(() => {
    console.log('[ProfileSetupSlide] Opening settings modal automatically');
    // 保存成功時に次のスライドへ遷移するコールバックを渡す
    openModal('onboarding', undefined, nextSlide);
  }, [openModal, nextSlide]);

  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content flex flex-col items-center justify-center h-full text-center space-y-6">
        {/* アイコン */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
            <Settings className="h-12 w-12 text-white" />
          </div>
          <div className="absolute inset-0 blur-xl bg-gradient-to-r from-pink-500/30 to-purple-600/30 rounded-full -z-10" />
        </div>

        {/* タイトル */}
        <h2 className="text-3xl font-bold text-white">
          {t('onboarding.slide4.title')}
        </h2>

        {/* 説明文 */}
        <p className="text-gray-300 text-sm max-w-sm">
          {t('onboarding.slide4.description', 'プロフィール画像と自己紹介を設定しましょう。設定モーダルが開きます。')}
        </p>

        {/* 再オープンボタン（モーダルを閉じてしまった場合用） */}
        <button
          onClick={() => openModal('onboarding')}
          className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg text-sm font-semibold text-white transition-all"
        >
          {t('onboarding.slide4.reopenSettings', '設定を開く')}
        </button>
      </div>
    </div>
  );
});

export default ProfileSetupSlide;