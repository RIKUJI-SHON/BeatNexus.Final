import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, CheckCircle, Video, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { getVideoDuration, isValidDuration, getDurationErrorMessage } from '../utils/videoUtils';
import { trackBeatNexusEvents } from '../utils/analytics';
import { useSubmissionCooldown } from '../hooks/useSubmissionCooldown';
import { useSubmissionStatus } from '../hooks/useSubmissionStatus';
import { useStreamUpload } from '../hooks/useStreamUpload';
import SubmissionModal from '../components/ui/SubmissionModal';

type BattleFormat = 'lyrical_legend' | 'punchline_pro' | 'melodic_master' | 'flow_finesse';

const PostPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Core state
  const [battleFormat, setBattleFormat] = useState<BattleFormat>('lyrical_legend');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  
  // Form state
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [acceptedFacePolicy, setAcceptedFacePolicy] = useState(false);
  const [acceptedContent, setAcceptedContent] = useState(false);
  const [acceptedUsageConsent, setAcceptedUsageConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { canSubmit, refreshCooldown } = useSubmissionCooldown();
  const { submissionStatus } = useSubmissionStatus();
  const { uploadToStream } = useStreamUpload();
  
  // Submission state
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [submissionStage, setSubmissionStage] = useState('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmissionProcessing, setIsSubmissionProcessing] = useState(false);
  
  // Navigation guard
  if (!user) {
    navigate('/login');
    return null;
  }
  
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
      
      // Stream版では圧縮処理を削除
      const videoUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(videoUrl);
      setStep('preview');
    } catch (error) {
      console.error('Video processing error:', error);
      setError(error instanceof Error ? error.message : t('postPage.errors.videoProcessingFailed'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    await processVideoFile(file);
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
    if (!videoFile) return;
    
    // モーダルを開いて投稿処理を開始
    setIsSubmissionModalOpen(true);
    setSubmissionProgress(0);
    setSubmissionError(null);
    setIsSubmissionProcessing(true);
    
    await performSubmission();
  };

  const performSubmission = async () => {
    if (!videoFile || !acceptedGuidelines || !acceptedFacePolicy || !acceptedContent || !acceptedUsageConsent) return;
    
    try {
      setSubmissionStage(t('submissionModal.checking'));
      setSubmissionProgress(5);
      
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      
      // ファイルサイズチェック
      if (videoFile.size > MAX_FILE_SIZE) {
        setSubmissionError(t('postPage.errors.fileTooBig', { current: (videoFile.size / 1024 / 1024).toFixed(1) }));
        setIsSubmissionProcessing(false);
        return;
      }
      
      // Stream Upload
      setSubmissionStage(t('submissionModal.uploading'));
      setSubmissionProgress(10);
      
      let publicUrl: string | null = null;
      let streamVideoId: string | null = null;
      
      try {
        console.log(`🔄 Starting Stream upload for ${videoFile.name}`);
        const streamRes = await uploadToStream(videoFile, { name: videoFile.name });
        streamVideoId = streamRes.streamVideoId;
        setSubmissionStage('Cloudflare Stream: Upload completed');
        setSubmissionProgress(75);
      } catch (e) {
        console.warn('Stream upload failed, falling back to Supabase Storage:', e);
        setSubmissionStage('Falling back to Supabase Storage');
        setSubmissionProgress(65);

        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(filePath, videoFile);
        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          throw new Error(`動画のアップロードに失敗しました: ${uploadError.message}`);
        }
        const { data: { publicUrl: url } } = supabase.storage
          .from('videos')
          .getPublicUrl(filePath);
        publicUrl = url;
      }

      setSubmissionStage(t('submissionModal.creating'));
      setSubmissionProgress(80);

      // Create submission record with cooldown check
      const { data: submissionResult, error: submissionError } = await supabase
        .rpc('create_submission_with_cooldown_check', {
          p_user_id: user.id,
          p_video_url: publicUrl,
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
          throw new Error(errorMsg);
        }
      }

      const submissionId = submissionResult.submission_id;

      setSubmissionStage(t('submissionModal.matching'));
      setSubmissionProgress(95);

      // Call the webhook to trigger matchmaking
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submission-webhook`;
      
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

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(`Webhook call failed (${webhookResponse.status})`);
      }

      const webhookResult = await webhookResponse.json();
      
      const isSuccess = webhookResult.success === true || 
                       (webhookResult.message && webhookResult.battle_id) ||
                       (webhookResult.message && webhookResult.waiting);

      if (!isSuccess) {
        throw new Error(webhookResult.error || 'Matchmaking failed');
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
          onClick={() => navigate('/battles')}
          className="mb-6 text-slate-400 hover:text-slate-50 hover:bg-slate-800/50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>

        <div className="max-w-2xl mx-auto">
          {step === 'upload' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-3">
                  {t('postPage.title')}
                </h1>
                <p className="text-lg text-slate-400">
                  {t('postPage.subtitle')}
                </p>
              </div>

              {/* バトル形式選択 */}
              <div>
                <label className="block text-lg font-semibold text-slate-50 mb-4">
                  {t('postPage.selectFormat')}
                </label>
                <select
                  value={battleFormat}
                  onChange={(e) => setBattleFormat(e.target.value as BattleFormat)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-slate-50 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="lyrical_legend">{t('battleFormats.lyricalLegend')} (60-90{t('common.seconds')})</option>
                  <option value="punchline_pro">{t('battleFormats.punchlinePro')} (30-60{t('common.seconds')})</option>
                  <option value="melodic_master">{t('battleFormats.melodicMaster')} (60-120{t('common.seconds')})</option>
                  <option value="flow_finesse">{t('battleFormats.flowFinesse')} (45-75{t('common.seconds')})</option>
                </select>
              </div>

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
            </div>
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
                
                <div className="text-sm text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2 font-mono flex items-center mt-4">
                  <Video className="h-4 w-4 mr-2" />
                  {videoFile?.name} ({Math.round((videoFile?.size || 0) / 1024 / 1024 * 10) / 10} MB)
                </div>
              </div>

              {/* チェックボックス */}
              <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
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
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptedUsageConsent}
                      onChange={(e) => setAcceptedUsageConsent(e.target.checked)}
                      className="mt-1 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/30 bg-slate-700"
                      required
                    />
                    <span className="text-sm text-slate-300 group-hover:text-slate-50 transition-colors">
                      {t('postPage.submissionGuidelines.consentUsage')}
                    </span>
                  </label>
                </div>
              </div>

              {/* 投稿ボタン */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveVideo}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={!acceptedGuidelines || !acceptedFacePolicy || !acceptedContent || !acceptedUsageConsent}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('postPage.submit')}
                </Button>
              </div>
            </form>
          )}

          {/* 成功ステップ */}
          {step === 'success' && (
            <div className="text-center space-y-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-50 mb-3">
                  {t('postPage.success.title')}
                </h2>
                <p className="text-lg text-slate-400 mb-8">
                  {t('postPage.success.description')}
                </p>
                <Button
                  onClick={() => navigate('/battles')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
                >
                  {t('postPage.success.viewBattles')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 投稿モーダル */}
      <SubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        progress={submissionProgress}
        stage={submissionStage}
        error={submissionError}
        isProcessing={isSubmissionProcessing}
      />
    </div>
  );
};

export default PostPage;
