import React, { useState } from 'react';
import { Clock, Video, AlertCircle, X, Play, Search, Timer } from 'lucide-react';
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



  return (
    <Card className="group relative bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700/50 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-500 overflow-hidden">
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-100%] transition-transform duration-1000"></div>
      </div>

      {/* Pulsing Border for "Searching" Effect */}
      <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-xl animate-pulse"></div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Timer className="h-3 w-3" />
            {t('myBattlesPage.waitingSubmissionCard.postedAt', { 
              time: formatDistanceToNow(new Date(submission.created_at)) 
            })}
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-4">
          {/* Video Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-32 h-20 rounded-xl overflow-hidden bg-gray-800 relative shadow-lg border border-gray-700/50">
              {!thumbnailError ? (
                <video
                  src={submission.video_url}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                  onError={() => setThumbnailError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <Video className="h-8 w-8 text-gray-600" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Play className="h-5 w-5 text-white ml-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-4">
            
            {/* Status Section */}
            <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <Search className="h-5 w-5 text-cyan-400 animate-pulse" />
                  <div className="absolute inset-0 animate-ping">
                    <Search className="h-5 w-5 text-cyan-400/50" />
                  </div>
                </div>
                <span className="font-bold text-cyan-400 text-lg">
                  {t('myBattlesPage.waitingSubmissionCard.searchingOpponent')}
                </span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {t('myBattlesPage.waitingSubmissionCard.searchingDescription')}
              </p>
            </div>

            {/* Action Area */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 truncate max-w-[200px] bg-gray-800/30 px-2 py-1 rounded-lg">
                📁 {submission.video_url.split('/').pop()?.split('?')[0] || ''}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleWithdraw}
                isLoading={withdrawing}
                className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 text-xs px-4 py-2 font-medium transition-all duration-300"
                leftIcon={<X className="h-3 w-3" />}
              >
                {t('myBattlesPage.waitingSubmissionCard.withdrawButton')}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-3 text-sm text-red-400 bg-red-500/20 border border-red-500/30 p-4 rounded-xl backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
      </div>
    </Card>
  );
};