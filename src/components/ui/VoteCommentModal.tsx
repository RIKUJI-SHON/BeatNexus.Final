import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VoteCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (comment: string) => void;
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
  const [showError, setShowError] = useState(false);

  const handleVote = () => {
    const trimmedComment = comment.trim();
    
    // コメントが空の場合はエラーを表示
    if (!trimmedComment) {
      setShowError(true);
      return;
    }
    
    onVote(trimmedComment);
    setComment('');
    setShowError(false);
  };

  const handleClose = () => {
    setComment('');
    setShowError(false);
    onClose();
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    // 入力開始時にエラーを非表示
    if (showError && e.target.value.trim()) {
      setShowError(false);
    }
  };

  if (!isOpen) return null;

  const isCommentEmpty = !comment.trim();

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
              {t('voteCommentModal.title', { player })}
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
              {playerName ? t('voteCommentModal.subtitle', { playerName }) : t('voteCommentModal.subtitle', { playerName: `Player ${player}` })}
            </p>
            <p className="text-gray-400 text-xs">
              {t('voteCommentModal.description')}
            </p>
          </div>

          {/* Comment Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('voteCommentModal.commentLabel')}
            </label>
            <textarea
              value={comment}
              onChange={handleCommentChange}
              placeholder={t('voteCommentModal.commentPlaceholder', { player })}
              className={`w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 border resize-none ${
                showError ? 'border-red-500 focus:ring-red-500/50' : 'border-gray-600 focus:ring-cyan-500/50'
              }`}
              rows={3}
              disabled={isLoading}
              maxLength={500}
            />
            <div className="mt-1 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                {t('voteCommentModal.characterCount', { count: comment.length })}
              </div>
              {showError && (
                <div className="text-xs text-red-400">
                  {t('voteCommentModal.commentRequired')}
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={handleVote}
              disabled={isLoading}
              className={`cursor-pointer transition-all text-white px-6 py-2 rounded-lg border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed ${
                player === 'A' 
                  ? 'bg-cyan-500 border-cyan-600' 
                  : 'bg-pink-500 border-pink-600'
              } ${isCommentEmpty ? 'opacity-60' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('voteCommentModal.voting')}
                </div>
              ) : (
                t('voteCommentModal.voteButton')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 