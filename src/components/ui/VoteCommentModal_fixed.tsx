import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// import { SuperTipVoteModal } from '../voting/SuperTipVoteModal'; // Temporarily disabled - will be reimplemented

interface VoteCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (comment: string) => void;
  onSimpleVote: (player: 'A' | 'B') => void;
  player: 'A' | 'B';
  playerName?: string;
  isLoading?: boolean;
  battleId?: string;
}

export const VoteCommentModal: React.FC<VoteCommentModalProps> = ({
  isOpen,
  onClose,
  onVote,
  onSimpleVote,
  player,
  playerName,
  isLoading = false,
  battleId
}) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const [showError, setShowError] = useState(false);
  const [showSuperTipModal, setShowSuperTipModal] = useState(false);

  const handleCommentVote = () => {
    const trimmedComment = comment.trim();
    
    if (!trimmedComment) {
      setShowError(true);
      return;
    }
    
    onVote(trimmedComment);
  };

  const handleSimpleVote = () => {
    onSimpleVote(player);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
    if (showError && e.target.value.trim()) {
      setShowError(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md md:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${player === 'A' ? 'bg-cyan-400' : 'bg-pink-400'}`}></div>
              <h2 className="text-xl font-bold text-white">
                {t('voteCommentModal.title')} {playerName || `Player ${player}`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
              disabled={isLoading}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {/* SuperTip Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                ⭐ SuperTip で応援
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                応援したいプレイヤーにSuperTipを送って、特別な投票をしよう！
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { amount: 100, label: '¥100' },
                  { amount: 300, label: '¥300' },
                  { amount: 500, label: '¥500' },
                  { amount: 1000, label: '¥1,000' }
                ].map((tip) => (
                  <button
                    key={tip.amount}
                    onClick={() => {
                      if (battleId) {
                        setShowSuperTipModal(true);
                      } else {
                        alert('バトルIDが設定されていません');
                      }
                    }}
                    disabled={isLoading}
                    className="p-3 rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 border border-yellow-500 hover:border-yellow-400 transition-all text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {tip.label}
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
                placeholder={t('voteCommentModal.commentPlaceholder', { player: playerName || `Player ${player}` })}
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

      {/* SuperTip Modal */}
      {battleId && showSuperTipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Super Tips機能</h3>
            <p className="text-slate-400 mb-6">Super Tips機能は現在開発中です。実装完了まで少々お待ちください。</p>
            <button 
              onClick={() => setShowSuperTipModal(false)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
};
