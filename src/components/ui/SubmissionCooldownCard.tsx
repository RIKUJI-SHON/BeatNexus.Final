import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
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
      // テスト段階のため上限は無制限
      const limit = Infinity; // 無制限
      const remaining = Infinity; // 常に無制限
      
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
        can_submit: true // テスト段階では常に投稿可能
      });

    } catch (error) {
      console.error('Error in fetchMonthlyData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <div className="bg-slate-950 border border-slate-700 shadow-2xl rounded-xl p-6 transition-all duration-300 hover:border-slate-600">
        <div className="text-center">
          <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-50 mb-2 text-lg">{t('monthlyLimit.title')}</h3>
          <p className="text-sm text-slate-400">
            {t('monthlyLimit.loginToCheck')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-950 border border-slate-700 shadow-2xl rounded-xl p-6 transition-all duration-300">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">{t('monthlyLimit.checkingStatus')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-700 shadow-2xl rounded-xl p-6 transition-all duration-300 hover:border-slate-600">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 bg-slate-800/50 rounded-full flex items-center justify-center">
            <Calendar className="h-5 w-5 text-cyan-400" />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-slate-50">
          {t('monthlyLimit.title')}
        </h2>
      </div>

      {monthlyData && (
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-6 border border-slate-600 hover:border-cyan-500/30 transition-all">
          {/* 投稿統計 */}
          <div className="text-center mb-6">
            <div className="text-xs text-slate-400 mb-2 uppercase font-medium tracking-wider">
              今月の投稿数
            </div>
            <div className="text-4xl font-bold text-cyan-400 mb-3">
              {monthlyData.used_count}
            </div>
            <div className="text-sm text-slate-300 font-medium">
              {monthlyData.remaining === Infinity ? '無制限で投稿可能' : `残り ${monthlyData.remaining} 回`}
            </div>
          </div>

          {/* プログレスバー（テスト版では装飾として） */}
          <div className="mb-6">
            <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full transition-all duration-500 bg-gradient-to-r from-cyan-500 to-purple-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* リセット情報 */}
          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30 mb-4">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
              <RefreshCw className="h-4 w-4 flex-shrink-0" />
              <span>次回リセット: {monthlyData.reset_date}</span>
            </div>
          </div>

          {/* 説明 */}
          <div className="pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              テスト期間中は無制限で投稿できます
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 