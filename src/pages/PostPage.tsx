import React, { useState, useRef } from 'react';
import { Upload, X, Play, CheckCircle, Video, AlertCircle, Crown, Music, Mic, ArrowLeft, Shield, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useSubmissionCooldown } from '../hooks/useSubmissionCooldown';
import { trackBeatNexusEvents } from '../utils/analytics';

// Maximum file size in bytes (120MB - 高画質対応)
const MAX_FILE_SIZE = 120 * 1024 * 1024;

// 🆕 メモリ制限による処理可能サイズ（500MB以上は危険）
const SAFE_PROCESSING_SIZE = 500 * 1024 * 1024;

// 🆕 段階的な圧縮設定（高画質・高音質対応）
const getCompressionSettings = (fileSizeMB: number) => {
  if (fileSizeMB > 1000) {
    // 1GB以上: 強めの圧縮（それでも音質は保持）
    return {
      videoBitsPerSecond: 1500000, // 1.5Mbps - 画質向上
      audioBitsPerSecond: 192000,  // 192kbps - 高音質維持
      frameRate: 24,               // 24fps - スムーズな動き
      targetRatio: 0.12            // 12%まで圧縮（緩和）
    };
  } else if (fileSizeMB > 500) {
    // 500MB-1GB: 中程度の圧縮
    return {
      videoBitsPerSecond: 2000000, // 2Mbps - さらに画質向上
      audioBitsPerSecond: 256000,  // 256kbps - 高音質
      frameRate: 30,               // 30fps - より滑らか
      targetRatio: 0.20            // 20%まで圧縮
    };
  } else if (fileSizeMB > 200) {
    // 200-500MB: 軽い圧縮
    return {
      videoBitsPerSecond: 2500000, // 2.5Mbps - 高画質
      audioBitsPerSecond: 320000,  // 320kbps - 非常に高音質
      frameRate: 30,               // 30fps
      targetRatio: 0.35            // 35%まで圧縮（大幅緩和）
    };
  } else {
    // 200MB以下: 最軽量圧縮
    return {
      videoBitsPerSecond: 3000000, // 3Mbps - 最高画質
      audioBitsPerSecond: 320000,  // 320kbps - 最高音質維持
      frameRate: 30,               // 30fps
      targetRatio: 0.8             // 80%まで圧縮（ほぼ元サイズ）
    };
  }
};

// Function to get video duration
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    // 🆕 メモリ制限チェック
    const fileSizeMB = file.size / 1024 / 1024;
    if (file.size > SAFE_PROCESSING_SIZE) {
      reject(new Error(`ファイルサイズが大きすぎます（${fileSizeMB.toFixed(1)}MB）。500MB以下のファイルをお使いください。`));
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = (event) => {
      console.error('Video loading error:', event);
      window.URL.revokeObjectURL(video.src);
      reject(new Error('動画ファイルの読み込みに失敗しました'));
    };
    
    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      console.error('Error creating object URL:', error);
      reject(new Error('動画ファイルの処理に失敗しました'));
    }
  });
};

// Function to check if video duration is within allowed range
const isValidDuration = (duration: number, format: string): boolean => {
  switch (format) {
    case 'MAIN_BATTLE':
      return duration >= 60 && duration <= 120;
    case 'MINI_BATTLE':
      return duration >= 30 && duration <= 59;
    case 'THEME_CHALLENGE':
      return duration >= 30 && duration <= 120;
    default:
      return duration <= 120;
  }
};

// Function to get duration error message
const getDurationErrorMessage = (duration: number, format: string, t: (key: string, params?: any) => string): string => {
  switch (format) {
    case 'MAIN_BATTLE':
      if (duration < 60) {
        return t('postPage.errors.mainBattleTooShort', { duration: Math.round(duration), required: '60-120' });
      } else if (duration > 120) {
        return t('postPage.errors.mainBattleTooLong', { duration: Math.round(duration), required: '60-120' });
      }
      break;
    case 'MINI_BATTLE':
      if (duration < 30) {
        return t('postPage.errors.miniBattleTooShort', { duration: Math.round(duration), required: '30-59' });
      } else if (duration > 59) {
        return t('postPage.errors.miniBattleTooLong', { duration: Math.round(duration), required: '30-59' });
      }
      break;
    case 'THEME_CHALLENGE':
      if (duration < 30) {
        return t('postPage.errors.themeTooShort', { duration: Math.round(duration), required: '30-120' });
      } else if (duration > 120) {
        return t('postPage.errors.themeTooLong', { duration: Math.round(duration), required: '30-120' });
      }
      break;
  }
  return t('postPage.errors.invalidDuration');
};

// Function to compress video with audio preservation (direct re-encoding)
const compressVideoAuto = (
  file: File, 
  targetSizeMB: number = 120,
  onProgress?: (progress: number, stage: string) => void,
  t?: (key: string, params?: any) => string
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const fileSizeMB = file.size / 1024 / 1024;
    
    // 🆕 メモリ安全性チェック
    if (file.size > SAFE_PROCESSING_SIZE) {
      reject(new Error(
        t ? t('postPage.errors.fileTooLargeForProcessing', { size: fileSizeMB.toFixed(1) }) 
          : `ファイルサイズ（${fileSizeMB.toFixed(1)}MB）が大きすぎて処理できません。500MB以下のファイルをお使いください。`
      ));
      return;
    }

    onProgress?.(5, t ? t('postPage.processing.checkingMemory') : 'Checking memory...');
    
    // 🆕 段階的圧縮設定の適用
    const compressionSettings = getCompressionSettings(fileSizeMB);
    
    onProgress?.(10, t ? t('postPage.processing.loadingVideo') : 'Loading video...');
    
    // より簡単で確実な方法：動画ファイルを直接MediaRecorderで再エンコード
    const video = document.createElement('video');
    video.muted = true; // 圧縮中の音声再生を防ぐ（録画には影響しない）
    video.controls = false;
    video.playsInline = true;
    
    // 🆕 タイムアウト設定（10分）
    const timeoutId = setTimeout(() => {
      video.removeAttribute('src');
      reject(new Error(
        t ? t('postPage.errors.compressionTimeout') 
          : '圧縮処理がタイムアウトしました。ファイルサイズを小さくしてから再試行してください。'
      ));
    }, 10 * 60 * 1000); // 10分
    
    video.onloadedmetadata = () => {
      try {
        const duration = video.duration;
        const originalSizeMB = file.size / 1024 / 1024;
        
        onProgress?.(30, t ? t('postPage.processing.calculatingCompression') : 'Calculating compression settings...');
        
        // 🆕 改善された圧縮率計算
        const targetRatio = Math.min(targetSizeMB / originalSizeMB, compressionSettings.targetRatio);
        
        onProgress?.(40, t ? t('postPage.compression.compressionRatio', { ratio: Math.round(targetRatio * 100) }) : `Compression ratio: ${Math.round(targetRatio * 100)}%`);
        
        // 🎵 音声品質優先のMIMEタイプを確認（ビートボックス用高音質設定）
        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          // VP9 + Opus: 最高品質の組み合わせ（音質重視）
          mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          // VP8 + Opus: 高音質確保
          mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          // フォールバック
          mimeType = 'video/webm';
        }
        
        onProgress?.(50, t ? t('postPage.compression.format', { format: mimeType }) : `Format: ${mimeType}`);
        
        // HTMLVideoElementから直接ストリームを取得（音声付き）
        const videoElement = video as HTMLVideoElement & { captureStream?: (frameRate?: number) => MediaStream };
        if (!videoElement.captureStream) {
          clearTimeout(timeoutId);
          throw new Error(t ? t('postPage.errors.unsupportedBrowser') : 'This feature is not supported in your browser');
        }
        
        // 🆕 フレームレートを動的に調整
        const stream = videoElement.captureStream(compressionSettings.frameRate);
        
        onProgress?.(60, t ? t('postPage.processing.preparingStream') : 'Preparing stream...');
        
        const chunks: BlobPart[] = [];
        // 🆕 改善された MediaRecorder 設定
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: mimeType,
          videoBitsPerSecond: compressionSettings.videoBitsPerSecond,
          audioBitsPerSecond: compressionSettings.audioBitsPerSecond
        });
        
        onProgress?.(70, t ? t('postPage.processing.startingRecording') : 'Starting recording...');
        
        // 🆕 チャンクサイズ制限でメモリ使用量をコントロール
        let totalChunkSize = 0;
        const MAX_CHUNK_SIZE = 100 * 1024 * 1024; // 100MB制限
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            totalChunkSize += event.data.size;
            
            // メモリ制限チェック
            if (totalChunkSize > MAX_CHUNK_SIZE && chunks.length > 50) {
              console.warn('Chunk size limit reached, finalizing...');
              mediaRecorder.stop();
              return;
            }
            
            chunks.push(event.data);
          }
        };
        
        mediaRecorder.onstop = () => {
          clearTimeout(timeoutId);
          onProgress?.(95, t ? t('postPage.compression.finalizing') : 'Finalizing...');
          
          try {
            const compressedBlob = new Blob(chunks, { type: mimeType });
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const extension = 'webm';
            const compressedFile = new File(
              [compressedBlob], 
              `${baseName}_compressed.${extension}`, 
              { type: mimeType }
            );
            
            // 🆕 圧縮結果の検証
            const finalSizeMB = compressedFile.size / 1024 / 1024;
            console.log(`Compression completed: ${originalSizeMB.toFixed(1)}MB → ${finalSizeMB.toFixed(1)}MB (${Math.round((finalSizeMB/originalSizeMB)*100)}%)`);
            
            onProgress?.(100, t ? t('postPage.processing.complete') : 'Complete');
            resolve(compressedFile);
          } catch (error) {
            console.error('Error creating compressed file:', error);
            reject(new Error(t ? t('postPage.errors.compressionFinalizationFailed') : '圧縮ファイルの作成に失敗しました'));
          }
        };
        
        mediaRecorder.onerror = (event) => {
          clearTimeout(timeoutId);
          console.error('MediaRecorder error:', event);
          reject(new Error(t ? t('postPage.errors.recordingFailed') : 'Error occurred during recording'));
        };
        
        // プログレス追跡用
        let startTime = 0;
        
        video.ontimeupdate = () => {
          if (startTime === 0) startTime = performance.now();
          
          const progress = Math.min((video.currentTime / duration) * 20 + 70, 90);
          const elapsedTime = (performance.now() - startTime) / 1000;
          const estimatedTotal = (elapsedTime / video.currentTime) * duration;
          const remaining = Math.max(estimatedTotal - elapsedTime, 0);
          
          onProgress?.(progress, t ? t('postPage.processing.remaining', { seconds: Math.round(remaining) }) : `Recording... Remaining ~${Math.round(remaining)}s`);
        };
        
        video.onended = () => {
          onProgress?.(90, t ? t('postPage.processing.completingRecording') : 'Completing recording...');
          mediaRecorder.stop();
        };
        
        // 🆕 定期的なチャンク出力でメモリ使用量を抑制
        mediaRecorder.start(5000); // 5秒ごとにチャンクを出力
        
        // 動画再生開始（音声付きで録画される）
        video.currentTime = 0;
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          playPromise.catch((playError) => {
            clearTimeout(timeoutId);
            console.error('Video play error:', playError);
            // 自動再生が失敗した場合の対処
            reject(new Error(t ? t('postPage.errors.playbackFailed') : 'Failed to play video. Please check your browser settings.'));
          });
        }
        
      } catch (error) {
        clearTimeout(timeoutId);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        reject(new Error(t ? t('postPage.errors.processingError') + `: ${errorMessage}` : `Processing error: ${errorMessage}`));
      }
    };
    
    video.onerror = (event) => {
      clearTimeout(timeoutId);
      console.error('Video loading error:', event);
      reject(new Error(t ? t('postPage.errors.videoLoadFailed') : 'Failed to load video file'));
    };
    
    try {
      video.src = URL.createObjectURL(file);
      video.load();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error setting video source:', error);
      reject(new Error(t ? t('postPage.errors.videoLoadFailed') : 'Failed to load video file'));
    }
  });
};

// Function to provide compression suggestions
const getCompressionSuggestions = (fileSize: number) => {
  const sizeMB = fileSize / 1024 / 1024;
  
  if (sizeMB > 1000) {
    // 1GB以上: 極めて危険
    return {
      level: 'critical',
      message: '⚠️ ファイルサイズが極めて大きいです（{{size}}GB）。このサイズでは処理できません。',
      suggestions: [
        '【推奨】スマホ設定を「HD (720p)」以下に変更して撮り直し',
        '動画の長さを60-90秒以内に短縮',
        '動画編集アプリで大幅に圧縮',
        '別のデバイスで録画を検討'
      ]
    };
  } else if (sizeMB > 500) {
    // 500MB-1GB: 危険
    return {
      level: 'high',
      message: '⚠️ ファイルサイズが非常に大きいです（{{size}}MB）。自動圧縮は試せますが、失敗する可能性があります。',
      suggestions: [
        '【推奨】スマホ設定を「フルHD (1080p)」以下に変更して撮り直し',
        '動画の長さを短縮（60-90秒程度）',
        '品質設定を「標準」に変更',
        '自動圧縮を試してみる（処理に時間がかかる場合があります）'
      ]
    };
  } else if (sizeMB > 150) {
    // 150-500MB: 要注意
    return {
      level: 'medium-high',
      message: 'ファイルサイズが大きめです（{{size}}MB）。自動圧縮を推奨します。',
      suggestions: [
        '自動圧縮機能を使用（推奨）',
        'スマホ設定で「4K」を「フルHD」に変更',
        '動画の長さを短縮（60-90秒程度）',
        '品質設定を「標準」に変更'
      ]
    };
  } else if (sizeMB > 120) {
    // 120-150MB: 軽度の制限超過
    return {
      level: 'medium', 
      message: 'ファイルサイズが制限を超えています（{{size}}MB）。以下の方法で削減してください。',
      suggestions: [
        '自動圧縮機能を使用（推奨）',
        '動画の長さを短縮',
        'スマホの動画品質設定を下げる',
        '動画編集アプリで品質を下げて再出力'
      ]
    };
  }
  
  return null;
};

const PostPage: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const battleFormat = 'MAIN_BATTLE'; // Fixed to MAIN_BATTLE
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [acceptedFacePolicy, setAcceptedFacePolicy] = useState(false);
  const [acceptedContent, setAcceptedContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompressionOption, setShowCompressionOption] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [showAutoCompression, setShowAutoCompression] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { canSubmit, remainingTime, cooldownInfo, isLoading: cooldownLoading, refreshCooldown } = useSubmissionCooldown();

  // Redirect if not authenticated
  if (!user) {
    navigate('/');
    return null;
  }

  const validateFile = (file: File, duration?: number): boolean => {
    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      setError(t('postPage.errors.fileTooBig', { current: (file.size / 1024 / 1024).toFixed(1) }));
      setShowCompressionOption(true);
      return false;
    }
    
    // 動画の長さチェック（durationが提供されている場合）
    if (duration !== undefined && !isValidDuration(duration, battleFormat)) {
      setError(getDurationErrorMessage(duration, battleFormat, t));
      setShowCompressionOption(false);
      return false;
    }
    
    setError(null);
    setShowCompressionOption(false);
    return true;
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file && file.type.startsWith('video/')) {
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingStage(t('postPage.processing.analyzing_video'));
      setError(null);
      setShowCompressionOption(false);
      setShowAutoCompression(false);
      
      try {
        // 動画の長さを取得
        setProcessingProgress(50);
        setProcessingStage(t('postPage.processing.checkingDuration'));
        const duration = await getVideoDuration(file);
        setVideoDuration(duration);
        
        // 動画の長さをチェック
        setProcessingProgress(70);
        const isValidLength = isValidDuration(duration, battleFormat);
        const isValidSize = file.size <= MAX_FILE_SIZE;
        
        // 動画の長さが条件に合わない場合は処理を停止
        if (!isValidLength) {
          setError(getDurationErrorMessage(duration, battleFormat, t));
          setShowCompressionOption(false);
          setShowAutoCompression(false);
          setIsProcessing(false);
          setProcessingProgress(0);
          setProcessingStage('');
          return;
        }
        
        // プレビューを設定（条件に合う場合のみ）
        setProcessingProgress(80);
        setProcessingStage(t('postPage.processing.preparingPreview'));
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        setStep('preview');
        
        // ファイルサイズをチェック
        setProcessingProgress(100);
        setProcessingStage(t('postPage.processing.complete'));
        
        if (!isValidSize) {
          // 規定時間内だがサイズが大きい場合 → 自動圧縮を提案
          setShowAutoCompression(true);
        }
      } catch (err) {
        setError(t('postPage.errors.videoProcessingFailed'));
      } finally {
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingProgress(0);
          setProcessingStage('');
        }, 500);
      }
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    
    if (file && file.type.startsWith('video/')) {
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingStage(t('postPage.processing.analyzing_video'));
      setError(null);
      setShowCompressionOption(false);
      setShowAutoCompression(false);
      
      try {
        // 動画の長さを取得
        setProcessingProgress(50);
        setProcessingStage(t('postPage.processing.checkingDuration'));
        const duration = await getVideoDuration(file);
        setVideoDuration(duration);
        
        // 動画の長さをチェック
        setProcessingProgress(70);
        const isValidLength = isValidDuration(duration, battleFormat);
        const isValidSize = file.size <= MAX_FILE_SIZE;
        
        // 動画の長さが条件に合わない場合は処理を停止
        if (!isValidLength) {
          setError(getDurationErrorMessage(duration, battleFormat, t));
          setShowCompressionOption(false);
          setShowAutoCompression(false);
          setIsProcessing(false);
          setProcessingProgress(0);
          setProcessingStage('');
          return;
        }
        
        // プレビューを設定（条件に合う場合のみ）
        setProcessingProgress(80);
        setProcessingStage(t('postPage.processing.preparingPreview'));
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        setStep('preview');
        
        // ファイルサイズをチェック
        setProcessingProgress(100);
        setProcessingStage(t('postPage.processing.complete'));
        
        if (!isValidSize) {
          // 規定時間内だがサイズが大きい場合 → 自動圧縮を提案
          setShowAutoCompression(true);
        }
      } catch (err) {
        setError(t('postPage.errors.videoProcessingFailed'));
      } finally {
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingProgress(0);
          setProcessingStage('');
        }, 500);
      }
    }
  };
  
  const handleCompression = async (action: string) => {
    if (!videoFile) return;
    
    const suggestions = getCompressionSuggestions(videoFile.size);
    
    if (action === 'retry') {
      // ユーザーに動画を撮り直してもらう
      setShowCompressionOption(false);
      setError(t('postPage.errors.retakeVideo'));
      handleRemoveVideo();
    } else if (action === 'proceed') {
      // 制限を一時的に緩和して継続（テスト用）
      setShowCompressionOption(false);
      setError(null);
    }
  };

  const handleAutoCompression = async (action: 'compress' | 'skip') => {
    if (!videoFile) return;
    
    if (action === 'compress') {
      setIsProcessing(true);
      setProcessingProgress(0);
      setProcessingStage(t('postPage.processing.compressionStarting'));
      setShowAutoCompression(false);
      setError(null);
      
      try {
        const compressedFile = await compressVideoAuto(videoFile, 120, (progress, stage) => {
          setProcessingProgress(progress);
          setProcessingStage(stage);
        }, t);
        
        // 圧縮結果をチェック
        if (compressedFile.size <= MAX_FILE_SIZE) {
          // 成功: 圧縮されたファイルに置き換え
          setVideoFile(compressedFile);
          
          // プレビューURLを更新
          if (videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl);
          }
          const newUrl = URL.createObjectURL(compressedFile);
          setVideoPreviewUrl(newUrl);
          
          setError(null);
        } else {
          // まだ大きい場合
          setError(t('postPage.errors.fileSizeStillLarge', { size: (compressedFile.size / 1024 / 1024).toFixed(1) }));
          setShowAutoCompression(true);
        }
      } catch (err) {
        console.error('Compression error:', err);
        setError(t('postPage.errors.compressionFailed'));
        setShowAutoCompression(true);
      } finally {
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingProgress(0);
          setProcessingStage('');
        }, 1000);
      }
    } else if (action === 'skip') {
      // スキップして通常の提案を表示
      setShowAutoCompression(false);
      setShowCompressionOption(true);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !acceptedGuidelines || !acceptedFacePolicy || !acceptedContent) return;
    
    // 24時間制限チェック
    if (!canSubmit) {
      setError(cooldownInfo?.message || '24時間以内に投稿できるのは1本までです。');
      return;
    }
    
    // Double-check file size before upload
    if (videoFile.size > MAX_FILE_SIZE) {
      setError(t('postPage.errors.uploadTooLarge', { size: (videoFile.size / 1024 / 1024).toFixed(1) }));
      setShowCompressionOption(true);
      return;
    }
    
    // Double-check video duration before upload
    if (videoDuration !== null && !isValidDuration(videoDuration, battleFormat)) {
      setError(getDurationErrorMessage(videoDuration, battleFormat, t));
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Upload video to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      console.log('📤 Uploading video:', {
        filePath,
        fileSize: videoFile.size,
        fileType: videoFile.type,
        fileName: videoFile.name
      });
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, videoFile);
      
      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`動画のアップロードに失敗しました: ${uploadError.message}`);
      }

      // Get video URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // Create submission record with cooldown check
      const { data: submissionResult, error: submissionError } = await supabase
        .rpc('create_submission_with_cooldown_check', {
          p_user_id: user.id,
          p_video_url: publicUrl,
          p_battle_format: battleFormat
        });

      if (submissionError) {
        console.error('❌ Submission creation error:', submissionError);
        throw new Error(`投稿作成に失敗しました: ${submissionError.message}`);
      }

      // Check if submission creation was successful
      if (!submissionResult.success) {
        if (submissionResult.error === 'cooldown_active') {
          // Update cooldown info and show error
          refreshCooldown();
          throw new Error(submissionResult.message || '24時間以内に投稿できるのは1本までです');
        }
        throw new Error(submissionResult.message || '投稿作成に失敗しました');
      }

      const submissionId = submissionResult.submission_id;

      // Call the webhook to trigger matchmaking
      console.log('Calling matchmaking webhook...');
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submission-webhook`;
      console.log('Webhook URL:', webhookUrl);
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_id: submissionId
        })
      });

      console.log('Webhook response status:', webhookResponse.status);
      console.log('Webhook response headers:', Object.fromEntries(webhookResponse.headers.entries()));

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error('Webhook failed with status:', webhookResponse.status);
        console.error('Webhook error response:', errorText);
        
        let errorMessage = `Webhook call failed (${webhookResponse.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.error_details) {
            console.error('Detailed error:', errorData.error_details);
            errorMessage += `\n詳細: ${errorData.error_details.name || 'Unknown'}`;
          }
        } catch {
          errorMessage += `\nレスポンス: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const webhookResult = await webhookResponse.json();
      console.log('Webhook result:', webhookResult);
      
      // Check for both old and new response formats
      const isSuccess = webhookResult.success === true || 
                       (webhookResult.message && webhookResult.battle_id) ||
                       (webhookResult.message && webhookResult.waiting);

      if (!isSuccess) {
        const errorDetails = webhookResult.error_details 
          ? `\n詳細: ${JSON.stringify(webhookResult.error_details, null, 2)}`
          : '';
        throw new Error((webhookResult.error || 'Matchmaking failed') + errorDetails);
      }

      // Show different messages based on whether a match was found
      if (webhookResult.waiting || webhookResult.message?.includes('waiting')) {
        console.log('No match found, submission is waiting for opponent');
        // Still show success, but with waiting message
      } else if (webhookResult.battle_id || webhookResult.message?.includes('Battle created')) {
        console.log('Match found and battle created:', webhookResult.battle_id);
      }


      

      // 投稿成功後にクールダウン情報を更新
      refreshCooldown();

      // Track video submission event
      trackBeatNexusEvents.videoSubmit(battleFormat);

      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(null);
    setStep('upload');
    setError(null);
    setShowCompressionOption(false);
    setShowAutoCompression(false);
    setIsProcessing(false);
    setProcessingProgress(0);
    setProcessingStage('');
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-950 py-6 sm:py-10">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 sm:mb-8 text-gray-400 hover:text-white"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          {t('postPage.backButton')}
        </Button>

        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="relative">
            {/* 背景のグラデーション効果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-3xl transform -translate-y-4"></div>
            
            <div className="relative">
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">
                {t('postPage.title')}
              </h1>
              <p className="text-gray-400 text-center">
                {t('postPage.subtitle')}
              </p>
            </div>
          </div>
        </div>
        
        <Card className="max-w-2xl mx-auto bg-gray-900 border border-gray-800">
          <div className="p-6 sm:p-8">


            {step === 'upload' && (
              <>
                {/* 投稿制限情報カード */}
                {!canSubmit && cooldownInfo && (
                  <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-orange-400" />
                      <h3 className="font-medium text-white">{t('postPage.cooldown.title', '投稿制限中')}</h3>
                    </div>
                    <p className="text-sm text-orange-200 mb-3">
                      {cooldownInfo.message}
                    </p>
                    {remainingTime && (
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{t('postPage.cooldown.nextSubmission', '次回投稿可能まで')}</span>
                          <span className="text-orange-400 font-medium">{remainingTime}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{t('postPage.errors.problemOccurred')}</h4>
                        <div className="text-sm text-red-200 whitespace-pre-line mb-4">{error}</div>
                        
                        {(error.includes('秒') || error.includes('seconds')) && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setError(null);
                                triggerFileInput();
                              }}
                              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                            >
                              {t('postPage.errors.selectDifferentVideo', '別の動画を選択')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <h3 className="font-medium text-white">{t('postPage.processing.title')}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{processingStage}</span>
                        <span className="text-blue-400 font-medium">{Math.round(processingProgress)}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out relative"
                          style={{ width: `${processingProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-400">
                        {processingProgress < 30 
                          ? t('postPage.processing.analyzing')
                          : processingProgress < 90 
                          ? t('postPage.processing.optimizing')
                          : t('postPage.processing.finalizing')}
                      </p>
                    </div>
                  </div>
                )}

                <div 
                  className={`border-2 border-dashed rounded-xl transition-all duration-300 ${
                    isDragging 
                      ? 'border-cyan-400 bg-cyan-500/10 scale-105' 
                      : 'border-gray-700 hover:border-cyan-500/50 hover:bg-gray-800/30'
                  } ${!canSubmit ? 'opacity-50 pointer-events-none' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    disabled={!canSubmit}
                  />
                  
                  <div className="p-6 sm:p-8 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center shadow-lg border border-gray-600">
                      <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-cyan-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                      {t('postPage.upload.dropHere')}
                    </h3>
                    <p className="text-gray-400 mb-4 text-sm sm:text-base">
                      {t('postPage.upload.orBrowse')}
                    </p>
                    <Button
                      variant="outline"
                      onClick={triggerFileInput}
                      disabled={!canSubmit}
                      className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('postPage.upload.selectVideo')}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl border border-yellow-500/30 backdrop-blur-sm mb-4">
                      <Crown className="h-5 w-5 text-yellow-400" />
                      <h3 className="text-lg font-semibold text-yellow-100">{t('postPage.guidelines.title')}</h3>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-cyan-500/30 transition-colors">
                      <Music className="h-5 w-5 text-cyan-400 mb-2" />
                      <h4 className="font-medium text-white mb-1 text-sm sm:text-base">{t('postPage.guidelines.audioQuality.title')}</h4>
                      <p className="text-xs sm:text-sm text-gray-400">
                        {t('postPage.guidelines.audioQuality.description')}
                      </p>
                    </div>
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-purple-500/30 transition-colors">
                      <Video className="h-5 w-5 text-purple-400 mb-2" />
                      <h4 className="font-medium text-white mb-1 text-sm sm:text-base">{t('postPage.guidelines.videoLengthSize.title')}</h4>
                      <p className="text-xs sm:text-sm text-gray-400">
                        {t('postPage.guidelines.videoLengthSize.description')}
                      </p>
                    </div>
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-yellow-500/30 transition-colors">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mb-2" />
                      <h4 className="font-medium text-white mb-1 text-sm sm:text-base">{t('postPage.guidelines.facePolicy.title')}</h4>
                      <p className="text-xs sm:text-sm text-gray-400">
                        {t('postPage.guidelines.facePolicy.description')}
                      </p>
                    </div>
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-red-500/30 hover:border-red-500/50 transition-colors">
                      <Shield className="h-5 w-5 text-red-400 mb-2" />
                      <h4 className="font-medium text-white mb-1 text-sm sm:text-base">{t('postPage.guidelines.lipSyncPolicy.title')}</h4>
                      <p className="text-xs sm:text-sm text-gray-400">
                        {t('postPage.guidelines.lipSyncPolicy.description')}
                      </p>
                    </div>
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-green-500/30 hover:border-green-500/50 transition-colors">
                      <Settings className="h-5 w-5 text-green-400 mb-2" />
                      <h4 className="font-medium text-white mb-1 text-sm sm:text-base">{t('postPage.guidelines.allowedEffects.title')}</h4>
                      <p className="text-xs sm:text-sm text-gray-400">
                        {t('postPage.guidelines.allowedEffects.description')}
                      </p>
                    </div>
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-red-500/30 hover:border-red-500/50 transition-colors">
                      <X className="h-5 w-5 text-red-400 mb-2" />
                      <h4 className="font-medium text-white mb-1 text-sm sm:text-base">{t('postPage.guidelines.notAllowed.title')}</h4>
                      <p className="text-xs sm:text-sm text-gray-400">
                        {t('postPage.guidelines.notAllowed.description')}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 'preview' && videoPreviewUrl && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('postPage.preview.title')}
                  </label>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      src={videoPreviewUrl}
                      className="w-full h-full object-contain"
                      controls
                    />
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="absolute top-2 right-2 bg-gray-900/70 text-white p-1.5 rounded-lg hover:bg-gray-900"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex items-center mt-2 text-sm text-gray-400">
                    <Video className="h-4 w-4 mr-2" />
                    {videoFile?.name} ({Math.round((videoFile?.size || 0) / 1024 / 1024 * 10) / 10} MB)
                  </div>
                </div>



                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{t('postPage.errors.problemOccurred')}</h4>
                        <div className="text-sm text-red-200 whitespace-pre-line mb-4">{error}</div>
                        
                        {(error.includes('秒') || error.includes('seconds')) && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setError(null);
                                // バトル形式選択にフォーカス
                                document.querySelector('select')?.focus();
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                            >
                              {t('postPage.errors.changeBattleFormat', 'バトル形式を変更')}
                            </button>
                            <button
                              onClick={() => {
                                setError(null);
                                triggerFileInput();
                              }}
                              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                            >
                              {t('postPage.errors.selectDifferentVideo', '別の動画を選択')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <h3 className="font-medium text-white">{t('postPage.processing.title')}</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{processingStage}</span>
                        <span className="text-blue-400 font-medium">{Math.round(processingProgress)}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out relative"
                          style={{ width: `${processingProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-400">
                        {processingProgress < 30 
                          ? t('postPage.processing.analyzing')
                          : processingProgress < 90 
                          ? t('postPage.processing.optimizing')
                          : t('postPage.processing.finalizing')}
                      </p>
                    </div>
                  </div>
                )}

                {showAutoCompression && !isProcessing && videoFile && videoDuration && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <h3 className="font-medium text-white">{t('postPage.compression.autoAvailable')}</h3>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <span className="text-gray-400">{t('postPage.compression.videoDuration')}</span>
                          <div className="font-medium text-green-400">
                            {t('postPage.compression.durationOk', { duration: Math.round(videoDuration) })}
                          </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <span className="text-gray-400">{t('postPage.compression.fileSize')}</span>
                          <div className="font-medium text-orange-400">
                            {t('postPage.compression.fileSizeLarge', { size: (videoFile.size / 1024 / 1024).toFixed(1) })}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-300">
                        {t('postPage.compression.description')}
                      </p>
                      
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <h4 className="font-medium text-white mb-2 text-sm">{t('postPage.compression.autoAdjustments')}</h4>
                        <ul className="space-y-1 text-sm text-gray-300">
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            {t('postPage.compression.resolutionOptimization')}
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                            {t('postPage.compression.bitrateAdjustment')}
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                            {t('postPage.compression.audioQualityMaintained')}
                          </li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <Button
                        onClick={() => handleAutoCompression('compress')}
                        variant="primary"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <div className="text-center">
                          <div className="font-medium">{t('postPage.compression.autoCompress')}</div>
                          <div className="text-xs opacity-75">{t('postPage.compression.optimizeSize')}</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}

                {showCompressionOption && !isUploading && videoFile && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-orange-400" />
                      <h3 className="font-medium text-white">{t('postPage.compression.fileSizeTooLarge')}</h3>
                    </div>
                    
                    {(() => {
                      const suggestions = getCompressionSuggestions(videoFile.size);
                      if (!suggestions) return null;
                      
                      return (
                        <>
                          <p className="text-sm text-gray-300 mb-4">
                            {t('postPage.compression.currentFileSize', { size: (videoFile.size / 1024 / 1024).toFixed(1) })}
                          </p>
                          <p className="text-sm text-gray-300 mb-4">
                            {suggestions.message}
                          </p>
                          
                          <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                            <h4 className="font-medium text-white mb-2 text-sm">{t('postPage.compression.recommendedSolutions')}</h4>
                            <ul className="space-y-1">
                              {suggestions.suggestions.map((suggestion, index) => (
                                <li key={index} className="text-sm text-gray-300 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button
                              onClick={() => handleCompression('retry')}
                              variant="outline"
                              size="sm"
                              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                            >
                              <div className="text-center">
                                <div className="font-medium">{t('postPage.compression.retakeVideo')}</div>
                                <div className="text-xs opacity-75">{t('postPage.compression.recommended')}</div>
                              </div>
                            </Button>
                            <Button
                              onClick={() => handleCompression('proceed')}
                              variant="outline"
                              size="sm"
                              className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                            >
                              <div className="text-center">
                                <div className="font-medium">{t('postPage.compression.proceedAnyway')}</div>
                                <div className="text-xs opacity-75">{t('postPage.compression.forTesting')}</div>
                              </div>
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-medium text-white text-sm sm:text-base">
                      {t('postPage.submissionGuidelines.title')}
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-300 mb-6">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-1 flex-shrink-0" />
                      {t('postPage.submissionGuidelines.followFormatLength')}
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-1 flex-shrink-0" />
                      {t('postPage.submissionGuidelines.ensureAudioQuality')}
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400 mt-1 flex-shrink-0" />
                      {t('postPage.submissionGuidelines.faceOptional')}
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="h-4 w-4 text-red-400 mt-1 flex-shrink-0" />
                      {t('postPage.submissionGuidelines.noBackgroundMusic')}
                    </li>
                  </ul>

                  <div className="space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptedGuidelines}
                        onChange={(e) => setAcceptedGuidelines(e.target.checked)}
                        className="mt-1 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500/30 bg-gray-700"
                        required
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white">
                        {t('postPage.submissionGuidelines.agreeGuidelines')}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptedFacePolicy}
                        onChange={(e) => setAcceptedFacePolicy(e.target.checked)}
                        className="mt-1 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500/30 bg-gray-700"
                        required
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white">
                        {t('postPage.submissionGuidelines.understandFacePolicy')}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={acceptedContent}
                        onChange={(e) => setAcceptedContent(e.target.checked)}
                        className="mt-1 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500/30 bg-gray-700"
                        required
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white">
                        {t('postPage.submissionGuidelines.confirmOwnPerformance')}
                      </span>
                    </label>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveVideo}
                    className="flex-1 border-gray-700 text-gray-300 hover:text-white text-sm sm:text-base"
                  >
                    {t('postPage.buttons.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-sm sm:text-base"
                    isLoading={isUploading}
                    disabled={!acceptedGuidelines || !acceptedFacePolicy || !acceptedContent || isUploading || !canSubmit}
                    leftIcon={<Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                  >
                    {t('postPage.buttons.submitToBattlePool')}
                  </Button>
                </div>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center py-4 sm:py-8">
                <div className="relative mb-6">
                  {/* 背景のグラデーション効果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-cyan-500/20 blur-2xl"></div>
                  
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center shadow-lg border border-green-500/30">
                    <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-400" />
                  </div>
                </div>
                
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  {t('postPage.success.title')}
                </h2>
                <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
                  {t('postPage.success.description')}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/my-battles')}
                    className="border-gray-700 text-gray-300 hover:text-white text-sm sm:text-base"
                  >
                    {t('postPage.buttons.viewMyBattles')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setStep('upload')}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 text-sm sm:text-base"
                  >
                    {t('postPage.buttons.submitAnother')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PostPage;