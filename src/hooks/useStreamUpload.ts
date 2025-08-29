import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import * as tus from 'tus-js-client';

interface StreamUploadResponse {
  success: boolean;
  uploadURL?: string;
  streamVideoId?: string;
  uploadMethod?: 'direct' | 'tus';
  maxDurationSeconds?: number;
  error?: string;
}

export const useStreamUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<string>('');
  const { user } = useAuthStore();

  const uploadVideo = async (file: File, battleFormat: string): Promise<string> => {
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);
    setUploadStage('アップロードURLを取得中...');

    try {
      // 1. Stream アップロードURL取得
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('認証トークンが取得できません');
      }

      const uploadResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-video-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          battleFormat: battleFormat
        })
      });

      if (!uploadResponse.ok) {
        throw new Error('アップロードURL取得に失敗しました');
      }

      const streamData: StreamUploadResponse = await uploadResponse.json();
      
      if (!streamData.success || !streamData.uploadURL || !streamData.streamVideoId) {
        throw new Error(streamData.error || 'アップロードURL取得に失敗しました');
      }

      setUploadStage('動画をアップロード中...');

      // 2. 動画をCloudflare Streamにアップロード
      if (streamData.uploadMethod === 'tus') {
        // TUSプロトコル使用（大容量ファイル）
        await uploadWithTUS(streamData.uploadURL, file);
      } else {
        // 直接アップロード（200MB以下）
        await uploadDirectly(streamData.uploadURL, file);
      }

      setUploadStage('アップロード完了');
      setProgress(100);

      return streamData.streamVideoId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'アップロードに失敗しました';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // TUSプロトコルアップロード（大容量ファイル用）
  const uploadWithTUS = (uploadURL: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: uploadURL,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          console.error('TUS アップロードエラー:', error);
          reject(new Error('大容量ファイルのアップロードに失敗しました'));
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(percentage);
        },
        onSuccess: () => {
          console.log('TUS アップロード完了');
          resolve();
        },
      });

      upload.start();
    });
  };

  // 直接アップロード（200MB以下）
  const uploadDirectly = async (uploadURL: string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          setProgress(percentage);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('アップロードに失敗しました'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('ネットワークエラーが発生しました'));
      });

      xhr.open('POST', uploadURL);
      xhr.send(formData);
    });
  };

  return {
    uploadVideo,
    isUploading,
    progress,
    error,
    uploadStage,
  };
};
