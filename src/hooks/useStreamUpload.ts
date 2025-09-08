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
  requestId?: string;
  elapsedMs?: number;
  meta?: Record<string, unknown>;
}

interface UploadDebugInfo {
  phase: 'init' | 'get_url' | 'upload_direct' | 'upload_tus' | 'done';
  message: string;
  details?: unknown;
}

// デバッグ有効化条件:
// 1) localStorage.STREAM_DEBUG === '1'
// 2) URLクエリに streamDebug=1
// 3) window.__STREAM_DEBUG__ が truthy
const isDebugEnabled = (): boolean => {
  try {
    if (typeof window !== 'undefined') {
  if ((window as unknown as { __STREAM_DEBUG__?: boolean }).__STREAM_DEBUG__) return true;
      if (localStorage.getItem('STREAM_DEBUG') === '1') return true;
      if (window.location?.search?.includes('streamDebug=1')) return true;
    }
  } catch { /* noop */ }
  return false;
};

// (Optional) 将来的にフォールバック制御を行う場合は下記のようなフラグを再導入
// const isFallbackDisabled = () => localStorage.getItem('DISABLE_STREAM_FALLBACK') === '1';

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

    const debug = isDebugEnabled();
    const debugLogs: UploadDebugInfo[] = [];
    const pushDebug = (info: UploadDebugInfo) => {
      debugLogs.push(info);
  if (debug) console.log(`[StreamDebug][${info.phase}] ${info.message}`, info.details || '');
    };

    try {
      // 1. Stream アップロードURL取得
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('認証トークンが取得できません');
      }

      const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-video-stream`;
      pushDebug({ phase: 'get_url', message: 'Requesting upload URL', details: { edgeFnUrl, battleFormat, fileSize: file.size } });
      const uploadResponse = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(debug ? { 'x-debug': 'true' } : {})
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          battleFormat: battleFormat
        })
      });

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text().catch(() => '');
        pushDebug({ phase: 'get_url', message: 'Failed to obtain upload URL', details: { status: uploadResponse.status, body: text } });
        throw new Error('アップロードURL取得に失敗しました');
      }

      const streamData: StreamUploadResponse = await uploadResponse.json();
      pushDebug({ phase: 'get_url', message: 'Edge function response received', details: streamData });
      
      if (!streamData.success || !streamData.uploadURL || !streamData.streamVideoId) {
        pushDebug({ phase: 'get_url', message: 'Edge function response invalid', details: streamData });
        throw new Error(streamData.error || 'アップロードURL取得に失敗しました');
      }

      setUploadStage('動画をアップロード中...');

      // 2. 動画をCloudflare Streamにアップロード
      if (streamData.uploadMethod === 'tus') {
        // TUSプロトコル使用（大容量ファイル）
        pushDebug({ phase: 'upload_tus', message: 'Starting TUS upload' });
        await uploadWithTUS(streamData.uploadURL, file, pushDebug);
      } else {
        // 直接アップロード（200MB以下）
        pushDebug({ phase: 'upload_direct', message: 'Starting direct upload' });
        await uploadDirectly(streamData.uploadURL, file, pushDebug);
      }

      setUploadStage('アップロード完了');
      setProgress(100);
      pushDebug({ phase: 'done', message: 'Upload completed successfully', details: { streamVideoId: streamData.streamVideoId } });

      return streamData.streamVideoId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'アップロードに失敗しました';
      setError(errorMessage);
      pushDebug({ phase: 'done', message: 'Upload failed', details: { error: errorMessage } });

      // デバッグログをまとめて出力（失敗時）
      if (debug) {
        console.groupCollapsed('[StreamDebug] Upload failure trace');
        for (const l of debugLogs) console.log(l.phase, l.message, l.details || '');
        console.groupEnd();
      }
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // TUSプロトコルアップロード（大容量ファイル用）
  const uploadWithTUS = (uploadURL: string, file: File, debugCb?: (info: UploadDebugInfo) => void): Promise<void> => {
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
          debugCb?.({ phase: 'upload_tus', message: 'TUS upload error', details: error });
          reject(new Error('大容量ファイルのアップロードに失敗しました'));
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setProgress(percentage);
        },
        onSuccess: () => {
          console.log('TUS アップロード完了');
          debugCb?.({ phase: 'upload_tus', message: 'TUS upload success' });
          resolve();
        },
      });

      upload.start();
    });
  };

  // 直接アップロード（200MB以下）
  const uploadDirectly = async (uploadURL: string, file: File, debugCb?: (info: UploadDebugInfo) => void): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      const started = Date.now();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          setProgress(percentage);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          debugCb?.({ phase: 'upload_direct', message: 'Direct upload success', details: { status: xhr.status, elapsedMs: Date.now() - started } });
          resolve();
        } else {
          debugCb?.({ phase: 'upload_direct', message: 'Direct upload HTTP error', details: { status: xhr.status, response: xhr.responseText } });
          reject(new Error('アップロードに失敗しました'));
        }
      });

      xhr.addEventListener('error', () => {
        debugCb?.({ phase: 'upload_direct', message: 'Direct upload network error' });
        reject(new Error('ネットワークエラーが発生しました'));
      });

      xhr.addEventListener('abort', () => {
        debugCb?.({ phase: 'upload_direct', message: 'Direct upload aborted' });
        reject(new Error('アップロードが中断されました'));
      });

      try {
        xhr.open('POST', uploadURL);
      } catch (e) {
        debugCb?.({ phase: 'upload_direct', message: 'Failed to open XHR', details: e });
        reject(new Error('アップロード初期化に失敗しました'));
        return;
      }

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
