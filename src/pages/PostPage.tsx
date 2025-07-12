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

// 🆕 メモリ制限による処理可能サイズ（2GB以下は処理可能）
const SAFE_PROCESSING_SIZE = 2 * 1024 * 1024 * 1024; // 2GB制限

// 🆕 改善された圧縮設定：目標サイズベースの動的調整（実際の動画時間を使用）
const getCompressionSettings = (fileSizeMB: number, actualDuration: number, targetSizeMB: number = 40) => {
  // 🎯 目標サイズ: 40MBを基準とする（30-50MBの範囲内）
  const TARGET_SIZE_MB = Math.max(30, Math.min(50, targetSizeMB));
  
  // 🎵 音質は常に高品質を維持（ビートボックス用）- 256kbps固定
  const AUDIO_BITRATE = 256000; // 256kbps固定（高音質）
  
  // 📊 ファイルサイズに応じた戦略
  if (fileSizeMB <= TARGET_SIZE_MB) {
    // 既に目標サイズ以下の場合：圧縮しない（品質劣化を避ける）
    return {
      videoBitsPerSecond: 5000000, // 5Mbps - 高品質維持
      audioBitsPerSecond: AUDIO_BITRATE,
      frameRate: 30,
      shouldCompress: false, // 圧縮不要フラグ
      targetSizeMB: fileSizeMB, // 元サイズを維持
      strategy: 'no-compression'
    };
  }
  
  // 🎯 実際の動画時間を使用した正確な計算
  const ACTUAL_DURATION = Math.max(30, Math.min(120, actualDuration)); // 30-120秒の範囲内
  const AUDIO_SIZE_MB = (ACTUAL_DURATION * AUDIO_BITRATE) / 8 / 1024 / 1024;
  const AVAILABLE_VIDEO_SIZE_MB = TARGET_SIZE_MB - AUDIO_SIZE_MB;
  const CALCULATED_VIDEO_BITRATE = (AVAILABLE_VIDEO_SIZE_MB * 8 * 1024 * 1024) / ACTUAL_DURATION;
  
  // 📈 ビットレートの範囲制限（品質とサイズのバランス）
  const MIN_VIDEO_BITRATE = 600000;  // 0.6Mbps - 最低品質保証（1GB+対応）
  const MAX_VIDEO_BITRATE = 3500000; // 3.5Mbps - 最高品質上限（安定性重視）
  
  const videoBitrate = Math.max(MIN_VIDEO_BITRATE, Math.min(MAX_VIDEO_BITRATE, CALCULATED_VIDEO_BITRATE));
  
  // 🎮 ファイルサイズに応じた追加調整（1GB+対応）
  let frameRate = 30;
  let strategy = 'balanced';
  
  if (fileSizeMB > 1024) {
    // 1GB以上: 最大圧縮（フレームレート大幅削減）
    frameRate = 20;
    strategy = 'maximum';
  } else if (fileSizeMB > 500) {
    // 500MB-1GB: 積極的圧縮（フレームレート削減）
    frameRate = 24;
    strategy = 'aggressive';
  } else if (fileSizeMB > 300) {
    // 300-500MB: 中程度の圧縮（フレームレート調整）
    frameRate = 25;
    strategy = 'heavy';
  } else if (fileSizeMB > 200) {
    // 200-300MB: 標準的な圧縮
    frameRate = 30;
    strategy = 'standard';
  } else {
    // 50-200MB: 軽い圧縮
    frameRate = 30;
    strategy: 'light';
  }
  
  return {
    videoBitsPerSecond: Math.round(videoBitrate),
    audioBitsPerSecond: AUDIO_BITRATE, // 🎵 256kbps固定を保証
    frameRate: frameRate,
    shouldCompress: true,
    targetSizeMB: TARGET_SIZE_MB,
    strategy: strategy,
    actualDuration: ACTUAL_DURATION // 🆕 実際の動画時間を記録
  };
};

// Function to get video duration
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const fileSizeMB = file.size / 1024 / 1024;
    
    // 🔧 プレビュー用の緩和されたメモリ制限チェック
    // プレビュー表示は重要なので、2GB以下は許可する
    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB制限
      reject(new Error(`ファイルサイズが大きすぎます（${fileSizeMB.toFixed(1)}MB）。2GB以下のファイルをお使いください。`));
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata'; // メタデータのみ読み込み（メモリ効率的）
    video.muted = true; // 音声を無効化（メモリ節約）
    
    // 🎯 大きなファイル用のタイムアウト設定
    const timeoutId = setTimeout(() => {
      video.removeAttribute('src');
      window.URL.revokeObjectURL(video.src);
      reject(new Error('動画の読み込みがタイムアウトしました。ファイルが大きすぎる可能性があります。'));
    }, 30000); // 30秒タイムアウト
    
    video.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      window.URL.revokeObjectURL(video.src);
      
      // 🔍 動画の基本情報をログ出力（デバッグ用）
      console.log(`Video loaded: ${fileSizeMB.toFixed(1)}MB, ${video.duration.toFixed(1)}s, ${video.videoWidth}x${video.videoHeight}`);
      
      resolve(video.duration);
    };
    
    video.onerror = (event) => {
      clearTimeout(timeoutId);
      console.error('Video loading error:', event);
      window.URL.revokeObjectURL(video.src);
      reject(new Error('動画ファイルの読み込みに失敗しました'));
    };
    
    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      clearTimeout(timeoutId);
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
  actualDuration: number, // 🆕 実際の動画時間を追加
  targetSizeMB: number = 40, // 🎯 デフォルトを40MBに変更
  onProgress?: (progress: number, stage: string) => void,
  t?: (key: string, params?: any) => string
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const fileSizeMB = file.size / 1024 / 1024;
    
    // 🆕 メモリ安全性チェック（2GB対応）
    if (file.size > SAFE_PROCESSING_SIZE) {
      reject(new Error(
        t ? t('postPage.errors.fileTooLargeForProcessing', { size: fileSizeMB.toFixed(1) }) 
          : `ファイルサイズ（${fileSizeMB.toFixed(1)}MB）が大きすぎて処理できません。2GB以下のファイルをお使いください。`
      ));
      return;
    }

    onProgress?.(5, t ? t('postPage.processing.checkingMemory') : 'Checking memory...');
    
    // 🆕 実際の動画時間を使用した改善された圧縮設定
    const compressionSettings = getCompressionSettings(fileSizeMB, actualDuration, targetSizeMB);
    
    // 🎯 圧縮が不要な場合は元ファイルをそのまま返す
    if (!compressionSettings.shouldCompress) {
      onProgress?.(100, t ? t('postPage.processing.noCompressionNeeded') : 'No compression needed - file size is optimal');
      
      // 元ファイルをそのまま返す（名前だけ変更）
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const extension = file.name.split('.').pop() || 'mp4';
      const optimizedFile = new File([file], `${baseName}_optimized.${extension}`, { type: file.type });
      
      setTimeout(() => resolve(optimizedFile), 500); // UIの整合性のため少し待つ
      return;
    }
    
    onProgress?.(10, t ? t('postPage.processing.loadingVideo') : 'Loading video...');
    
    // より簡単で確実な方法：動画ファイルを直接MediaRecorderで再エンコード
    const video = document.createElement('video');
    video.muted = true;
    video.controls = false;
    video.playsInline = true;
    
    // 🆕 タイムアウト設定（15分に延長）
    const timeoutId = setTimeout(() => {
      video.removeAttribute('src');
      reject(new Error(
        t ? t('postPage.errors.compressionTimeout') 
          : '圧縮処理がタイムアウトしました。ファイルサイズを小さくしてから再試行してください。'
      ));
    }, 15 * 60 * 1000); // 15分に延長
    
    video.onloadedmetadata = () => {
      try {
        const duration = video.duration;
        const originalSizeMB = file.size / 1024 / 1024;
        
        onProgress?.(30, t ? t('postPage.processing.calculatingCompression') : 'Calculating compression settings...');
        
        // 🎯 目標サイズベースの圧縮設定
        const targetSizeMB = compressionSettings.targetSizeMB;
        const compressionRatio = Math.round((targetSizeMB / originalSizeMB) * 100);
        
        // 🔧 実際の動画時間に基づく精密なビットレート計算
        const AUDIO_BITRATE = compressionSettings.audioBitsPerSecond;
        const AUDIO_SIZE_MB = (duration * AUDIO_BITRATE) / 8 / 1024 / 1024;
        const AVAILABLE_VIDEO_SIZE_MB = targetSizeMB - AUDIO_SIZE_MB;
        const PRECISE_VIDEO_BITRATE = Math.max(
          600000, // 最低600kbps
          Math.min(
            5000000, // 最高5Mbps
            (AVAILABLE_VIDEO_SIZE_MB * 8 * 1024 * 1024) / duration
          )
        );
        
        // 🎯 精密な設定を適用
        const finalSettings = {
          ...compressionSettings,
          videoBitsPerSecond: Math.round(PRECISE_VIDEO_BITRATE)
        };
        
        onProgress?.(40, t ? t('postPage.compression.targetSize', { 
          target: targetSizeMB.toFixed(1), 
          original: originalSizeMB.toFixed(1),
          strategy: compressionSettings.strategy 
        }) : `Target: ${targetSizeMB.toFixed(1)}MB (from ${originalSizeMB.toFixed(1)}MB) - ${compressionSettings.strategy}`);
        
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
        const stream = videoElement.captureStream(finalSettings.frameRate);
        
        onProgress?.(60, t ? t('postPage.processing.preparingStream') : 'Preparing stream...');
        
        const chunks: BlobPart[] = [];
        // 🆕 改善された MediaRecorder 設定
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: mimeType,
          videoBitsPerSecond: finalSettings.videoBitsPerSecond,
          audioBitsPerSecond: finalSettings.audioBitsPerSecond
        });
        
        onProgress?.(70, t ? t('postPage.processing.startingRecording') : 'Starting recording...');
        
        // 🔧 大きなファイル用のメモリ管理改善
        let totalChunkSize = 0;
        let isFinalizingEarly = false;
        
        // 🎯 動的なチャンクサイズ制限（ファイルサイズに応じて調整）
        const MAX_CHUNK_SIZE = fileSizeMB > 300 ? 200 * 1024 * 1024 : 150 * 1024 * 1024; // 300MB以上は200MB制限
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            totalChunkSize += event.data.size;
            chunks.push(event.data);
            
            // 🚨 重要: メモリ制限に達しても動画を完了させる
            if (totalChunkSize > MAX_CHUNK_SIZE && !isFinalizingEarly) {
              console.warn(`Large file processing: ${totalChunkSize / 1024 / 1024}MB chunks collected, continuing...`);
              isFinalizingEarly = true;
              // 動画を停止せずに続行（メモリ警告のみ）
            }
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
            
            // 🎯 最終サイズチェック
            if (finalSizeMB < 1) {
              // 1MB未満の場合は異常として処理
              console.error('Compression resulted in suspiciously small file:', finalSizeMB);
              reject(new Error(t ? t('postPage.errors.compressionAbnormallySmall') : '圧縮結果が異常に小さくなりました。元の動画に問題がある可能性があります。'));
              return;
            }
            
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
        
        // 🆕 大きなファイル用の最適化されたチャンク出力
        const chunkInterval = fileSizeMB > 300 ? 10000 : 5000; // 300MB以上は10秒間隔
        mediaRecorder.start(chunkInterval);
        
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
  } else if (sizeMB > 120) {
    // 120MB以上: 自動圧縮推奨
    return {
      level: 'medium-high',
      message: 'ファイルサイズが大きめです（{{size}}MB）。自動圧縮で30-50MBに最適化します。',
      suggestions: [
        '🎯 自動圧縮機能を使用（30-50MBに最適化）',
        '🎵 音質はそのまま、画質のみ調整されます',
        '⚡ 処理時間：約1-3分程度',
        '✨ 品質とサイズの最適なバランスを実現'
      ]
    };
  } else if (sizeMB > 50) {
    // 50-120MB: 軽度の最適化
    return {
      level: 'medium', 
      message: 'ファイルサイズは許容範囲内です（{{size}}MB）。さらに最適化することも可能です。',
      suggestions: [
        '🎯 自動圧縮で30-50MBに最適化（推奨）',
        '📱 アップロード時間の短縮',
        '💾 ストレージ容量の節約',
        '⏭️ そのまま投稿することも可能'
      ]
    };
  } else if (sizeMB > 30) {
    // 30-50MB: 最適サイズ
    return {
      level: 'optimal',
      message: '✅ ファイルサイズが最適です（{{size}}MB）。そのまま投稿できます。',
      suggestions: [
        '🎯 現在のサイズが理想的な範囲内です',
        '🎵 音質と画質のバランスが良好',
        '⚡ 高速アップロード可能',
        '✨ 圧縮は不要です'
      ]
    };
  }
  
  return null;
};

const PostPage: React.FC = () => {
  const [showCompressionOption, setShowCompressionOption] = useState(false);
  const [showAutoCompression, setShowAutoCompression] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoLoadingProgress, setVideoLoadingProgress] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const battleFormat = 'MAIN_BATTLE'; // Fixed to MAIN_BATTLE
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [acceptedFacePolicy, setAcceptedFacePolicy] = useState(false);
  const [acceptedContent, setAcceptedContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🆕 プレビュー読み込み重複防止用の状態
  const [previewLoadAttempts, setPreviewLoadAttempts] = useState(0);
  const [isPreviewInitialized, setIsPreviewInitialized] = useState(false);
  const [lastProcessedFile, setLastProcessedFile] = useState<File | null>(null);
  
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
  
  // 🆕 共通のファイル処理関数（重複を防ぐ）
  const processVideoFile = async (file: File) => {
    // 🔧 同じファイルの重複処理を防ぐ
    if (lastProcessedFile && 
        lastProcessedFile.name === file.name && 
        lastProcessedFile.size === file.size && 
        lastProcessedFile.lastModified === file.lastModified) {
      console.log('Same file already processed, skipping...');
      return;
    }
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStage(t('postPage.processing.analyzing_video'));
    setError(null);
    setShowCompressionOption(false);
    setShowAutoCompression(false);
    
    // 🔧 プレビュー状態を完全にリセット
    setIsVideoLoading(false);
    setVideoLoadingProgress(0);
    setIsVideoReady(false);
    setIsPreviewInitialized(false);
    setPreviewLoadAttempts(0);
    
    // 🔧 前のプレビューURLをクリーンアップ
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    
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
      setLastProcessedFile(file); // 🆕 処理済みファイルを記録
      
      // 🎯 動画ファイル形式の確認
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      console.log('Video file info:', {
        type: fileType,
        name: fileName,
        size: (file.size / 1024 / 1024).toFixed(1) + 'MB'
      });
      
      // 問題のある形式の警告
      if (fileType.includes('quicktime') || fileName.endsWith('.mov') || 
          fileType.includes('x-msvideo') || fileName.endsWith('.avi')) {
        console.warn('Potentially problematic video format detected:', fileType);
      }
      
      // 🔧 大きなファイル用の最適化されたプレビューURL作成
      try {
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        setStep('preview');
        
        // 🎯 大きなファイルの場合は警告を表示
        const fileSizeMB = file.size / 1024 / 1024;
        if (fileSizeMB > 300) {
          console.warn(`Large file preview: ${fileSizeMB.toFixed(1)}MB - Preview may take time to load`);
          // 🆕 大きなファイルの場合は読み込み状態を即座に設定
          setIsVideoLoading(true);
          setVideoLoadingProgress(10);
        }
      } catch (error) {
        console.error('Error creating preview URL:', error);
        setError('プレビューの作成に失敗しました。ファイルサイズが大きすぎる可能性があります。');
        setIsProcessing(false);
        setProcessingProgress(0);
        setProcessingStage('');
        return;
      }
      
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
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file && file.type.startsWith('video/')) {
      await processVideoFile(file);
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
      await processVideoFile(file);
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
        const compressedFile = await compressVideoAuto(videoFile, videoDuration || 90, 40, (progress: number, stage: string) => {
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
    
    // 🔧 動画読み込み状態をリセット
    setIsVideoLoading(false);
    setVideoLoadingProgress(0);
    setIsVideoReady(false);
    
    // 🆕 プレビュー関連の状態もリセット
    setIsPreviewInitialized(false);
    setPreviewLoadAttempts(0);
    setLastProcessedFile(null);
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
              <div className="text-center">
                <p className="text-gray-400 mb-3">
                  {t('postPage.subtitle')}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border border-purple-400/40">
                  <Video className="h-4 w-4 text-purple-300" />
                  <span className="text-purple-100 font-semibold text-sm">
                    {t('postPage.timeLimitEmphasis')}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-full border border-orange-400/40 mt-2">
                  <Video className="h-4 w-4 text-orange-300" />
                  <span className="text-orange-100 font-semibold text-sm">
                    {t('postPage.videoQualityWarning')}
                  </span>
                </div>
              </div>
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
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-5 border-2 border-purple-400/60 hover:border-purple-400/80 transition-all duration-300 shadow-lg shadow-purple-500/20 relative overflow-hidden">
                      {/* 強調用の背景効果 */}
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-l from-purple-400/30 to-transparent rounded-bl-full"></div>
                      <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-r from-pink-400/30 to-transparent rounded-tr-full"></div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <Video className="h-6 w-6 text-purple-300" />
                          <span className="px-2 py-1 bg-purple-500/40 text-purple-100 text-xs font-bold rounded-full">重要</span>
                        </div>
                        <h4 className="font-bold text-white mb-2 text-base sm:text-lg">{t('postPage.guidelines.videoLengthSize.title')}</h4>
                        <div className="bg-gray-900/60 rounded-lg p-3 border border-purple-400/30">
                          <p className="text-sm sm:text-base text-purple-100 font-medium leading-relaxed">
                            {t('postPage.guidelines.videoLengthSize.description')}
                          </p>
                        </div>
                      </div>
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
                      preload="metadata"
                      playsInline
                      muted={false}
                      crossOrigin="anonymous"
                      poster="" // 空のposterでブラウザのデフォルト動作を防ぐ
                      style={{
                        backgroundColor: '#000000',
                        minHeight: '200px' // 最小高さを確保
                      }}
                      onError={(e) => {
                        console.error('Preview video error:', e);
                        const target = e.target as HTMLVideoElement;
                        console.error('Video error details:', {
                          error: target.error,
                          networkState: target.networkState,
                          readyState: target.readyState,
                          currentSrc: target.currentSrc,
                          videoWidth: target.videoWidth,
                          videoHeight: target.videoHeight
                        });
                        const fileSizeMB = (videoFile?.size || 0) / 1024 / 1024;
                        if (fileSizeMB > 500) {
                          setError(`大きなファイル（${fileSizeMB.toFixed(1)}MB）のプレビューに失敗しました。動画は正常ですが、圧縮処理を推奨します。`);
                        } else {
                          setError('プレビューの表示に失敗しました。動画ファイルに問題がある可能性があります。');
                        }
                      }}
                      onLoadStart={() => {
                        // 🔧 重複読み込みを防ぐ
                        if (isPreviewInitialized) {
                          console.log('Preview already initialized, skipping load start...');
                          return;
                        }
                        
                        console.log('Preview loading started for file:', videoFile?.name);
                        setIsVideoLoading(true);
                        setIsVideoReady(false);
                        setVideoLoadingProgress(10);
                        setPreviewLoadAttempts(prev => prev + 1);
                        
                        // 🚫 3回以上の読み込み試行を防ぐ
                        if (previewLoadAttempts >= 3) {
                          console.warn('Too many preview load attempts, stopping...');
                          setError('プレビューの読み込みに複数回失敗しました。ファイルサイズが大きすぎる可能性があります。');
                          return;
                        }
                      }}
                      onLoadedMetadata={(e) => {
                        // 🔧 メタデータの重複読み込みを防ぐ
                        if (isPreviewInitialized) {
                          console.log('Metadata already processed, skipping...');
                          return;
                        }
                        
                        const target = e.target as HTMLVideoElement;
                        const fileSizeMB = (videoFile?.size || 0) / 1024 / 1024;
                        console.log(`Preview loaded successfully: ${fileSizeMB.toFixed(1)}MB`);
                        console.log('Video metadata:', {
                          duration: target.duration,
                          videoWidth: target.videoWidth,
                          videoHeight: target.videoHeight,
                          readyState: target.readyState,
                          networkState: target.networkState
                        });
                        
                        // 🔧 動画解像度が0の場合の対処
                        if (target.videoWidth === 0 || target.videoHeight === 0) {
                          console.warn('Video dimensions are 0 - attempting to fix...');
                          setError(`動画の解像度情報を取得できませんでした。ファイルの映像部分に問題がある可能性があります。\n\n対処法：\n1. 動画を別の形式（MP4）で保存し直してください\n2. 動画編集ソフトで再エンコードしてください\n3. ファイルサイズを小さくしてください`);
                          return;
                        }
                        
                        setVideoLoadingProgress(50);
                        setIsPreviewInitialized(true); // 🆕 初期化完了をマーク
                        
                        // 🎯 大きなファイルの場合、最初のフレームを読み込む（1回のみ）
                        if (fileSizeMB > 100) {
                          console.log('Large file detected, seeking to first frame...');
                          target.currentTime = 0.1; // 0.1秒の位置にシーク
                        }
                      }}
                      onCanPlay={() => {
                        if (!isPreviewInitialized) return;
                        
                        console.log('Video can start playing');
                        setVideoLoadingProgress(80);
                      }}
                      onCanPlayThrough={(e) => {
                        if (!isPreviewInitialized) return;
                        
                        console.log('Video can play through without buffering');
                        setVideoLoadingProgress(100);
                        setIsVideoLoading(false);
                        setIsVideoReady(true);
                      }}
                      onLoadedData={(e) => {
                        if (!isPreviewInitialized) return;
                        
                        console.log('First frame loaded and ready for display');
                        setVideoLoadingProgress(70);
                      }}
                    >
                      <source src={videoPreviewUrl} type="video/webm" />
                      <source src={videoPreviewUrl} type="video/mp4" />
                      <source src={videoPreviewUrl} type="video/mov" />
                      お使いのブラウザは動画再生をサポートしていません。
                    </video>
                    
                    {/* 🎯 大きなファイル用の追加情報表示 */}
                    {videoFile && (videoFile.size / 1024 / 1024) > 300 && (
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        大きなファイル: プレビュー読み込み中...
                      </div>
                    )}
                    
                    {/* 🎯 動画読み込み状態の表示 */}
                    {isVideoLoading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-black/80 text-white p-4 rounded-lg text-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <div className="text-sm mb-2">動画読み込み中...</div>
                          <div className="w-32 bg-gray-700 rounded-full h-2 mb-1">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${videoLoadingProgress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-300">{videoLoadingProgress}%</div>
                        </div>
                      </div>
                    )}
                    
                    {/* 🎯 動画読み込み失敗時の表示 */}
                    {!isVideoLoading && !isVideoReady && videoPreviewUrl && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-black/80 text-white p-4 rounded-lg text-center">
                          <div className="text-yellow-400 mb-2">⚠️</div>
                          <div className="text-sm mb-2">プレビュー読み込み中...</div>
                          <div className="text-xs text-gray-300">
                            大きなファイルの場合、時間がかかる場合があります
                          </div>
                          <button 
                            onClick={() => {
                              console.log('Manual refresh triggered');
                              
                              // 🔧 プレビュー状態をリセット
                              setIsPreviewInitialized(false);
                              setPreviewLoadAttempts(0);
                              setIsVideoLoading(true);
                              setVideoLoadingProgress(0);
                              setIsVideoReady(false);
                              
                              const video = document.querySelector('video') as HTMLVideoElement;
                              if (video) {
                                video.load();
                                setTimeout(() => {
                                  video.currentTime = 0.1;
                                }, 500);
                              }
                            }}
                            className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                          >
                            手動更新
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* 🎯 デバッグ情報表示（開発用） */}
                    {videoFile && (videoFile.size / 1024 / 1024) > 300 && (
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        <div>Size: {(videoFile.size / 1024 / 1024).toFixed(1)}MB</div>
                        <div>Type: {videoFile.type}</div>
                        <div>Loading: {isVideoLoading ? 'Yes' : 'No'}</div>
                        <div>Ready: {isVideoReady ? 'Yes' : 'No'}</div>
                        <div>Progress: {videoLoadingProgress}%</div>
                        <div>Duration: {videoDuration?.toFixed(1)}s</div>
                        <button 
                          onClick={() => {
                            const video = document.querySelector('video') as HTMLVideoElement;
                            if (video) {
                              console.log('Current video state:', {
                                videoWidth: video.videoWidth,
                                videoHeight: video.videoHeight,
                                currentTime: video.currentTime,
                                duration: video.duration,
                                readyState: video.readyState,
                                networkState: video.networkState,
                                paused: video.paused,
                                ended: video.ended
                              });
                            }
                          }}
                          className="mt-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                        >
                          診断
                        </button>
                      </div>
                    )}
                    
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