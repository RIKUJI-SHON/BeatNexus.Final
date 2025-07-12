import React from 'react';
import { X, Video, FileText, Zap, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';
import { useTranslation } from 'react-i18next';

interface VideoCompressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  phase: 'initializing' | 'analyzing' | 'compressing' | 'finalizing';
  originalFileSize: number;
  targetSizeMB?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const VideoCompressionModal: React.FC<VideoCompressionModalProps> = ({
  isOpen,
  onClose,
  progress,
  phase,
  originalFileSize,
  targetSizeMB = 40
}) => {
  const { t } = useTranslation();

  const getPhaseIcon = () => {
    switch (phase) {
      case 'initializing':
        return <Video className="w-5 h-5 text-blue-500" />;
      case 'analyzing':
        return <FileText className="w-5 h-5 text-yellow-500" />;
      case 'compressing':
        return <Zap className="w-5 h-5 text-purple-500" />;
      case 'finalizing':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'initializing':
        return t('videoCompression.initializing');
      case 'analyzing':
        return t('videoCompression.analyzing');
      case 'compressing':
        return t('videoCompression.compressing');
      case 'finalizing':
        return t('videoCompression.finalizing');
    }
  };

  // 進捗に基づいて色を変更
  const getProgressColor = () => {
    if (progress < 25) return 'bg-blue-500';
    if (progress < 50) return 'bg-yellow-500';
    if (progress < 90) return 'bg-purple-500';
    return 'bg-green-500';
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="w-6 h-6 text-purple-500" />
            {t('videoCompression.title')}
          </h2>
        </div>

        {/* 進捗表示 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getPhaseIcon()}
              <span className="text-sm font-medium text-gray-300">
                {getPhaseText()}
              </span>
            </div>
            <span className="text-sm font-bold text-white">
              {Math.round(progress)}%
            </span>
          </div>
          
          {/* 進捗バー */}
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full ${getProgressColor()} transition-all duration-300 ease-out`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          
          {/* デバッグ情報 */}
          <div className="mt-2 text-xs text-gray-400">
            Phase: {phase} | Progress: {progress.toFixed(1)}%
          </div>
        </div>

        {/* ファイル情報 */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            {t('videoCompression.fileInfo')}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">
                {t('videoCompression.originalSize')}:
              </span>
              <span className="text-sm font-medium text-white">
                {formatFileSize(originalFileSize)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">
                {t('videoCompression.targetSize')}:
              </span>
              <span className="text-sm font-medium text-green-400">
                {targetSizeMB}MB 以下
              </span>
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-200 font-medium mb-1">
                {t('videoCompression.notice')}
              </p>
              <p className="text-xs text-yellow-300/80">
                圧縮処理中はブラウザを閉じないでください。処理には数分かかる場合があります。
              </p>
            </div>
          </div>
        </div>

        {/* 現在の処理詳細 */}
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-400">
            {t('videoCompression.currentPhase')}: {getPhaseText()}
          </p>
          {phase === 'compressing' && (
            <p className="text-xs text-gray-500 mt-1">
              音質を保持しながら画質を調整中...
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}; 