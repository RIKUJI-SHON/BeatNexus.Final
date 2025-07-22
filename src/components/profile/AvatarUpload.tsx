import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { getDefaultAvatarUrl } from '../../utils';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
  className?: string;
  isEditing: boolean;
  userId?: string;
  compact?: boolean; // オンボーディング用のコンパクトモード
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onAvatarUpdate,
  className = '',
  isEditing,
  compact = false
}) => {
  const { user } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('ファイルサイズは5MB以下にしてください');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('JPEG、PNG、WebP形式のファイルのみアップロード可能です');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    uploadAvatar(file);
    event.target.value = ''; 
  };

  const uploadAvatar = async (file: File) => {
    if (!user) {
      setUploadError('ログインが必要です');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      if (currentAvatarUrl) {
        const oldFileName = currentAvatarUrl.split('/').pop();
        if (oldFileName && oldFileName !== 'default-avatar.png') {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldFileName}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl;

      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_user_avatar', {
          p_user_id: user.id,
          p_avatar_url: newAvatarUrl
        });

      if (updateError || (updateResult && updateResult.success === false)) {
        throw updateError || new Error(updateResult?.error || 'Failed to update profile with new avatar');
      }

      onAvatarUpdate(newAvatarUrl);
      setPreviewUrl(null);
      
    } catch (error: unknown) {
      console.error('Avatar upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
      setUploadError(errorMessage);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  const handleCancelPreview = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl || getDefaultAvatarUrl();

  return (
    <div className={`relative ${className}`}>
      <div className="relative group w-full h-full">
        {/* 固定サイズコンテナ - 編集モード時もサイズが変わらない */}
        <div className="w-full h-full rounded-full border-4 border-slate-700 overflow-hidden shadow-2xl">
          <img 
            src={displayUrl}
            alt="プロフィール画像"
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* 編集モード時のオーバーレイ */}
        {isEditing && (
          <div 
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center cursor-pointer"
            onClick={handleUploadClick}
          >
            {isUploading ? (
              <Loader className="h-8 w-8 text-white animate-spin" />
            ) : (
              !previewUrl && <Camera className="h-8 w-8 text-white" />
            )}
          </div>
        )}
        
        {/* プレビューキャンセルボタン */}
        {previewUrl && !isUploading && isEditing && (
          <button
            onClick={handleCancelPreview}
            className="absolute top-2 right-2 p-1 bg-red-600/80 rounded-full text-white hover:bg-red-500 transition-colors z-10"
            aria-label="キャンセル"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 隠しファイル入力 */}
      {isEditing && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      )}

      {/* compactモードでないときのみボタンを表示 */}
      {isEditing && !compact && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUploadClick}
            disabled={isUploading || !!previewUrl}
            leftIcon={isUploading ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            {isUploading ? 'アップロード中...' : '画像を変更'}
          </Button>
        </div>
      )}

      {/* エラーメッセージ */}
      {uploadError && (
        <div className="mt-2 text-sm text-red-400 text-center">
          {uploadError}
        </div>
      )}
    </div>
  );
}; 