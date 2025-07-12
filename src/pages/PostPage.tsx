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
import { VideoCompressionModal } from '../components/ui/VideoCompressionModal';
import { compressVideo, shouldCompressVideo, formatFileSize, resetFFmpegInitAttempts } from '../utils/videoCompression';
import { useToastStore } from '../store/toastStore';

// Maximum file size in bytes (120MB - 高画質対応)
const MAX_FILE_SIZE = 120 * 1024 * 1024;

// Function to get video duration
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
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

// 圧縮提案メッセージ
const getCompressionSuggestions = (fileSize: number) => {
  const sizeMB = fileSize / 1024 / 1024;
  
  if (sizeMB > 1000) {
    return {
      message: `動画ファイルが非常に大きいです（${sizeMB.toFixed(1)}MB）。`,
      suggestions: [
        '動画編集アプリで解像度を1080p以下に下げる',
        'フレームレートを30fps以下に設定する',
        'ビットレートを下げて再エンコードする',
        '不要な部分をカットして時間を短縮する'
      ]
    };
  } else if (sizeMB > 500) {
    return {
      message: `動画ファイルが大きいです（${sizeMB.toFixed(1)}MB）。`,
      suggestions: [
        '解像度を720p程度に下げる',
        'ビットレートを調整する',
        'より効率的なエンコード設定を使用する'
      ]
    };
  } else if (sizeMB > 200) {
    return {
      message: `動画ファイルサイズが大きめです（${sizeMB.toFixed(1)}MB）。`,
      suggestions: [
        '軽い圧縮を適用する',
        'ビットレートを少し下げる'
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

  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const battleFormat = 'MAIN_BATTLE'; // Fixed to MAIN_BATTLE
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [acceptedFacePolicy, setAcceptedFacePolicy] = useState(false);
  const [acceptedContent, setAcceptedContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompressionOption, setShowCompressionOption] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [showAutoCompression, setShowAutoCompression] = useState(false);
  
  // 新しい動画圧縮関連の状態
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionPhase, setCompressionPhase] = useState<'initializing' | 'analyzing' | 'compressing' | 'finalizing'>('initializing');
  const [originalFileSize, setOriginalFileSize] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { canSubmit, remainingTime, cooldownInfo, isLoading: cooldownLoading, refreshCooldown } = useSubmissionCooldown();
  const addToast = useToastStore((state) => state.addToast);

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
      // 新しい動画ファイルを選択したときにFFmpeg初期化試行回数をリセット
      resetFFmpegInitAttempts();
      
      setError(null);
      setShowCompressionOption(false);
      setShowAutoCompression(false);
      
      try {
        // 動画の長さを取得
        const duration = await getVideoDuration(file);
        setVideoDuration(duration);
        
        // 動画の長さをチェック
        const isValidLength = isValidDuration(duration, battleFormat);
        const isValidSize = file.size <= MAX_FILE_SIZE;
        
        // 動画の長さが条件に合わない場合は処理を停止
        if (!isValidLength) {
          setError(getDurationErrorMessage(duration, battleFormat, t));
          setShowCompressionOption(false);
          setShowAutoCompression(false);
          return;
        }
        
        // プレビューを設定（条件に合う場合のみ）
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        setStep('preview');
        
        // ファイルサイズをチェック
        if (!isValidSize || shouldCompressVideo(file)) {
          // 規定時間内だがサイズが大きい場合 → 自動圧縮を提案
          setShowAutoCompression(true);
        }
      } catch (err) {
        setError(t('postPage.errors.videoProcessingFailed'));
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
      // 新しい動画ファイルをドロップしたときにFFmpeg初期化試行回数をリセット
      resetFFmpegInitAttempts();
      
      setError(null);
      setShowCompressionOption(false);
      setShowAutoCompression(false);
      
      try {
        // 動画の長さを取得
        const duration = await getVideoDuration(file);
        setVideoDuration(duration);
        
        // 動画の長さをチェック
        const isValidLength = isValidDuration(duration, battleFormat);
        const isValidSize = file.size <= MAX_FILE_SIZE;
        
        // 動画の長さが条件に合わない場合は処理を停止
        if (!isValidLength) {
          setError(getDurationErrorMessage(duration, battleFormat, t));
          setShowCompressionOption(false);
          setShowAutoCompression(false);
          return;
        }
        
        // プレビューを設定（条件に合う場合のみ）
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
        setStep('preview');
        
        // ファイルサイズをチェック
        if (!isValidSize || shouldCompressVideo(file)) {
          // 規定時間内だがサイズが大きい場合 → 自動圧縮を提案
          setShowAutoCompression(true);
        }
      } catch (err) {
        setError(t('postPage.errors.videoProcessingFailed'));
      }
    }
  };
  
  const handleCompression = async (action: string) => {
    if (!videoFile) return;
    
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

  // 自動圧縮処理
  const handleAutoCompression = async (file: File) => {
    console.log('=== handleAutoCompression called ===');
    console.log('File details:', {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    try {
      // 圧縮が必要かチェック
      if (!shouldCompressVideo(file)) {
        console.log('Compression not needed, returning original file');
        return file;
      }

      console.log('Compression needed, starting process...');
      
      // 圧縮状態を設定
      setIsCompressing(true);
      setCompressionProgress(0);
      setCompressionPhase('initializing');
      setOriginalFileSize(file.size);

      console.log('Compression state set, calling compressVideo...');

      // 圧縮実行
      const compressedFile = await compressVideo(file, (progress) => {
        console.log('Compression progress update:', progress);
        setCompressionPhase(progress.phase);
        setCompressionProgress(progress.progress);
      });

      console.log('Compression completed successfully:', {
        original: formatFileSize(file.size),
        compressed: formatFileSize(compressedFile.size),
        ratio: `${Math.round((1 - compressedFile.size / file.size) * 100)}%`
      });

      return compressedFile;
    } catch (error) {
      console.error('=== handleAutoCompression error ===');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      console.error('Error details:', error);
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // エラーメッセージを表示
      let errorMessage = error instanceof Error ? error.message : '圧縮に失敗しました';
      let toastTitle = '圧縮エラー';
      
      // タイムアウトエラーの場合は特別な処理
      if (errorMessage.includes('timeout')) {
        toastTitle = '圧縮タイムアウト';
        errorMessage = 'ファイルサイズが大きすぎるか、処理に時間がかかりすぎています。元のファイルをアップロードします。';
      } else if (errorMessage.includes('FFmpeg初期化に失敗')) {
        toastTitle = '初期化エラー';
        errorMessage = 'ブラウザでの動画処理が利用できません。元のファイルをアップロードします。';
      }
      
      console.log('Showing error toast:', errorMessage);
      
      addToast({
        type: 'error',
        title: toastTitle,
        message: errorMessage,
        duration: 8000
      });
      
      // 圧縮に失敗した場合は元のファイルを返す
      console.log('Returning original file due to compression failure');
      return file;
    } finally {
      console.log('Cleaning up compression state...');
      setIsCompressing(false);
      setCompressionProgress(0);
      setCompressionPhase('initializing');
      console.log('=== handleAutoCompression completed ===');
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

                {showAutoCompression && videoFile && videoDuration && (
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
                        onClick={async () => {
                          const compressedFile = await handleAutoCompression(videoFile);
                          if (compressedFile && compressedFile !== videoFile) {
                            // 圧縮されたファイルに置き換え
                            setVideoFile(compressedFile);
                            
                            // プレビューURLを更新
                            if (videoPreviewUrl) {
                              URL.revokeObjectURL(videoPreviewUrl);
                            }
                            const newUrl = URL.createObjectURL(compressedFile);
                            setVideoPreviewUrl(newUrl);
                            
                            // 自動圧縮モーダルを閉じる
                            setShowAutoCompression(false);
                          }
                        }}
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
      
      {/* 動画圧縮モーダル */}
      <VideoCompressionModal
        isOpen={isCompressing}
        onClose={() => {}}
        progress={compressionProgress}
        phase={compressionPhase}
        originalFileSize={originalFileSize}
      />
    </div>
  );
};

export default PostPage;