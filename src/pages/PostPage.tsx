import React, { useState, useRef } from 'react';
import { Upload, X, Play, CheckCircle, Video, AlertCircle, Crown, Music, Mic, ArrowLeft, Shield, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useSubmissionCooldown } from '../hooks/useSubmissionCooldown';
import { useVideoProcessor } from '../hooks/useVideoProcessor';
import { useSubmissionStatus } from '../hooks/useSubmissionStatus';
import { trackBeatNexusEvents } from '../utils/analytics';
import SubmissionModal from '../components/ui/SubmissionModal';

// Maximum file size in bytes (200MB)
const MAX_FILE_SIZE = 200 * 1024 * 1024;

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
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { canSubmit, remainingTime, cooldownInfo, isLoading: cooldownLoading, refreshCooldown } = useSubmissionCooldown();
  const { submissionStatus } = useSubmissionStatus();
  const { 
    processVideo, 
    isLoading: isProcessing, 
    progress, 
    isReady: isFFmpegLoaded
  } = useVideoProcessor();

  // FFmpegのエラー状態を管理
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  const [stage, setStage] = useState<string>('');
  
  // 投稿モーダルの状態
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [submissionStage, setSubmissionStage] = useState<string>('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmissionProcessing, setIsSubmissionProcessing] = useState(false);

  // Redirect if not authenticated
  if (!user) {
    navigate('/');
    return null;
  }

  const validateFile = (file: File, duration?: number): boolean => {
    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      setError(t('postPage.errors.fileTooBig', { current: (file.size / 1024 / 1024).toFixed(1) }));
      return false;
    }
    
    // 動画の長さチェック（durationが提供されている場合）
    if (duration !== undefined && !isValidDuration(duration, battleFormat)) {
      setError(getDurationErrorMessage(duration, battleFormat, t));
      return false;
    }
    
    setError(null);
    return true;
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file && file.type.startsWith('video/')) {
      await processVideoFile(file);
    }
  };

  const processVideoFile = async (file: File) => {
    setError(null);
    setFfmpegError(null);
    
    try {
      // 動画の長さを取得
      const duration = await getVideoDuration(file);
      setVideoDuration(duration);
      
      // 動画の長さをチェック
      const isValidLength = isValidDuration(duration, battleFormat);
      
      // 動画の長さが条件に合わない場合は処理を停止
      if (!isValidLength) {
        setError(getDurationErrorMessage(duration, battleFormat, t));
        return;
      }
      
      // プレビューを表示（圧縮は投稿時に行う）
      setVideoFile(file);
      const initialUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(initialUrl);
      setStep('preview');
      
    } catch (err) {
      console.error('Video processing error:', err);
      setError(err instanceof Error ? err.message : t('postPage.errors.videoProcessingFailed'));
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !acceptedGuidelines || !acceptedFacePolicy || !acceptedContent) return;
    
    // 24時間制限チェック
    if (!canSubmit) {
      setError(cooldownInfo?.message || '24時間以内に投稿できるのは1本までです。');
      return;
    }
    
    // モーダルを開いて投稿処理を開始
    setIsSubmissionModalOpen(true);
    setSubmissionProgress(0);
    setSubmissionError(null);
    setIsSubmissionProcessing(true);
    
    await performSubmission();
  };

  const performSubmission = async () => {
    if (!videoFile || !acceptedGuidelines || !acceptedFacePolicy || !acceptedContent) return;
    
    try {
      setSubmissionStage(t('submissionModal.checking'));
      setSubmissionProgress(5);
      
      // Double-check video duration before upload
      if (videoDuration !== null && !isValidDuration(videoDuration, battleFormat)) {
        setSubmissionError(getDurationErrorMessage(videoDuration, battleFormat, t));
        setIsSubmissionProcessing(false);
        return;
      }
      
      let finalVideoFile = videoFile;
      
      // ファイルサイズをチェックして、必要に応じて圧縮
      const compressionThreshold = 200 * 1024 * 1024; // 200MB
      
      if (videoFile.size > compressionThreshold) {
        setSubmissionStage(t('submissionModal.compressing'));
        setSubmissionProgress(10);
        
        try {
          // 動画処理を実行
          const processedResult = await processVideo(videoFile);
          
          // Blobの場合はFileに変換
          if (processedResult instanceof File) {
            finalVideoFile = processedResult;
          } else {
            // BlobをFileに変換
            const fileName = videoFile.name.replace(/\.[^/.]+$/, '') + '_processed.mp4';
            finalVideoFile = new File([processedResult], fileName, { type: 'video/mp4' });
          }
          
          // 圧縮後のファイルサイズチェック
          if (finalVideoFile.size > MAX_FILE_SIZE) {
            setSubmissionError(t('postPage.errors.fileTooBig', { current: (finalVideoFile.size / 1024 / 1024).toFixed(1) }));
            setIsSubmissionProcessing(false);
            return;
          }
          
          setSubmissionProgress(50);
        } catch (compressionError) {
          console.error('Compression error:', compressionError);
          setSubmissionError(compressionError instanceof Error ? compressionError.message : t('postPage.errors.videoProcessingFailed'));
          setIsSubmissionProcessing(false);
          return;
        }
      } else {
        // 圧縮不要の場合、最終サイズチェックのみ
        if (videoFile.size > MAX_FILE_SIZE) {
          setSubmissionError(t('postPage.errors.fileTooBig', { current: (videoFile.size / 1024 / 1024).toFixed(1) }));
          setIsSubmissionProcessing(false);
          return;
        }
        setSubmissionProgress(50);
      }
      
      setSubmissionStage(t('submissionModal.uploading'));
      setSubmissionProgress(60);
      // Upload video to storage
      const fileExt = finalVideoFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      console.log('📤 Uploading video:', {
        filePath,
        fileSize: finalVideoFile.size,
        fileType: finalVideoFile.type,
        fileName: finalVideoFile.name
      });
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, finalVideoFile);
      
      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`動画のアップロードに失敗しました: ${uploadError.message}`);
      }

      setSubmissionStage(t('submissionModal.creating'));
      setSubmissionProgress(75);

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

      setSubmissionStage(t('submissionModal.matching'));
      setSubmissionProgress(90);

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

      setSubmissionStage(t('submissionModal.completed'));
      setSubmissionProgress(100);
      setIsSubmissionProcessing(false);
      
      // 少し待ってから成功画面に遷移
      setTimeout(() => {
        setStep('success');
        setIsSubmissionModalOpen(false);
      }, 1500);
      
    } catch (err) {
      console.error('Submission error:', err);
      setSubmissionError(err instanceof Error ? err.message : '投稿に失敗しました');
      setIsSubmissionProcessing(false);
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
        <div className="text-center mb-6 sm:mb-8">
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

        {/* 重要な注意事項バナー */}
        <div className="max-w-2xl mx-auto mb-8 sm:mb-12 space-y-3">
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl py-3 px-4 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-purple-300">
              <Video className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base text-center">
                {t('postPage.importantNotice.videoDuration')}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl py-3 px-4 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-amber-300">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base text-center">
                {t('postPage.importantNotice.videoQuality')}
              </span>
            </div>
          </div>
        </div>
        
        <Card className="max-w-2xl mx-auto bg-gray-900 border border-gray-800">
          <div className="p-6 sm:p-8">

            {step === 'upload' && (
              <>
                {/* 投稿制限情報カード */}
                {(!canSubmit || (submissionStatus && !submissionStatus.canSubmit)) && (cooldownInfo || submissionStatus) && (
                  <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-orange-400" />
                      <h3 className="font-medium text-white">
                        {submissionStatus && !submissionStatus.canSubmit 
                          ? t('postPage.seasonOff.title', 'シーズン外投稿制限')
                          : t('postPage.cooldown.title', '投稿制限中')
                        }
                      </h3>
                    </div>
                    <p className="text-sm text-orange-200 mb-3">
                      {submissionStatus && !submissionStatus.canSubmit 
                        ? submissionStatus.message
                        : cooldownInfo?.message
                      }
                    </p>
                    {remainingTime && canSubmit && (
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{t('postPage.cooldown.nextSubmission', '次回投稿可能まで')}</span>
                          <span className="text-orange-400 font-medium">{remainingTime}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* FFmpeg初期化エラー */}
                {ffmpegError && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-white mb-1">{t('postPage.ffmpeg.initializationError')}</h4>
                        <div className="text-sm text-red-200 mb-4">{ffmpegError}</div>
                      </div>
                    </div>
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
                  className={`border-2 border-dashed rounded-xl transition-all duration-300 relative ${
                    isDragging 
                      ? 'border-cyan-400 bg-cyan-500/10 scale-105' 
                      : 'border-gray-700 hover:border-cyan-500/50 hover:bg-gray-800/30'
                  } ${!canSubmit || !isFFmpegLoaded || (submissionStatus && !submissionStatus.canSubmit) ? 'opacity-50 pointer-events-none' : ''}`}
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
                    disabled={!canSubmit || !isFFmpegLoaded || (submissionStatus && !submissionStatus.canSubmit)}
                  />
                  
                  {/* FFmpeg準備中のオーバーレイ */}
                  {!isFFmpegLoaded && !ffmpegError && (
                    <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <h3 className="text-base sm:text-lg font-medium text-white mb-1">
                          {t('postPage.ffmpeg.initializing')}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {t('postPage.ffmpeg.initializingDescription')}
                        </p>
                      </div>
                    </div>
                  )}
                  
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
                      disabled={!canSubmit || !isFFmpegLoaded || (submissionStatus && !submissionStatus.canSubmit)}
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
                    <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Video className="h-5 w-5 text-purple-300" />
                        <span className="font-medium text-purple-300 text-sm sm:text-base">
                          {t('postPage.guidelines.videoLengthSize.title')}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-300 whitespace-pre-line">
                        {t('postPage.guidelines.videoLengthSize.description')}
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
                  
                  {/* 圧縮進行状況表示 */}
                  {isProcessing && stage && (
                    <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-blue-300 font-medium text-sm">{stage}</span>
                      </div>
                      {progress > 0 && (
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
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
      
      {/* 投稿処理モーダル */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        videoFile={videoFile}
        videoPreviewUrl={videoPreviewUrl}
        stage={submissionStage}
        progress={submissionProgress}
        isProcessing={isSubmissionProcessing}
        error={submissionError}
        onCancel={() => {
          setIsSubmissionModalOpen(false);
          setIsSubmissionProcessing(false);
          setSubmissionError(null);
        }}
      />
    </div>
  );
};

export default PostPage;