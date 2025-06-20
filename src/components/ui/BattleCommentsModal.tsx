import React, { useEffect } from 'react';
import { X, MessageSquare, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BattleComment } from '../../types';
import { useBattleStore } from '../../store/battleStore';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';

interface BattleCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  battleId: string;
  playerAName?: string;
  playerBName?: string;
}

export const BattleCommentsModal: React.FC<BattleCommentsModalProps> = ({
  isOpen,
  onClose,
  battleId,
  playerAName,
  playerBName
}) => {
  const { t, i18n } = useTranslation();
  const { battleComments, commentsLoading, fetchBattleComments } = useBattleStore();
  
  const comments = battleComments[battleId] || [];
  const isLoading = commentsLoading[battleId] || false;

  useEffect(() => {
    if (isOpen && battleId) {
      fetchBattleComments(battleId);
    }
  }, [isOpen, battleId, fetchBattleComments]);

  if (!isOpen) return null;

  const getDefaultAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  const currentLocale = i18n.language === 'ja' ? ja : enUS;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {t('battleCard.commentsModal.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-gray-400">
                <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                {t('battleCard.commentsModal.loading')}
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('battleCard.commentsModal.noComments')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-4 p-4 bg-gray-800 rounded-xl border border-gray-700/50">
                  <div className="relative">
                    <img
                      src={comment.avatar_url || getDefaultAvatarUrl(comment.user_id)}
                      alt={comment.username}
                      className="w-10 h-10 rounded-full border-2 border-gray-600 object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                      comment.vote === 'A' ? 'bg-gradient-to-r from-cyan-500 to-cyan-400' : 'bg-gradient-to-r from-pink-500 to-pink-400'
                    }`}>
                      <span className="text-white font-bold text-xs">{comment.vote}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        {comment.username}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        comment.vote === 'A' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'
                      }`}>
                        Player {comment.vote}に投票
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.created_at), 'PPp', { locale: currentLocale })}
                      </span>
                    </div>
                    
                    {/* Comment Content */}
                    {comment.comment ? (
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {comment.comment}
                      </p>
                    ) : (
                      <p className="text-gray-500 text-sm italic">投票のみ</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="cursor-pointer transition-all text-white px-6 py-2 rounded-lg border-b-[4px] bg-gray-700 border-gray-800 hover:brightness-110 hover:-translate-y-[1px] hover:border-b-[6px] active:border-b-[2px] active:brightness-90 active:translate-y-[2px]"
            >
              {t('battleCard.commentsModal.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 