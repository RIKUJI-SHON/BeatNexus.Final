import React, { useState, useEffect, useCallback } from 'react';
import { X, Edit, Save, Instagram, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useProfileSettingsModalStore } from '../../store/profileSettingsModalStore';
import { supabase } from '../../lib/supabase';
import { AvatarUpload } from '../profile/AvatarUpload';
import { PhotoEditorModal } from '../profile/PhotoEditorModal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { getDefaultAvatarUrl } from '../../utils';
import { useCircularAvatar } from '../../hooks/useCircularAvatar';
import { toast } from '../../store/toastStore';
import { trackBeatNexusEvents } from '../../utils/analytics';
import { normalizeInstagramHandle, validateInstagramHandle } from '../../utils/instagram';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  rating: number;
  season_points: number;
  created_at: string;
  instagram_id?: string;
}

export const ProfileSettingsModal: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { isOpen, source, onUpdateCallback, onSaveCallback, closeModal } = useProfileSettingsModalStore();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editInstagramId, setEditInstagramId] = useState('');
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [isPhotoEditorOpen, setIsPhotoEditorOpen] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const circularAvatarUrl = useCircularAvatar(userProfile?.avatar_url);

  // ユーザープロフィール取得
  const fetchUserProfile = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setUserProfile(data);
        setEditUsername(data.username || '');
        setEditBio(data.bio || '');
        setEditInstagramId(data.instagram_id || '');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error(t('profilePageV2.toast.error'), t('profilePageV2.toast.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, t]);

  // モーダルが開かれたときにプロフィールを取得
  useEffect(() => {
    if (isOpen && user) {
      fetchUserProfile();
    }
  }, [isOpen, user, fetchUserProfile]);

  // モーダルを閉じる処理
  const handleClose = () => {
    setInstagramError(null);
    setIsEditingAvatar(false);
    setSelectedPhotoFile(null);
    closeModal();
  };

  // アバター更新ハンドラー
  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    setUserProfile((prev) => prev ? { ...prev, avatar_url: newAvatarUrl } : null);
    toast.success(t('profilePageV2.toast.success'), t('profilePageV2.toast.avatarUpdated'));
    
    // コールバック実行（ProfilePageV2の再取得など）
    if (onUpdateCallback) {
      onUpdateCallback();
    }
  };

  // 写真編集後の保存
  const handleSaveEditedPhoto = async (editedFile: File) => {
    if (!userProfile) return;
    
    setIsPhotoEditorOpen(false);
    setIsEditingAvatar(true);
    
    try {
      const fileExt = editedFile.name.split('.').pop();
      const fileName = `${userProfile.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, editedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl;

      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_user_avatar', {
          p_user_id: userProfile.id,
          p_avatar_url: newAvatarUrl
        });

      if (updateError || (updateResult && updateResult.success === false)) {
        throw updateError || new Error('Failed to update avatar');
      }

      handleAvatarUpdate(newAvatarUrl);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(t('profilePageV2.toast.error'), t('profilePageV2.toast.uploadFailed'));
    } finally {
      setIsEditingAvatar(false);
      setSelectedPhotoFile(null);
    }
  };

  // プロフィール保存
  const handleSaveProfile = async () => {
    if (!user || !userProfile) return;
    
    // Instagram IDのバリデーション
    const normalizedInstagram = normalizeInstagramHandle(editInstagramId);
    const validation = validateInstagramHandle(normalizedInstagram);
    
    if (!validation.isValid) {
      setInstagramError(validation.error || 'Invalid Instagram handle');
      return;
    }
    
    setInstagramError(null);
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase.rpc('update_user_profile_details', {
        p_user_id: user.id,
        p_username: editUsername,
        p_bio: editBio,
        p_instagram_id: normalizedInstagram || null,
      });

      if (error || (data && data.success === false)) {
        throw error || new Error(data?.error || 'Failed to update profile');
      }
      
      setUserProfile(data.profile);
      
      // アナリティクス追跡
      trackBeatNexusEvents.profileEdit();
      
      toast.success(t('profilePageV2.toast.success'), t('profilePageV2.toast.profileUpdated'));
      
      // コールバック実行（ProfilePageV2の再取得など）
      if (onUpdateCallback) {
        onUpdateCallback();
      }
      
      // オンボーディングからの場合はモーダルを閉じて次のスライドへ
      if (source === 'onboarding') {
        handleClose();
        // 保存成功コールバックを実行（次のスライドへ遷移）
        if (onSaveCallback) {
          onSaveCallback();
        }
      } else {
        // プロフィールページからの場合は通常通りモーダルを閉じる
        handleClose();
      }
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : t('profilePageV2.toast.updateFailed');
      toast.error(t('profilePageV2.toast.error'), errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <div className="bg-[#2a3441] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* モーダルヘッダー */}
          <div className="sticky top-0 bg-[#2a3441] border-b border-slate-700/50 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{t('profilePageV2.editModal.title')}</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* モーダルコンテンツ */}
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader className="h-8 w-8 text-cyan-500 animate-spin" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Profile Photo */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">{t('profilePageV2.editModal.profilePhoto')}</h3>
                <div className="flex items-start gap-6">
                  {/* アバター画像 */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-[#1a1f2e] border border-slate-700">
                      <img
                        src={circularAvatarUrl || getDefaultAvatarUrl()}
                        alt={userProfile?.username || 'User'}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                    {/* 小さい紫のカメラアイコン */}
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-[#2a3441]">
                      <Edit className="h-3 w-3 text-white" />
                    </div>
                    {isEditingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <Loader className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  {/* 右側：ボタンとテキスト */}
                  <div className="flex-1">
                    <div className="hidden">
                      <AvatarUpload
                        currentAvatarUrl={userProfile?.avatar_url}
                        onAvatarUpdate={handleAvatarUpdate}
                        isEditing={true}
                        userId={userProfile?.id}
                        compact={true}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/jpeg,image/png,image/gif';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error(t('profilePageV2.toast.error'), t('profilePageV2.toast.fileSizeError'));
                              return;
                            }
                            // 写真編集モーダルを開く
                            setSelectedPhotoFile(file);
                            setIsPhotoEditorOpen(true);
                          }
                        };
                        input.click();
                      }}
                      className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-lg text-sm font-semibold text-white transition-all"
                    >
                      {t('profilePageV2.editModal.changePhoto')}
                    </button>
                    <p className="text-xs text-gray-400 mt-3">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Profile Information */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4">{t('profilePageV2.editModal.profileInfo')}</h3>
                <div className="space-y-4">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {t('profilePageV2.editModal.displayName')}
                    </label>
                    <Input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Rikuji"
                      className="bg-[#1a1f2e] border-slate-600 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      {t('profilePageV2.editModal.bio')}
                    </label>
                    <Textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder={t('profilePageV2.editModal.bioPlaceholder')}
                      rows={4}
                      className="bg-[#1a1f2e] border-slate-600 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  {/* Instagram ID */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">
                      <Instagram className="h-4 w-4 inline mr-1" />
                      {t('profilePageV2.editModal.instagramLabel')}
                    </label>
                    <Input
                      value={editInstagramId}
                      onChange={(e) => {
                        setEditInstagramId(e.target.value);
                        if (instagramError) setInstagramError(null);
                      }}
                      placeholder={t('profilePageV2.editModal.instagramPlaceholder')}
                      className={`bg-[#1a1f2e] border-slate-600 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500 ${
                        instagramError ? 'border-red-500' : ''
                      }`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {t('profilePageV2.editModal.instagramDescription')}
                    </p>
                    {instagramError && (
                      <p className="text-xs text-red-400 mt-1">{instagramError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* モーダルフッター */}
          <div className="sticky bottom-0 bg-[#2a3441] border-t border-slate-700/50 p-6 flex gap-3 justify-end">
            {source === 'onboarding' ? (
              <Button
                onClick={handleSaveProfile}
                isLoading={isSaving}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('profilePageV2.editModal.saveChanges')}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="border-slate-600 text-gray-300 hover:bg-slate-700/50"
                >
                  {t('profilePageV2.editModal.cancel')}
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  isLoading={isSaving}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('profilePageV2.editModal.saveChanges')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 写真編集モーダル */}
      {selectedPhotoFile && (
        <PhotoEditorModal
          isOpen={isPhotoEditorOpen}
          onClose={() => {
            setIsPhotoEditorOpen(false);
            setSelectedPhotoFile(null);
          }}
          imageFile={selectedPhotoFile}
          onSave={handleSaveEditedPhoto}
        />
      )}
    </>
  );
};
