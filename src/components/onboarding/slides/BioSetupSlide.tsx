import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit3, CheckCircle } from 'lucide-react';
import { Button3D } from '../../ui/Button3D';
import { Textarea } from '../../ui/Textarea';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { useToastStore, toast } from '../../../store/toastStore';

export const BioSetupSlide: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [bio, setBio] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveBio = async () => {
    if (!user || !bio.trim()) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: bio.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      toast.success('プロフィールを更新しました');
      
      // 成功表示を2秒後にリセット
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error updating bio:', error);
      toast.error('更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="onboarding-card md:w-[480px] md:h-[520px] w-[340px] h-[440px]">
      <div className="onboarding-content flex flex-col h-full">
        {/* ヘッダー */}
        <div className="text-center mb-4">
          <div className="mb-2 flex justify-center">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full">
              <Edit3 className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">
            {t('onboarding.bioSetup.title')}
          </h2>
        </div>

        {/* バイオ設定セクション */}
        <div className="flex-1 space-y-4">
          <div className="space-y-4">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('onboarding.bioSetup.bioPlaceholder')}
              rows={10}
              maxLength={200}
              className="w-full bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20 text-sm resize-none"
            />
            <div className="text-right text-xs text-gray-400">
              {bio.length}/200
            </div>
          </div>
        </div>

        {/* アクションエリア */}
        <div className="text-center mt-6">
          {/* 保存ボタン */}
          {bio.trim() && (
            <div className="mb-4">
              <Button3D
                onClick={handleSaveBio}
                disabled={isUpdating}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-sm"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('onboarding.bioSetup.saving')}
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('onboarding.bioSetup.saveSuccess')}
                  </>
                ) : (
                  t('onboarding.bioSetup.saveButton')
                )}
              </Button3D>
            </div>
          )}
          
          {/* スキップ注記 */}
          <p className="text-gray-400 text-xs">
            {t('onboarding.bioSetup.skipNote')}
          </p>
        </div>
      </div>
    </div>
  );
}; 