import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, CheckCircle, Plus, BarChart3, RefreshCw } from 'lucide-react';

import { Button } from './Button';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

interface MonthlyLimitData {
  used_count: number;
  limit: number;
  remaining: number;
  reset_date: string;
  can_submit: boolean;
}

export const MonthlyLimitCard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [monthlyData, setMonthlyData] = useState<MonthlyLimitData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 月間制限データを取得
  const fetchMonthlyData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // 今月の投稿数を取得（実際のデータベースクエリ）
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (error) {
        console.error('Error fetching monthly submissions:', error);
        return;
      }

      const usedCount = submissions?.length || 0;
      const limit = 30; // 月間上限
      const remaining = Math.max(0, limit - usedCount);
      
      // 次月の1日を計算
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const resetDate = nextMonth.toLocaleDateString(t('common.locale', 'ja-JP'), {
        month: 'long',
        day: 'numeric'
      });

      setMonthlyData({
        used_count: usedCount,
        limit: limit,
        remaining: remaining,
        reset_date: resetDate,
        can_submit: remaining > 0
      });

    } catch (error) {
      console.error('Error in fetchMonthlyData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMonthlyData();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="glowing-card">
        <div className="glowing-card__content p-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="font-medium text-white mb-2">{t('monthlyLimit.title')}</h3>
            <p className="text-sm text-gray-400 mb-3">
              {t('monthlyLimit.loginToCheck')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glowing-card">
        <div className="glowing-card__content p-4">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-gray-400">{t('monthlyLimit.checkingStatus')}</p>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = monthlyData ? (monthlyData.used_count / monthlyData.limit) * 100 : 0;
  const isNearLimit = monthlyData ? monthlyData.remaining <= 5 : false;
  const isAtLimit = monthlyData ? monthlyData.remaining === 0 : false;

  return (
    <div className="glowing-card">
      <div className="glowing-card__content p-4">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-cyan-400">
              {t('monthlyLimit.title')}
            </h2>
          </div>
          <p className="text-xs text-gray-400">{t('monthlyLimit.subtitle')}</p>
        </div>

        {monthlyData && (
          <>
            {/* 残り投稿回数 */}
            <div className="mb-4">
              <div className="text-center mb-3">
                <div className="text-3xl font-bold text-white mb-1">
                  {monthlyData.remaining}
                </div>
                <div className="text-sm text-gray-400">{t('monthlyLimit.remainingPosts')}</div>
              </div>

              {/* プログレスバー */}
              <div className="space-y-2">
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isAtLimit 
                        ? 'bg-red-500' 
                        : isNearLimit 
                        ? 'bg-yellow-500' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{t('monthlyLimit.usedPosts', { count: monthlyData.used_count })}</span>
                  <span>{t('monthlyLimit.limitPosts', { count: monthlyData.limit })}</span>
                </div>
              </div>
            </div>

            {/* リセット日 */}
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4 text-gray-400" />
                <span className="text-gray-400">{t('monthlyLimit.resetLabel')}</span>
                <span className="font-medium text-white">{monthlyData.reset_date}</span>
              </div>
            </div>

            {/* アクションボタン */}
            {monthlyData.can_submit ? (
              <div className="space-y-3">
                {isNearLimit && (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-400">{t('monthlyLimit.nearLimitWarning')}</span>
                    </div>
                    <p className="text-xs text-yellow-200">
                      {t('monthlyLimit.nearLimitMessage', { count: monthlyData.remaining })}
                    </p>
                  </div>
                )}
                
                <Link to="/post" className="block">
                  <Button
                    variant="primary"
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    {t('monthlyLimit.postVideoButton')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-xs font-medium text-red-400">{t('monthlyLimit.limitReachedTitle')}</span>
                    </div>
                    <p className="text-xs text-red-200">
                      {t('monthlyLimit.limitReachedMessage', { date: monthlyData.reset_date })}
                    </p>
                  </div>

                                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-400 cursor-not-allowed text-sm"
                    disabled
                  >
                    {t('monthlyLimit.limitReachedButton')}
                  </Button>
              </div>
            )}
          </>
        )}

        {/* 説明 */}
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-400 text-center">
            {t('monthlyLimit.qualityMessage')}
          </p>
        </div>
      </div>
    </div>
  );
}; 