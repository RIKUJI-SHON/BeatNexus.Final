import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VoteCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (comment: string) => void;
  onSimpleVote: (player: 'A' | 'B') => void;
  player: 'A' | 'B';
  playerName?: string;
  isLoading?: boolean;
}

export const VoteCommentModal: React.FC<VoteCommentModalProps> = ({
  isOpen,
  onClose,
  onVote,
  onSimpleVote,
  player,
  playerName,
  isLoading = false
}) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const [showError, setShowError] = useState(false);

  const handleCommentVote = () => {
    const trimmedComment = comment.trim();
    
    // コメント付き投票の場合はコメントが必須
    if (!trimmedComment) {
      setShowError(true);
      return;
    }
    
    onVote(trimmedComment);
    setComment('');
    setShowError(false);
  };

  const handleSimpleVote = () => {
    // 普通の投票はコメントなしでもOK
    onSimpleVote(player);
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

  const handleTemplateSelect = (template: string) => {
    setComment(template);
    // テンプレート選択時にエラーを非表示
    if (showError) {
      setShowError(false);
    }
  };

  if (!isOpen) return null;

  const isCommentEmpty = !comment.trim();
  const templates = t('voteCommentModal.templates', { returnObjects: true }) as string[];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md md:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${
              player === 'A' ? 'from-cyan-500 to-cyan-400' : 'from-pink-500 to-pink-400'
            } flex items-center justify-center`}>
              <span className="text-white font-bold text-sm">{player}</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {playerName ? t('voteCommentModal.title', { player: playerName }) : t('voteCommentModal.title', { player: `Player ${player}` })}
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

          {/* Template Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              {t('voteCommentModal.templateTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => handleTemplateSelect(template)}
                  disabled={isLoading}
                  className="text-left p-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 transition-all text-gray-300 hover:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>

          {/* Comment Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('voteCommentModal.commentLabel')}
            </label>
            <textarea
              value={comment}
              onChange={handleCommentChange}
              placeholder={playerName ? t('voteCommentModal.commentPlaceholder', { player: playerName }) : t('voteCommentModal.commentPlaceholder', { player: `Player ${player}` })}
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Comment Vote Button */}
            <button
              onClick={handleCommentVote}
              disabled={isLoading}
              className={`cursor-pointer transition-all text-white px-6 py-3 rounded-lg border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed ${
                player === 'A' 
                  ? 'bg-cyan-500 border-cyan-600' 
                  : 'bg-pink-500 border-pink-600'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('voteCommentModal.voting')}
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>💬 {t('voteCommentModal.commentVote')} ({t('voteCommentModal.commentVotePoints')})</span>
                </div>
              )}
            </button>

            {/* Simple Vote Button */}
            <button
              onClick={handleSimpleVote}
              disabled={isLoading}
              className="cursor-pointer transition-all text-white px-6 py-3 rounded-lg border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed bg-gray-600 border-gray-700"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('voteCommentModal.voting')}
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>👍 {t('voteCommentModal.simpleVote')} ({t('voteCommentModal.simpleVotePoints')})</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 