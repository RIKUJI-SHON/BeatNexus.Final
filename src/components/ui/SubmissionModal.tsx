import React, { useEffect, useState } from 'react';
import { X, Play, Upload, Loader2, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File | null;
  videoPreviewUrl: string | null;
  stage: string;
  progress: number;
  isProcessing: boolean;
  error?: string | null;
  onCancel?: () => void;
}

const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose,
  videoFile,
  videoPreviewUrl,
  stage,
  progress,
  isProcessing,
  error,
  onCancel
}) => {
  const { t } = useTranslation();
  const [startTime, setStartTime] = useState<number | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('');

  // 推定残り時間の計算
  useEffect(() => {
    if (isProcessing && progress > 0) {
      if (!startTime) {
        setStartTime(Date.now());
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000; // 秒
      const progressRatio = progress / 100;
      const totalEstimated = elapsed / progressRatio;
      const remaining = totalEstimated - elapsed;

      if (remaining > 0) {
        if (remaining < 60) {
          setEstimatedTimeRemaining(t('submissionModal.estimatedTime.seconds', { seconds: Math.round(remaining) }));
        } else {
          const minutes = Math.floor(remaining / 60);
          const seconds = Math.round(remaining % 60);
          setEstimatedTimeRemaining(t('submissionModal.estimatedTime.minutes', { minutes, seconds }));
        }
      } else {
        setEstimatedTimeRemaining(t('submissionModal.estimatedTime.almostDone'));
      }
    } else {
      setStartTime(null);
      setEstimatedTimeRemaining('');
    }
  }, [isProcessing, progress, startTime, t]);

  // ブラウザ離脱防止
  useEffect(() => {
    if (!isProcessing) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProcessing]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-slate-50 flex items-center gap-3">
            <Upload className="h-6 w-6 text-cyan-400" />
            {t('submissionModal.title')}
          </h2>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-50 transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* 動画プレビュー */}
          {videoPreviewUrl && (
            <div className="space-y-3">
              <label className="block text-base font-semibold text-slate-300">
                {t('submissionModal.videoPreview')}
              </label>
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-slate-700">
                <video
                  src={videoPreviewUrl}
                  className="w-full h-full object-contain"
                  controls
                />
              </div>
              {videoFile && (
                <div className="flex items-center text-sm text-slate-400">
                  <Play className="h-4 w-4 mr-2" />
                  {videoFile.name} ({Math.round((videoFile.size || 0) / 1024 / 1024 * 10) / 10} MB)
                </div>
              )}
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-50 mb-1">{t('submissionModal.error')}</h4>
                  <div className="text-sm text-red-200">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* 処理状況 */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
                <span className="text-slate-50 font-semibold text-lg">{t('submissionModal.processing')}</span>
              </div>

              {/* 現在の処理内容 */}
              <div className="text-base text-slate-300">
                {stage}
              </div>

              {/* プログレスバー */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">{t('submissionModal.progress')}</span>
                  <span className="text-cyan-400 font-semibold">{Math.round(progress)}%</span>
                </div>
                
                <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out relative rounded-full"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* 推定残り時間 */}
              {estimatedTimeRemaining && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>{t('submissionModal.estimatedRemaining')}: {estimatedTimeRemaining}</span>
                </div>
              )}
            </div>
          )}

          {/* 完了状態 */}
          {!isProcessing && !error && progress === 100 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-slate-50 font-semibold text-lg">{t('submissionModal.completed')}</span>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t border-slate-700 p-6">
          <div className="flex justify-end gap-4">
            {isProcessing && onCancel && (
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-50 rounded-lg transition-colors"
              >
                {t('submissionModal.cancel')}
              </button>
            )}
            {!isProcessing && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                {t('submissionModal.close')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionModal; 