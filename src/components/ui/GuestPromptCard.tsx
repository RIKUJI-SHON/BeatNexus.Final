import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Trophy, Star, Sparkles } from 'lucide-react';

interface GuestPromptCardProps {
  onSignUpClick: () => void;
}

export const GuestPromptCard: React.FC<GuestPromptCardProps> = ({ onSignUpClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 backdrop-blur-sm">
      <div className="p-6">
        {/* ヘッダーアイコン */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-400/30">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            {/* 装飾的なグロー効果 */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-50" />
          </div>
        </div>

        {/* タイトル */}
        <h3 className="text-lg font-semibold text-white mb-3 text-center">
          {t('guestPrompt.title', 'BeatNexusを始めよう')}
        </h3>

        {/* 説明 */}
        <p className="text-slate-300 text-sm text-center mb-6 leading-relaxed">
          {t('guestPrompt.description', 'アカウントを作成して、バトルに参加し、ランキングに挑戦しましょう')}
        </p>

        {/* 機能ハイライト */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-purple-500/20 rounded-md flex items-center justify-center">
              <UserPlus className="w-3 h-3 text-purple-400" />
            </div>
            <span className="text-slate-300 text-sm">
              {t('guestPrompt.feature.battles', 'バトルに参加')}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-purple-500/20 rounded-md flex items-center justify-center">
              <Trophy className="w-3 h-3 text-purple-400" />
            </div>
            <span className="text-slate-300 text-sm">
              {t('guestPrompt.feature.ranking', 'ランキング挑戦')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-purple-500/20 rounded-md flex items-center justify-center">
              <Star className="w-3 h-3 text-purple-400" />
            </div>
            <span className="text-slate-300 text-sm">
              {t('guestPrompt.feature.points', 'ポイント獲得')}
            </span>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <Button 
            variant="primary"
            size="sm" 
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
            onClick={onSignUpClick}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('common.signup', 'アカウント作成')}
          </Button>
          
          <Button 
            variant="secondary"
            size="sm" 
            className="w-full bg-slate-800/60 border border-slate-600/40 text-slate-200 hover:bg-slate-700/60 hover:border-slate-500/50"
            onClick={() => navigate('/ranking')}
          >
            <Trophy className="w-4 h-4 mr-2" />
            {t('guestPrompt.exploreRanking', 'ランキングを見る')}
          </Button>
        </div>

        {/* 装飾的なパーティクル */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20" aria-hidden="true">
          <div className="absolute top-4 right-4 w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
          <div className="absolute bottom-6 left-4 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-8 w-1 h-1 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      </div>
    </Card>
  );
};
