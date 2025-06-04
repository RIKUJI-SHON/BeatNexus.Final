import React, { useState } from 'react';
import { Clock, Video, AlertCircle, X, Play } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { type Submission } from '../../store/submissionStore';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface WaitingSubmissionCardProps {
  submission: Submission;
  onWithdraw: (id: string) => Promise<void>;
}

export const WaitingSubmissionCard: React.FC<WaitingSubmissionCardProps> = ({
  submission,
  onWithdraw
}) => {
  const { t } = useTranslation();
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);

  const handleWithdraw = async () => {
    if (!confirm(t('myBattlesPage.waitingSubmissionCard.withdrawConfirm'))) return;
    
    setWithdrawing(true);
    setError(null);
    try {
      await onWithdraw(submission.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('myBattlesPage.waitingSubmissionCard.withdrawError'));
    } finally {
      setWithdrawing(false);
    }
  };

  const formatBattleType = (type: string) => {
    const key = `myBattlesPage.waitingSubmissionCard.battleFormats.${type}`;
    return t(key, type); // fallback to the original type if translation not found
  };

  return (
    <Card className="bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="p-6">
        <div className="flex gap-4">
          {/* Video Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-800 relative">
              {!thumbnailError ? (
                <video
                  src={submission.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                  onError={() => setThumbnailError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="h-6 w-6 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="h-4 w-4 text-white opacity-60" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-cyan-400" />
            <span className="font-medium text-white">
              {formatBattleType(submission.battle_format)}
            </span>
          </div>
          <div className="text-sm text-gray-400">
                {t('myBattlesPage.waitingSubmissionCard.postedAt', { 
                  time: formatDistanceToNow(new Date(submission.created_at)) 
                })}
          </div>
        </div>

            <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <Clock className="h-4 w-4 animate-pulse" />
                <span className="font-semibold text-sm">
                  {t('myBattlesPage.waitingSubmissionCard.searchingOpponent')}
                </span>
          </div>
              <p className="text-gray-400 text-xs">
                {t('myBattlesPage.waitingSubmissionCard.searchingDescription')}
          </p>
        </div>

        <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                {t('myBattlesPage.waitingSubmissionCard.videoUrl', { 
                  url: submission.video_url.split('/').pop()?.split('?')[0] || ''
                })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWithdraw}
            isLoading={withdrawing}
                className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs px-3 py-1"
                leftIcon={<X className="h-3 w-3" />}
          >
                {t('myBattlesPage.waitingSubmissionCard.withdrawButton')}
          </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    </Card>
  );
};