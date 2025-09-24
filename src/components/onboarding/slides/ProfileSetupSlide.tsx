import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/authStore';
import { AvatarUpload } from '../../profile/AvatarUpload';
import { CheckCircle } from 'lucide-react';
import { Button3D } from '../../ui/Button3D';
import { Textarea } from '../../ui/Textarea';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../store/toastStore';

export type ProfileSetupHandle = {
  saveBio: () => Promise<boolean>;
};

const ProfileSetupSlide = forwardRef<ProfileSetupHandle>(function ProfileSetupSlide(_, ref) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUpdatingBio, setIsUpdatingBio] = useState(false);

  // ユーザープロフィール情報を取得
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        setAvatarUrl(data?.avatar_url || null);
        setBio(data?.bio || '');
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  // アバターアップロード完了時のコールバック
  const handleAvatarUpdate = (url: string) => {
    setAvatarUrl(url);
    setSaveSuccess(true);
    
    // 成功表示を2秒後にリセット
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // バイオ保存
  const handleSaveBio = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsUpdatingBio(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: bio.trim() || null })
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      toast.success('プロフィールを更新しました');
      
      // 成功表示を2秒後にリセット
      setTimeout(() => setSaveSuccess(false), 2000);
      return true;
    } catch (error) {
      console.error('Error updating bio:', error);
      toast.error('更新に失敗しました');
      return false;
    } finally {
      setIsUpdatingBio(false);
    }
  }, [user, bio]);

  // 親（OnboardingModal）に保存関数を公開
  useImperativeHandle(ref, () => ({
    saveBio: handleSaveBio,
  }), [handleSaveBio]);

  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部：タイトル */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">
            {t('onboarding.slide4.title')}
          </h2>
        </div>

        {/* 中央：プロフィール写真 */}
        <div className="flex flex-col items-center mb-8">
          <AvatarUpload
            currentAvatarUrl={avatarUrl || undefined}
            onAvatarUpdate={handleAvatarUpdate}
            isEditing={true}
            userId={user?.id}
            className="w-28 h-28 md:w-32 md:h-32 transition-all duration-300"
            compact={true}
          />
          <p className="mt-2 text-[11px] text-gray-400">{t('onboarding.slide4.avatar.changeHint')}</p>
        </div>
        
        {saveSuccess && (
          <div className="flex items-center justify-center gap-1 mb-6">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs">{t('onboarding.slide4.bio.saveSuccess')}</span>
          </div>
        )}
          
        {/* 自己紹介設定 */}
        <div className="space-y-2">
          <div className="text-center">
            <h3 className="text-white font-medium text-sm">{t('onboarding.slide4.bio.title')}</h3>
          </div>
          
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('onboarding.slide4.bio.placeholder')}
            maxLength={200}
            rows={2}
            className="w-full text-sm resize-none"
          />
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">
              {t('onboarding.slide4.bio.characterCount', { count: bio.length })}
            </span>
            
            {/* モバイルでは保存ボタンを非表示（Nextボタンで保存） */}
            <div className="hidden md:block">
              <Button3D
                onClick={handleSaveBio}
                disabled={isUpdatingBio}
                variant="primary"
                className="px-3 py-1 text-xs"
              >
                {isUpdatingBio ? t('onboarding.slide4.bio.saving') : t('onboarding.slide4.bio.saveButton')}
              </Button3D>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProfileSetupSlide;