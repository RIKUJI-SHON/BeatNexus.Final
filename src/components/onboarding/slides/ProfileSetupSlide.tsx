import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/authStore';
import { AvatarUpload } from '../../profile/AvatarUpload';
import { User, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
}

const ProfileSetupSlide: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

        setUserProfile(data);
        setAvatarUrl(data?.avatar_url || null);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  // アバターアップロード完了時のコールバック
  const handleAvatarUpdate = (url: string) => {
    setAvatarUrl(url);
    // プロフィール情報も更新
    setUserProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    setSaveSuccess(true);
    
    // 成功表示を2秒後にリセット
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="onboarding-card md:w-[480px] md:h-[520px] w-[340px] h-[440px]">
      <div className="onboarding-content flex flex-col h-full">
        {/* ヘッダー */}
        <div className="text-center mb-4">
          <div className="mb-2 flex justify-center">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full">
              <User className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">
            {t('onboarding.avatarSetup.title')}
          </h2>
        </div>

        {/* アバター設定セクション */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <AvatarUpload 
                currentAvatarUrl={userProfile?.avatar_url || undefined}
                onAvatarUpdate={handleAvatarUpdate}
                isEditing={true}
                userId={user?.id}
                className="w-32 h-32"
              />
            </div>

            {/* 成功メッセージ */}
            {saveSuccess && (
              <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">{t('onboarding.avatarSetup.uploadSuccess')}</span>
              </div>
            )}
          </div>
        </div>

        {/* アクションエリア */}
        <div className="text-center">
          {/* スキップ注記 */}
          <p className="text-gray-400 text-xs">
            {t('onboarding.avatarSetup.skipNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupSlide; 