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
  const [compressionPhase, setCompressionPhase] = useState<boolean>(true);

  // 推定残り時間の計算（段階別）
  useEffect(() => {
    if (isProcessing && progress > 0) {
      // 圧縮段階かどうかを判定
      const isCompressionStage = stage.includes('圧縮') || stage.includes('メモリ') || stage.includes('FFmpeg');
      
      if (!startTime) {
        setStartTime(Date.now());
        setCompressionPhase(isCompressionStage);
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000; // 秒
      
      // 圧縮段階から投稿段階に移った場合、時間見積もりをリセット
      if (compressionPhase && !isCompressionStage && progress > 50) {
        setStartTime(Date.now());
        setCompressionPhase(false);
        // 投稿段階は短時間で完了すると見積もり
        setEstimatedTimeRemaining('約1分');
        return;
      }
      
      let remaining = 0;
      
      if (isCompressionStage && progress < 50) {
        // 圧縮段階: 通常の時間計算
        const progressRatio = progress / 50; // 圧縮は50%まで
        const totalEstimated = elapsed / progressRatio;
        remaining = totalEstimated - elapsed;
      } else {
        // 投稿段階: 短時間で完了
        const remainingProgress = 100 - progress;
        remaining = (remainingProgress / 50) * 60; // 残り50%を最大1分で完了
      }

      if (remaining > 0) {
        if (remaining < 60) {
          setEstimatedTimeRemaining(`約${Math.max(Math.round(remaining), 10)}秒`);
        } else {
          const minutes = Math.floor(remaining / 60);
          setEstimatedTimeRemaining(`約${minutes}分`);
        }
      } else {
        setEstimatedTimeRemaining('まもなく完了');
      }
    } else {
      // 処理が完了または開始前
      setStartTime(null);
      setEstimatedTimeRemaining('');
      setCompressionPhase(true);
    }
  }, [isProcessing, progress, stage, startTime, compressionPhase]);

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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-start justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl min-h-fit my-8 overflow-hidden shadow-2xl relative">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <h2 className="text-xl font-bold text-slate-50 flex items-center gap-3">
            <Upload className="h-6 w-6 text-cyan-400" />
            {t('submissionModal.title')}
          </h2>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-50 transition-colors p-1 hover:bg-slate-700 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
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
                  <span>推定残り時間: {estimatedTimeRemaining}</span>
                </div>
              )}
              
              {/* 大容量ファイル用の案内 */}
              {videoFile && videoFile.size > 800 * 1024 * 1024 && stage.includes('圧縮') && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 backdrop-blur-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-200">
                      大容量ファイルのため圧縮に時間がかかります。ブラウザを閉じずにお待ちください。
                    </div>
                  </div>
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
        <div className="border-t border-slate-700 p-6 sticky bottom-0 bg-slate-800 z-10">
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