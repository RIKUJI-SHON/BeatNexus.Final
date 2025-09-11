import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, Video, AlertCircle, Mic, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useSubmissionCooldown } from '../hooks/useSubmissionCooldown';
import { useSubmissionStatus } from '../hooks/useSubmissionStatus';
import { trackBeatNexusEvents } from '../utils/analytics';
import SubmissionModal from '../components/ui/SubmissionModal';
// Monthly Post Limit セクションを Super Tip 設定に置き換え
import SuperTipSettingsCard from '../components/profile/SuperTipSettingsCard';
import { useStreamUpload } from '../hooks/useStreamUpload';
import type { BattleFormat } from '../types';

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
  return duration >= 30 && duration <= 60;
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
        return t('postPage.errors.miniBattleTooShort', { duration: Math.round(duration), required: '30-60' });
      } else if (duration > 60) {
        return t('postPage.errors.miniBattleTooLong', { duration: Math.round(duration), required: '30-60' });
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
  // バトル形式選択（MAIN または MINI）
  const [battleFormat, setBattleFormat] = useState<BattleFormat>('MAIN_BATTLE');
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [acceptedFacePolicy, setAcceptedFacePolicy] = useState(false);
  const [acceptedContent, setAcceptedContent] = useState(false);
  const [acceptedGreeting, setAcceptedGreeting] = useState(false);
  // SNS/YouTube等での利用同意
  const [acceptedUsageConsent, setAcceptedUsageConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { canSubmit, remainingTime, cooldownInfo, refreshCooldown } = useSubmissionCooldown();
  const { submissionStatus } = useSubmissionStatus();
  const { uploadVideo, isUploading, progress: uploadProgress, uploadStage } = useStreamUpload();
  
  // 投稿モーダルの状態
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [submissionStage, setSubmissionStage] = useState<string>('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmissionProcessing, setIsSubmissionProcessing] = useState(false);
  
  // アップロード進捗を監視
  useEffect(() => {
    if (isUploading && uploadProgress > 0) {
      // アップロード進捗を10-70%の範囲で表示
      const normalizedProgress = 10 + (uploadProgress * 0.6);
      setSubmissionProgress(Math.min(normalizedProgress, 70));
      
      // uploadStageがあれば表示
      if (uploadStage) {
        setSubmissionStage(uploadStage);
      }
    }
  }, [isUploading, uploadProgress, uploadStage]);
  
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
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      await processVideoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !acceptedGuidelines || !acceptedFacePolicy || !acceptedContent || !acceptedGreeting || !acceptedUsageConsent) return;
    
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
    if (!videoFile || !acceptedGuidelines || !acceptedFacePolicy || !acceptedContent || !acceptedGreeting || !acceptedUsageConsent) return;
    
    try {
      setSubmissionStage(t('submissionModal.checking'));
      setSubmissionProgress(5);
      
      // Double-check video duration before upload
      if (videoDuration !== null && !isValidDuration(videoDuration, battleFormat)) {
        setSubmissionError(getDurationErrorMessage(videoDuration, battleFormat, t));
        setIsSubmissionProcessing(false);
        return;
      }
      
      const finalVideoFile = videoFile;
      
      // ファイルサイズチェック
      if (videoFile.size > MAX_FILE_SIZE) {
        setSubmissionError(t('postPage.errors.fileTooBig', { current: (videoFile.size / 1024 / 1024).toFixed(1) }));
        setIsSubmissionProcessing(false);
        return;
      }
      
      setSubmissionStage(t('submissionModal.uploading'));
      setSubmissionProgress(10);

      let publicUrl: string | null = null;
      let streamVideoId: string | null = null;
      
      try {
        console.log(`🔄 Starting Stream upload for ${videoFile.name}`);
        streamVideoId = await uploadVideo(videoFile, battleFormat);
        
        setSubmissionStage('Cloudflare Stream: Upload completed');
        setSubmissionProgress(75);
        // 明示的に直リンクは使わないことを示す（RPCのオーバーロード曖昧性回避のため）
        publicUrl = null as unknown as string;
      } catch (e) {
        console.warn('Stream upload failed, falling back to Supabase Storage:', e);
        // デバッグ用: localStorage.DISABLE_STREAM_FALLBACK === '1' または ?disableStreamFallback=1 でフォールバック抑止
        let disableFallback = false;
        try {
          if (typeof window !== 'undefined') {
            if (localStorage.getItem('DISABLE_STREAM_FALLBACK') === '1') disableFallback = true;
            if (window.location.search.includes('disableStreamFallback=1')) disableFallback = true;
          }
        } catch { /* noop */ }
        if (disableFallback) {
          console.error('[DEBUG] Fallback disabled -> rethrowing original stream upload error');
          throw e instanceof Error ? e : new Error('Stream upload failed (unknown error)');
        }
        setSubmissionStage('Falling back to Supabase Storage');
        setSubmissionProgress(10);

        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(filePath, finalVideoFile);
        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          throw new Error(`動画のアップロードに失敗しました: ${uploadError.message}`);
        }
        const { data: { publicUrl: url } } = supabase.storage
          .from('videos')
          .getPublicUrl(filePath);
        publicUrl = url;
        setSubmissionProgress(75);
      }

      setSubmissionStage(t('submissionModal.creating'));
      setSubmissionProgress(80);

      // Create submission record with cooldown check
    const { data: submissionResult, error: submissionError } = await supabase
        .rpc('create_submission_with_cooldown_check', {
          p_user_id: user.id,
      // Stream成功時はnull（直リンク未使用）
      p_video_url: publicUrl ?? null,
          p_battle_format: battleFormat,
          p_stream_video_id: streamVideoId
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
        console.error('Webhook failed with status:', webhookResponse.status);
        
        const errorMessage = `Webhook call failed (${webhookResponse.status})`;
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
      setSubmissionError(err instanceof Error ? err.message : t('submissionModal.genericError'));
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

  {/* 注意バナー削除済み（以前は静的な動画長メッセージを表示） */}

        {/* 2カラムレイアウト: 左（動画エリア）・右（ガイドライン） */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          
          {/* 左カラム: 動画アップロード・プレビューエリア */}
          <div className="space-y-6">
            <Card className="bg-slate-950 border border-slate-700 shadow-2xl">
              <div className="p-6 sm:p-8">
                
                {step === 'upload' && (
                  <>
                    {/* バトル形式選択 */}
                    <div className="mb-6">
                      <label className="block text-slate-200 font-semibold mb-2">{t('postPage.battleFormat.label', 'バトル形式')}</label>
                      <div className="flex flex-wrap gap-3 items-start">
                        <button
                          type="button"
                          onClick={() => setBattleFormat('MAIN_BATTLE')}
                          className={`px-4 py-2 rounded-lg border transition-all ${battleFormat === 'MAIN_BATTLE' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'}`}
                        >
                          {t('postPage.battleFormat.main', 'MAIN BATTLE')}
                        </button>
                        <div className="relative inline-block">
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 select-none">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-pink-600 text-white shadow">
                              {t('postPage.battleFormat.new', 'New!!')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBattleFormat('MINI_BATTLE')}
                            className={`px-4 py-2 rounded-lg border transition-all ${battleFormat === 'MINI_BATTLE' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'}`}
                            aria-label={t('postPage.battleFormat.mini', 'MINI BATTLE')}
                            title={t('postPage.battleFormat.mini', 'MINI BATTLE')}
                          >
                            {t('postPage.battleFormat.mini', 'MINI BATTLE')}
                          </button>
                        </div>
                      </div>
                      {/* MINI タグライン（選択時のみ） */}
                      {battleFormat === 'MINI_BATTLE' && (
                        <div className="mt-2 text-xs text-cyan-300">
                          {t('postPage.battleFormat.tagline.mini', 'フリースタイルで気軽に挑戦しよう！')}
                        </div>
                      )}

                      {/* 選択中フォーマットのルール表示 */}
                      <div className="mt-3 text-sm text-slate-300">
                        {battleFormat === 'MAIN_BATTLE' ? (
                          <>
                            <div>• {t('postPage.rules.length')}: {t('postPage.rules.values.main.length')}</div>
                            <div>• {t('postPage.rules.rateChange')}: {t('postPage.rules.values.main.rateChange')}</div>
                            <div>• {t('postPage.rules.seasonPoints')}: {t('postPage.rules.values.main.seasonPoints')}</div>
                          </>
                        ) : (
                          <>
                            <div>• {t('postPage.rules.length')}: {t('postPage.rules.values.mini.length')}</div>
                            <div>• {t('postPage.rules.rateChange')}: {t('postPage.rules.values.mini.rateChange')}</div>
                            <div>• {t('postPage.rules.seasonPoints')}: {t('postPage.rules.values.mini.seasonPoints')}</div>
                          </>
                        )}
                      </div>
                    </div>
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
                <span className="text-xs text-slate-400 mt-2">[{battleFormat}]</span>
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
                      } ${!canSubmit || (submissionStatus && !submissionStatus.canSubmit) ? 'opacity-50 pointer-events-none' : ''}`}
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
                        disabled={!canSubmit || (submissionStatus?.canSubmit === false)}
                      />
                      
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
                          disabled={!canSubmit || (submissionStatus?.canSubmit === false)}
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
                          <span>{t('postPage.submissionGuidelines.includeGreeting')}</span>
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
                        <label className="bnx-checkbox">
                          <input
                            type="checkbox"
                            checked={acceptedGuidelines}
                            onChange={(e) => setAcceptedGuidelines(e.target.checked)}
                            required
                          />
                          <span className="checkmark" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span className="label-text">{t('postPage.submissionGuidelines.agreeGuidelines')}</span>
                        </label>

                        <label className="bnx-checkbox">
                          <input
                            type="checkbox"
                            checked={acceptedFacePolicy}
                            onChange={(e) => setAcceptedFacePolicy(e.target.checked)}
                            required
                          />
                          <span className="checkmark" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span className="label-text">{t('postPage.submissionGuidelines.understandFacePolicy')}</span>
                        </label>

                        <label className="bnx-checkbox">
                          <input
                            type="checkbox"
                            checked={acceptedGreeting}
                            onChange={(e) => setAcceptedGreeting(e.target.checked)}
                            required
                          />
                          <span className="checkmark" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span className="label-text">{t('postPage.submissionGuidelines.confirmGreeting')}</span>
                        </label>

                        <label className="bnx-checkbox">
                          <input
                            type="checkbox"
                            checked={acceptedContent}
                            onChange={(e) => setAcceptedContent(e.target.checked)}
                            required
                          />
                          <span className="checkmark" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span className="label-text">{t('postPage.submissionGuidelines.confirmOwnPerformance')}</span>
                        </label>

                        {/* 追加: SNS/YouTube等での利用に関する同意 */}
                        <label className="bnx-checkbox">
                          <input
                            type="checkbox"
                            checked={acceptedUsageConsent}
                            onChange={(e) => setAcceptedUsageConsent(e.target.checked)}
                            required
                          />
                          <span className="checkmark" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span className="label-text">{t('postPage.submissionGuidelines.allowSNSUsage')}</span>
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
                        disabled={!acceptedGuidelines || !acceptedFacePolicy || !acceptedContent || !acceptedGreeting || !acceptedUsageConsent || isSubmissionProcessing || !canSubmit}
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
                    <p className="text-slate-400 mb-4 text-base max-w-md mx-auto">
                      {t('postPage.success.description')}
                    </p>
                    
                    {/* SNS投稿促進メッセージ */}
                    <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4 mb-8 max-w-lg mx-auto">
                      <p className="text-cyan-200 text-sm font-medium">
                        {t('postPage.success.snsEncouragement')}
                      </p>
                    </div>
                    
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
            
            {/* Super Tip 受け取り設定カード（投稿ページにも配置） */}
            <SuperTipSettingsCard />
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
                      {/* 動画冒頭の挨拶 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            {t('postPage.guidelines.detailed.greetingRule.title')}<span className="text-cyan-400">{t('postPage.guidelines.detailed.greetingRule.value')}</span>
                          </h4>
                          <div className="text-sm text-slate-400 mb-3 whitespace-pre-line">{t('postPage.guidelines.detailed.greetingRule.description')}</div>
                          
                          {/* 例文リスト */}
                          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                            <p className="text-xs font-semibold text-cyan-300 mb-2">{t('postPage.guidelines.detailed.greetingRule.examples.title')}</p>
                            <ul className="space-y-1">
                              {(t('postPage.guidelines.detailed.greetingRule.examples.list', { returnObjects: true }) as string[]).map((example, index) => (
                                <li key={index} className="text-xs text-slate-300 flex items-start gap-2">
                                  <span className="text-cyan-400 mt-0.5">•</span>
                                  <span>{example}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="text-xs text-slate-400 mt-2 italic">{t('postPage.guidelines.detailed.greetingRule.examples.note')}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* パフォーマンス時間 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            {t('postPage.guidelines.detailed.performanceTime.title')}
                          </h4>
                          {/* MAIN / MINI 形式別時間 */}
                          {(() => {
                            const hasSeparated = t('postPage.guidelines.detailed.performanceTime.mainValue', { defaultValue: '' });
                            if (hasSeparated) {
                              return (
                                <div className="mb-2">
                                  <ul className="text-sm text-slate-300 space-y-1">
                                    <li>
                                      <span className="text-cyan-300 font-semibold mr-1">{t('postPage.guidelines.detailed.performanceTime.mainLabel', 'MAIN')}:</span>
                                      <span className="text-slate-200">{t('postPage.guidelines.detailed.performanceTime.mainValue')}</span>
                                    </li>
                                    <li>
                                      <span className="text-cyan-300 font-semibold mr-1">{t('postPage.guidelines.detailed.performanceTime.miniLabel', 'MINI')}:</span>
                                      <span className="text-slate-200">{t('postPage.guidelines.detailed.performanceTime.miniValue')}</span>
                                    </li>
                                  </ul>
                                </div>
                              );
                            }
                            // 後方互換（古い value キー）
                            return (
                              <div className="mb-2 text-sm text-slate-300">
                                <span className="text-slate-200">{t('postPage.guidelines.detailed.performanceTime.value')}</span>
                              </div>
                            );
                          })()}
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
                        <div className="w-3 h-3 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            {t('postPage.guidelines.detailed.identityVerification.title')}<span className="text-cyan-400">{t('postPage.guidelines.detailed.identityVerification.value')}</span>
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
                        <div className="w-3 h-3 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            {t('postPage.guidelines.detailed.audioSource.title')}<span className="text-slate-400">{t('postPage.guidelines.detailed.audioSource.value')}</span>
                          </h4>
                          <p className="text-sm text-slate-400">{t('postPage.guidelines.detailed.audioSource.description')}</p>
                        </div>
                      </div>
                      
                      {/* サンプル使用禁止 */}
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-50 mb-2">
                            <span className="text-red-400">{t('postPage.guidelines.detailed.sampleBan.title')}</span>
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
