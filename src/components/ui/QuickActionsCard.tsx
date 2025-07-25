import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trophy, BarChart3, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const QuickActionsCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <Card className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-5 h-5 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-md flex items-center justify-center">
            <BarChart3 className="w-3 h-3 text-cyan-400" />
          </div>
          {t('quickActions.title', 'クイックアクション')}
        </h3>
        
        <div className="space-y-3">
          {/* バトル作成 */}
          <Button 
            variant="primary" 
            size="sm" 
            className="w-full justify-start bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium"
            onClick={() => navigate('/post')}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('quickActions.createBattle', 'バトルを作成')}
          </Button>
          
          {/* ランキング確認 */}
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full justify-start bg-slate-800/60 border border-slate-600/40 text-slate-200 hover:bg-slate-700/60 hover:border-slate-500/50"
            onClick={() => navigate('/ranking')}
          >
            <Trophy className="w-4 h-4 mr-2" />
            {t('quickActions.viewRanking', 'ランキングを見る')}
          </Button>
          
          {/* プロフィール確認 */}
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full justify-start bg-slate-800/60 border border-slate-600/40 text-slate-200 hover:bg-slate-700/60 hover:border-slate-500/50"
            onClick={() => navigate('/profile')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {t('quickActions.viewProfile', 'マイプロフィール')}
          </Button>

          {/* コミュニティ */}
          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full justify-start bg-slate-800/60 border border-slate-600/40 text-slate-200 hover:bg-slate-700/60 hover:border-slate-500/50"
            onClick={() => navigate('/community')}
          >
            <Users className="w-4 h-4 mr-2" />
            {t('quickActions.viewCommunity', 'コミュニティ')}
          </Button>
        </div>
      </div>
    </Card>
  );
};
