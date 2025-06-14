import React, { useState } from 'react';
import { X, ThumbsUp, MessageCircle } from 'lucide-react';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface VoteCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (comment?: string) => void;
  player: 'A' | 'B';
  playerName?: string;
  isLoading?: boolean;
}

export const VoteCommentModal: React.FC<VoteCommentModalProps> = ({
  isOpen,
  onClose,
  onVote,
  player,
  playerName,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');

  const handleVote = () => {
    onVote(comment.trim() || undefined);
    setComment('');
  };

  const handleVoteOnly = () => {
    onVote();
    setComment('');
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  const playerColor = player === 'A' ? 'cyan' : 'pink';
  const gradientClass = player === 'A' 
    ? 'from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400' 
    : 'from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${
              player === 'A' ? 'from-cyan-500 to-cyan-400' : 'from-pink-500 to-pink-400'
            } flex items-center justify-center`}>
              <span className="text-white font-bold text-sm">{player}</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              Vote for Player {player}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-gray-300 text-sm mb-3">
              {playerName ? `${playerName}への投票` : `Player ${player}への投票`}
            </p>
            <p className="text-gray-400 text-xs">
              コメントは任意です。投票のみも可能です。
            </p>
          </div>

          {/* Comment Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              コメント（任意）
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Player ${player}についての感想をシェアしてください...`}
              className="w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 border border-gray-600 resize-none"
              rows={3}
              disabled={isLoading}
            />
            <div className="mt-1 text-xs text-gray-500">
              {comment.length}/500文字
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Vote with Comment Button */}
            {comment.trim() && (
              <Button
                onClick={handleVote}
                disabled={isLoading}
                className={`bg-gradient-to-r ${gradientClass} shadow-lg flex-1`}
                leftIcon={isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
              >
                コメント付きで投票
              </Button>
            )}

            {/* Vote Only Button */}
            <Button
              onClick={handleVoteOnly}
              disabled={isLoading}
              variant={comment.trim() ? "outline" : "primary"}
              className={comment.trim() ? 
                "border-gray-600 text-gray-300 hover:bg-gray-700 flex-1" : 
                `bg-gradient-to-r ${gradientClass} shadow-lg flex-1`
              }
              leftIcon={isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <ThumbsUp className="h-4 w-4" />
              )}
            >
              {comment.trim() ? "投票のみ" : "投票する"}
            </Button>
          </div>

          {/* Cancel Button */}
          <div className="mt-3">
            <Button
              onClick={handleClose}
              disabled={isLoading}
              variant="ghost"
              className="w-full text-gray-400 hover:text-white hover:bg-gray-700"
            >
              キャンセル
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 