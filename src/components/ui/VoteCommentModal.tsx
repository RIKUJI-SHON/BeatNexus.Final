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
  const [error, setError] = useState('');

  // 🔧 コメント必須化: 最小文字数設定
  const MIN_COMMENT_LENGTH = 3;

  // 🔧 バリデーション関数
  const validateComment = (text: string): { isValid: boolean; errorMessage: string } => {
    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
      return {
        isValid: false,
        errorMessage: 'コメントは必須です。投票理由をお聞かせください。'
      };
    }
    
    if (trimmedText.length < MIN_COMMENT_LENGTH) {
      return {
        isValid: false,
        errorMessage: `コメントは${MIN_COMMENT_LENGTH}文字以上で入力してください。`
      };
    }
    
    return {
      isValid: true,
      errorMessage: ''
    };
  };

  const handleVote = () => {
    // 🔧 投票前にバリデーション実行
    const validation = validateComment(comment);
    
    if (!validation.isValid) {
      setError(validation.errorMessage);
      return;
    }

    // バリデーションが通った場合のみ投票実行
    setError('');
    onVote(comment.trim());
    setComment('');
  };

  const handleClose = () => {
    setComment('');
    setError('');
    onClose();
  };

  // 🔧 コメント入力時のリアルタイムバリデーション
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newComment = e.target.value;
    setComment(newComment);
    
    // エラーがある場合はリアルタイムでチェック
    if (error) {
      const validation = validateComment(newComment);
      if (validation.isValid) {
        setError('');
      }
    }
  };

  if (!isOpen) return null;

  const validation = validateComment(comment);
  const isCommentValid = validation.isValid;

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
              コメントは必須です。投票理由をお聞かせください。
            </p>
          </div>

          {/* Comment Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              コメント（必須）
            </label>
            <textarea
              value={comment}
              onChange={handleCommentChange}
              placeholder={`Player ${player}への投票理由を教えてください...`}
              className={`w-full p-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                error 
                  ? 'border-red-500 focus:ring-red-500/50' 
                  : 'focus:ring-cyan-500/50'
              } border ${
                error ? 'border-red-500' : 'border-gray-600'
              } resize-none`}
              rows={3}
              disabled={isLoading}
            />
            
            {/* 文字数カウンタとエラーメッセージ */}
            <div className="mt-1 flex justify-between items-start">
              <div className="text-xs text-gray-500">
                {comment.length}/500文字
              </div>
              
              {/* 🔧 最小文字数インジケーター */}
              {comment.trim().length > 0 && comment.trim().length < MIN_COMMENT_LENGTH && (
                <div className="text-xs text-orange-400">
                  あと{MIN_COMMENT_LENGTH - comment.trim().length}文字必要
                </div>
              )}
            </div>
            
            {/* 🔧 エラーメッセージ表示 */}
            {error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={handleVote}
              disabled={isLoading || !isCommentValid}
              className={`cursor-pointer transition-all text-white px-6 py-2 rounded-lg border-b-[4px] hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed ${
                player === 'A' 
                  ? 'bg-cyan-500 border-cyan-600' 
                  : 'bg-pink-500 border-pink-600'
              } ${
                !isCommentValid ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  投票中...
                </div>
              ) : (
                '投票する'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 