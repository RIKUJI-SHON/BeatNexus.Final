import React from 'react';
import { Card } from './Card';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useRankingStore } from '../../store/rankingStore';
import { Crown, Star, TrendingUp, Award } from 'lucide-react';
import { getRankColorClasses } from '../../utils/rankUtils';

export const UserSummaryCard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { rankings } = useRankingStore();

  if (!user) return null;

  // ユーザーのランキング情報を取得
  const userRanking = rankings?.find(r => r.user_id === user.id);
  const userRank = userRanking ? rankings.findIndex(r => r.user_id === user.id) + 1 : null;
  const seasonPoints = userRanking?.total_points || 0;
  const userLevel = user.level || 1;

  // ランクに基づく色の取得
  const rankColorClass = getRankColorClasses(userRank || 999);

  return (
    <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-700/50 backdrop-blur-sm">
      <div className="p-6">
        {/* ユーザー情報ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          {/* アバター */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-slate-600/50">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="text-lg font-bold text-cyan-400">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* ランクインジケーター */}
            {userRank && userRank <= 10 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                <Crown className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          {/* ユーザー名とレベル */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">
              {user.username}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                <span className="text-slate-400 text-sm">
                  {t('userSummary.level', 'レベル')} {userLevel}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 統計情報 */}
        <div className="space-y-4">
          {/* シーズンポイント */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 text-sm">
                {t('userSummary.seasonPoints', 'シーズンポイント')}
              </span>
            </div>
            <span className="text-cyan-400 font-semibold">
              {seasonPoints.toLocaleString()}
            </span>
          </div>

          {/* ランキング */}
          {userRank && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300 text-sm">
                  {t('userSummary.currentRank', '現在のランク')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`font-semibold ${rankColorClass.text}`}>
                  #{userRank}
                </span>
                <span className="text-slate-400 text-xs">
                  / {rankings?.length || 0}
                </span>
              </div>
            </div>
          )}

          {/* プログレスバー（今月のアクティビティ） */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">
                {t('userSummary.monthlyActivity', '今月のアクティビティ')}
              </span>
              <span className="text-cyan-400">
                {Math.min(Math.floor((seasonPoints / 1000) * 100), 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${Math.min(Math.floor((seasonPoints / 1000) * 100), 100)}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* ランクバッジ（上位ランクの場合） */}
        {userRank && userRank <= 3 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-400/20">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-sm font-medium">
                {userRank === 1 && t('userSummary.rank.champion', 'チャンピオン')}
                {userRank === 2 && t('userSummary.rank.runner_up', '準優勝')}
                {userRank === 3 && t('userSummary.rank.third_place', '3位入賞')}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
