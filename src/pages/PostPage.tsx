import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, Video, AlertCircle, Mic, ArrowLeft, Settings } from 'lucide-react';
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
import { MonthlyLimitCard } from '../components/ui/SubmissionCooldownCard';

// Maximum file size in bytes (2GB - 大容量動画対応強化)
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

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
const getDurationErrorMessage = (duration: number, format: string, t: (key: string, params?: Record<string, string | number>) => string): string => {
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
  const { canSubmit, remainingTime, cooldownInfo, refreshCooldown } = useSubmissionCooldown();
  const { submissionStatus } = useSubmissionStatus();
  const { 
    processVideo, 
    isLoading: isProcessing, 
    progress, 
    currentStage: compressionStage,
    isReady: isFFmpegLoaded
  } = useVideoProcessor();

  // FFmpegのエラー状態を管理
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  
  // 投稿モーダルの状態
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [submissionStage, setSubmissionStage] = useState<string>('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmissionProcessing, setIsSubmissionProcessing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // モーダル表示用の総合進捗を計算
  const getModalProgress = () => {
    if (isCompressing && isProcessing) {
      // 圧縮中は圧縮の進捗を10-50%にマッピング
      return 10 + (progress * 0.4); // progress(0-100) を 10-50% にマッピング
    }
    return submissionProgress;
  };

  // モーダル表示用のステージメッセージを計算
  const getModalStage = () => {
    if (isCompressing && compressionStage) {
      return `${t('submissionModal.compressing')} - ${compressionStage}`;
    }
    return submissionStage;
  };

  // Redirect if not authenticated
  if (!user) {
    navigate('/');
    return null;
  }
  
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
    
    // 1時間制限チェック
    if (!canSubmit) {
      setError(cooldownInfo?.message || t('postPage.submission.error.cooldownActive'));
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
      const compressionThreshold = 300 * 1024 * 1024; // 300MB（大容量ファイル対応）
      
      if (videoFile.size > compressionThreshold) {
        setSubmissionStage(t('submissionModal.compressing'));
        setSubmissionProgress(10);
        setIsCompressing(true); // 圧縮フラグを設定
        
        try {
          console.log(`🔄 Starting compression for ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(1)}MB)`);
          console.log('📋 Current VideoProcessor state:', { isReady: isFFmpegLoaded, isLoading: isProcessing, progress });
          
          // 動画処理を実行（プログレス更新を監視）
          const processedResult = await processVideo(videoFile);
          console.log('🎬 processVideo returned result:', processedResult);
          
          // Blobの場合はFileに変換
          if (processedResult instanceof File) {
            finalVideoFile = processedResult;
          } else {
            // BlobをFileに変換
            const fileName = videoFile.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4';
            finalVideoFile = new File([processedResult], fileName, { type: 'video/mp4' });
          }
          
          console.log(`✅ Compression completed: ${(finalVideoFile.size / 1024 / 1024).toFixed(1)}MB`);
          
          // 圧縮後のファイルサイズチェック
          if (finalVideoFile.size > MAX_FILE_SIZE) {
            setSubmissionError(t('postPage.errors.fileTooBig', { current: (finalVideoFile.size / 1024 / 1024).toFixed(1) }));
            setIsSubmissionProcessing(false);
            return;
          }
          
          // 圧縮完了、投稿段階に移行
          setSubmissionProgress(50);
          setIsCompressing(false); // 圧縮完了
          setSubmissionStage(t('submissionModal.uploading')); // 次の段階を明示
        } catch (compressionError) {
          console.error('Compression error:', compressionError);
          setSubmissionError(compressionError instanceof Error ? compressionError.message : t('postPage.errors.videoProcessingFailed'));
          setIsSubmissionProcessing(false);
          setIsCompressing(false); // エラー時も圧縮状態をリセット
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
      setSubmissionProgress(65);
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
      setSubmissionProgress(80);

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
      if (!submissionResult || !submissionResult.success) {
        console.error('❌ Submission failed:', submissionResult);
        
        if (submissionResult?.error === 'cooldown_active') {
          // Update cooldown info and show error
          refreshCooldown();
          const errorMsg = submissionResult.message_key ? 
            t(submissionResult.message_key, submissionResult.message_params) : 
            (submissionResult.message || t('postPage.submission.error.cooldownActive'));
          throw new Error(errorMsg);
        } else if (submissionResult?.error === 'season_restriction') {
          const errorMsg = submissionResult.message_key ? 
            t(submissionResult.message_key, submissionResult.message_params) : 
            (submissionResult.message || t('postPage.submission.error.seasonRestriction'));
          throw new Error(errorMsg);
        } else {
          const errorMsg = submissionResult?.message_key ? 
            t(submissionResult.message_key, submissionResult.message_params) : 
            (submissionResult?.message || t('postPage.submission.error.creationFailed'));
          console.error('Detailed error info:', submissionResult?.message_params);
          throw new Error(errorMsg);
        }
      }

      const submissionId = submissionResult.submission_id;

      setSubmissionStage(t('submissionModal.matching'));
      setSubmissionProgress(95);

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
    <div className="min-h-screen bg-slate-950 py-6 sm:py-10">
      <div className="container-ultra-wide">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 sm:mb-8 text-slate-400 hover:text-white transition-colors"
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
            
            <div className="relative animate-fade-in">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500">
                {t('postPage.title')}
              </h1>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                {t('postPage.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* 重要な注意事項バナー */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12 grid gap-4 sm:grid-cols-2">
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl py-4 px-6 backdrop-blur-sm hover:border-purple-500/50 transition-colors">
            <div className="flex items-center justify-center gap-3 text-purple-300">
              <Video className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-base text-center">
                {t('postPage.importantNotice.videoDuration')}
              </span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl py-4 px-6 backdrop-blur-sm hover:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-center gap-3 text-amber-300">
              <Settings className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-base text-center">
                {t('postPage.importantNotice.videoQuality')}
              </span>
            </div>
          </div>
        </div>

        {/* 2カラムレイアウト: 左（動画エリア）・右（ガイドライン） */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          
          {/* 左カラム: 動画アップロード・プレビューエリア */}
          <div className="space-y-6">
            <Card className="bg-slate-950 border border-slate-700 shadow-2xl">
              <div className="p-6 sm:p-8">
                
                {step === 'upload' && (
                  <>
                    {/* 投稿制限情報カード */}
                    {(!canSubmit || (submissionStatus && !submissionStatus.canSubmit)) && (cooldownInfo || submissionStatus) && (
                      <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="h-5 w-5 text-orange-400" />
                          <h3 className="font-semibold text-white">
                            {submissionStatus && !submissionStatus.canSubmit 
                              ? t('postPage.seasonOff.title')
                              : t('postPage.cooldown.title')
                            }
                          </h3>
                        </div>
                        <p className="text-sm text-orange-200 mb-3">
                          {submissionStatus && !submissionStatus.canSubmit 
                            ? submissionStatus.message
                            : (!canSubmit && remainingTime ? 
                                t('postPage.submission.cooldown.remainingTime', { 
                                  time: remainingTime 
                                }) 
                                : t('postPage.cooldown.message', { time: remainingTime || '' }))
                          }
                        </p>
                      </div>
                    )}

                    {/* FFmpeg初期化エラー */}
                    {ffmpegError && (
                      <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{t('postPage.ffmpeg.initializationError')}</h4>
                            <div className="text-sm text-red-200 mb-4">{ffmpegError}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* エラー表示 */}
                    {error && (
                      <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-50 mb-1">{t('postPage.errors.problemOccurred')}</h4>
                            <div className="text-sm text-red-200 whitespace-pre-line mb-4">{error}</div>
                            
                            {(error.includes('秒') || error.includes('seconds')) && (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    setError(null);
                                    triggerFileInput();
                                  }}
                                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
                                >
                                  {t('postPage.errors.selectDifferentVideo', '別の動画を選択')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ファイルアップロード領域 */}
                    <div 
                      className={`border-2 border-dashed rounded-xl transition-all duration-300 relative hover-lift ${
                        isDragging 
                          ? 'border-cyan-400 bg-cyan-500/10 scale-105' 
                          : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/30'
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
                        disabled={!canSubmit || !isFFmpegLoaded || (submissionStatus?.canSubmit === false)}
                      />
                      
                      {/* FFmpeg準備中のオーバーレイ */}
                      {!isFFmpegLoaded && !ffmpegError && (
                        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                          <div className="text-center">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <h3 className="text-base sm:text-lg font-semibold text-slate-50 mb-1">
                              {t('postPage.ffmpeg.initializing')}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-400">
                              {t('postPage.ffmpeg.initializingDescription')}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-8 text-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center shadow-xl border border-slate-600">
                          <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-cyan-400" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-semibold text-slate-50 mb-3">
                          {t('postPage.upload.dropHere')}
                        </h3>
                        <p className="text-slate-400 mb-6 text-base">
                          {t('postPage.upload.orBrowse')}
                        </p>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={triggerFileInput}
                          disabled={!canSubmit || !isFFmpegLoaded || (submissionStatus?.canSubmit === false)}
                          className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {t('postPage.upload.selectVideo')}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* プレビューステップ */}
                {step === 'preview' && videoPreviewUrl && (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                      <label className="block text-lg font-semibold text-slate-50 mb-4">
                        {t('postPage.preview.title')}
                      </label>
                      <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                        <video
                          src={videoPreviewUrl}
                          className="w-full h-full object-contain"
                          controls
                        />
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="absolute top-3 right-3 bg-slate-900/80 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex items-center mt-3 text-sm text-slate-400">
                        <Video className="h-4 w-4 mr-2" />
                        {videoFile?.name} ({Math.round((videoFile?.size || 0) / 1024 / 1024 * 10) / 10} MB)
                      </div>
                      
                      {/* 圧縮進行状況表示 */}
                      {isProcessing && (
                        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-blue-300 font-medium text-sm">{t('postPage.processing.title')}</span>
                          </div>
                          {progress > 0 && (
                            <div className="w-full bg-slate-700 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* エラー表示（プレビューステップ） */}
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-50 mb-1">{t('postPage.errors.problemOccurred')}</h4>
                            <div className="text-sm text-red-200 whitespace-pre-line mb-4">{error}</div>
                            
                            {(error.includes('秒') || error.includes('seconds')) && (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    setError(null);
                                    // バトル形式選択にフォーカス
                                    document.querySelector('select')?.focus();
                                  }}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                                >
                                  {t('postPage.errors.changeBattleFormat')}
                                </button>
                                <button
                                  onClick={() => {
                                    setError(null);
                                    triggerFileInput();
                                  }}
                                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
                                >
                                  {t('postPage.errors.selectDifferentVideo', '別の動画を選択')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 投稿ガイドライン */}
                    <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                      <div className="flex items-center gap-3 mb-6">
                        <AlertCircle className="h-6 w-6 text-cyan-400" />
                        <h3 className="font-semibold text-slate-50 text-lg">
                          {t('postPage.submissionGuidelines.title')}
                        </h3>
                      </div>
                      <ul className="space-y-3 text-sm text-slate-300 mb-8">
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{t('postPage.submissionGuidelines.followFormatLength')}</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{t('postPage.submissionGuidelines.ensureAudioQuality')}</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>{t('postPage.submissionGuidelines.faceOptional')}</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                          <span>{t('postPage.submissionGuidelines.noBackgroundMusic')}</span>
                        </li>
                      </ul>

                      <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={acceptedGuidelines}
                            onChange={(e) => setAcceptedGuidelines(e.target.checked)}
                            className="mt-1 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/30 bg-slate-700"
                            required
                          />
                          <span className="text-sm text-slate-300 group-hover:text-slate-50 transition-colors">
                            {t('postPage.submissionGuidelines.agreeGuidelines')}
                          </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={acceptedFacePolicy}
                            onChange={(e) => setAcceptedFacePolicy(e.target.checked)}
                            className="mt-1 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/30 bg-slate-700"
                            required
                          />
                          <span className="text-sm text-slate-300 group-hover:text-slate-50 transition-colors">
                            {t('postPage.submissionGuidelines.understandFacePolicy')}
                          </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={acceptedContent}
                            onChange={(e) => setAcceptedContent(e.target.checked)}
                            className="mt-1 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/30 bg-slate-700"
                            required
                          />
                          <span className="text-sm text-slate-300 group-hover:text-slate-50 transition-colors">
                            {t('postPage.submissionGuidelines.confirmOwnPerformance')}
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {/* ボタン群 */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={handleRemoveVideo}
                        className="flex-1 border-slate-700 text-slate-300 hover:text-slate-50 hover:border-slate-600"
                      >
                        {t('postPage.buttons.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all"
                        isLoading={isSubmissionProcessing}
                        disabled={!acceptedGuidelines || !acceptedFacePolicy || !acceptedContent || isSubmissionProcessing || !canSubmit}
                        leftIcon={<Mic className="h-5 w-5" />}
                      >
                        {t('postPage.buttons.submitToBattlePool')}
                      </Button>
                    </div>
                  </form>
                )}

                {/* 成功ステップ */}
                {step === 'success' && (
                  <div className="text-center py-8">
                    <div className="relative mb-8">
                      {/* 背景のグラデーション効果 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-cyan-500/20 blur-3xl animate-pulse"></div>
                      
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center shadow-2xl border border-green-500/30 animate-float">
                        <CheckCircle className="h-12 w-12 sm:h-14 sm:w-14 text-green-400" />
                      </div>
                    </div>
                    
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-3">
                      {t('postPage.success.title')}
                    </h2>
                    <p className="text-slate-400 mb-8 text-base max-w-md mx-auto">
                      {t('postPage.success.description')}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate('/my-battles')}
                        className="border-slate-700 text-slate-300 hover:text-slate-50 hover:border-slate-600"
                      >
                        {t('postPage.buttons.viewMyBattles')}
                      </Button>
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => setStep('upload')}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all"
                      >
                        {t('postPage.buttons.submitAnother')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            
            {/* 月間投稿制限カード */}
            <MonthlyLimitCard />
          </div>

          {/* 右カラム: ガイドライン */}
          <div className="space-y-6">
            <Card className="bg-slate-950 border border-slate-700 shadow-2xl sticky top-6">
              <div className="p-6 sm:p-8">
                {/* ガイドライン セクション */}
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center px-6 py-3 bg-slate-800/50 rounded-xl border border-cyan-500/30 backdrop-blur-sm">
                      <h3 className="text-xl font-semibold text-cyan-100">{t('postPage.guidelines.title')}</h3>
                    </div>
                  </div>
                  
                  {/* 統一されたガイドラインカード */}
                  <div className="bg-slate-900 backdrop-blur-sm rounded-xl p-6 border border-slate-600 hover:border-cyan-500/30 transition-all hover-lift">
                    <div className="space-y-6">
                      {/* パフォーマンス時間 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            {t('postPage.guidelines.detailed.performanceTime.title')}<span className="text-blue-400">{t('postPage.guidelines.detailed.performanceTime.value')}</span>
                          </h4>
                          <p className="text-sm text-slate-400">{t('postPage.guidelines.detailed.performanceTime.description')}</p>
                        </div>
                      </div>
                      
                      {/* パフォーマンス形式 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            {t('postPage.guidelines.detailed.performanceFormat.title')}<span className="text-cyan-400">{t('postPage.guidelines.detailed.performanceFormat.value')}</span>
                          </h4>
                          <p className="text-sm text-slate-400">{t('postPage.guidelines.detailed.performanceFormat.description')}</p>
                        </div>
                      </div>
                      
                      {/* 本人確認 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            {t('postPage.guidelines.detailed.identityVerification.title')}<span className="text-emerald-400">{t('postPage.guidelines.detailed.identityVerification.value')}</span>
                          </h4>
                          <p className="text-sm text-slate-400">{t('postPage.guidelines.detailed.identityVerification.description')}</p>
                        </div>
                      </div>
                      
                      {/* リップシンク禁止 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            <span className="text-red-400">{t('postPage.guidelines.detailed.lipSyncBan.title')}</span>
                          </h4>
                          <p className="text-sm text-slate-400">{t('postPage.guidelines.detailed.lipSyncBan.description')}</p>
                        </div>
                      </div>
                      
                      {/* 音源 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            {t('postPage.guidelines.detailed.audioSource.title')}<span className="text-purple-400">{t('postPage.guidelines.detailed.audioSource.value')}</span>
                          </h4>
                          <p className="text-sm text-slate-400">{t('postPage.guidelines.detailed.audioSource.description')}</p>
                        </div>
                      </div>
                      
                      {/* サンプル使用禁止 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            <span className="text-orange-400">{t('postPage.guidelines.detailed.sampleBan.title')}</span>
                          </h4>
                          <p className="text-sm text-slate-400">{t('postPage.guidelines.detailed.sampleBan.description')}</p>
                        </div>
                      </div>
                      
                      {/* 音声の処理 */}
                      <div className="bg-slate-800 rounded-lg p-5 border border-slate-600">
                        <h4 className="text-xl font-bold text-slate-50 mb-4 flex items-center gap-3">
                          <Settings className="h-5 w-5 text-blue-400" />
                          <span className="text-blue-400">{t('postPage.guidelines.detailed.audioProcessing.title')}</span>{t('postPage.guidelines.detailed.audioProcessing.subtitle')}
                        </h4>
                        
                        {/* 許可される処理 */}
                        <div className="mb-6">
                          <h5 className="text-lg font-bold text-emerald-400 mb-3">✅ {t('postPage.guidelines.detailed.audioProcessing.allowed.title')}</h5>
                          <ul className="space-y-2 ml-4">
                            <li className="text-slate-50 flex items-start gap-3">
                              <CheckCircle className="h-4 w-4 text-emerald-400 mt-1 flex-shrink-0" />
                              <span><strong className="text-emerald-300">{t('postPage.guidelines.detailed.audioProcessing.allowed.mixing')}</strong></span>
                            </li>
                            <li className="text-slate-50 flex items-start gap-3">
                              <CheckCircle className="h-4 w-4 text-emerald-400 mt-1 flex-shrink-0" />
                              <span>{t('postPage.guidelines.detailed.audioProcessing.allowed.correction')}</span>
                            </li>
                          </ul>
                        </div>
                        
                        {/* 禁止される処理 */}
                        <div>
                          <h5 className="text-lg font-bold text-red-400 mb-3">❌ {t('postPage.guidelines.detailed.audioProcessing.prohibited.title')}</h5>
                          <ul className="space-y-2 ml-4">
                            <li className="text-slate-50 flex items-start gap-3">
                              <X className="h-4 w-4 text-red-400 mt-1 flex-shrink-0" />
                              <span><strong className="text-red-300">{t('postPage.guidelines.detailed.audioProcessing.prohibited.effects')}</strong></span>
                            </li>
                            <li className="text-slate-50 flex items-start gap-3">
                              <X className="h-4 w-4 text-red-400 mt-1 flex-shrink-0" />
                              <span><strong className="text-red-300">{t('postPage.guidelines.detailed.audioProcessing.prohibited.advanced')}</strong></span>
                            </li>
                          </ul>
                        </div>
                      </div>
                      
                      {/* 撮影・録音機材 */}
                      <div className="bg-slate-800 rounded-lg p-5 border border-slate-600">
                        <h4 className="text-xl font-bold text-slate-50 mb-4 flex items-center gap-3">
                          <Video className="h-5 w-5 text-purple-400" />
                          <span className="text-purple-400">{t('postPage.guidelines.detailed.equipment.title')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-4 w-4 text-emerald-400 mt-1 flex-shrink-0" />
                            <p className="text-slate-50">
                              <strong className="text-emerald-300">{t('postPage.guidelines.detailed.equipment.devices.title')}</strong>：{t('postPage.guidelines.detailed.equipment.devices.description')}
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 text-amber-400 mt-1 flex-shrink-0" />
                            <p className="text-slate-50">
                              <strong className="text-amber-300">{t('postPage.guidelines.detailed.equipment.resolution.title')}</strong>：{t('postPage.guidelines.detailed.equipment.resolution.description')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* 投稿処理モーダル */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        videoFile={videoFile}
        videoPreviewUrl={videoPreviewUrl}
        stage={getModalStage()} // 詳細ステージを使用
        progress={getModalProgress()} // 統合された進捗値を使用
        isProcessing={isSubmissionProcessing}
        error={submissionError}
        onCancel={() => {
          setIsSubmissionModalOpen(false);
          setIsSubmissionProcessing(false);
          setSubmissionError(null);
          setIsCompressing(false);
        }}
      />
    </div>
  );
};

export default PostPage;