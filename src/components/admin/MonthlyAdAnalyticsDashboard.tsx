// 月次CTR分析用Reactコンポーネント
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, AlertTriangle, Eye, MousePointer } from 'lucide-react';

interface MonthlyStats {
  month_start: string;
  simple_ad_id: string;
  placement_id: string;
  impressions: number;
  clicks: number;
  ctr_percentage: number;
  unique_users_impressions: number;
  statistical_confidence: 'high' | 'medium' | 'low' | 'insufficient';
  impressions_business_hours: number;
  impressions_mobile: number;
  clicks_mobile: number;
}

interface PerformanceTrend {
  month_start: string;
  ctr_percentage: number;
  impressions_growth_rate: number;
  ctr_change_points: number;
  ctr_12month_avg: number;
}

interface Anomaly {
  alert_type: string;
  simple_ad_id: string;
  placement_id: string;
  current_month: string;
  metric_name: string;
  current_value: number;
  severity: 'critical' | 'warning';
}

export const MonthlyAdAnalyticsDashboard: React.FC = () => {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrend[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7)
  );
  const [loading, setLoading] = useState(true);

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      // 月次統計データ
      const { data: monthlyData } = await supabase
        .from('mv_ad_stats_monthly')
        .select('*')
        .gte('month_start', `${selectedMonth}-01`)
        .lte('month_start', `${selectedMonth}-31`)
        .order('ctr_percentage', { ascending: false });

      // パフォーマンストレンド
      const { data: trendData } = await supabase
        .from('vw_monthly_performance_trends')
        .select('*')
        .gte('month_start', new Date(new Date().getFullYear() - 1, 0, 1).toISOString())
        .order('month_start', { ascending: true });

      // 異常検知
      const { data: anomalyData } = await supabase
        .rpc('detect_ad_performance_anomalies', { lookback_months: 3 });

      setMonthlyStats(monthlyData || []);
      setPerformanceTrends(trendData || []);
      setAnomalies(anomalyData || []);
    } catch (error) {
      console.error('Analytics data loading failed:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const refreshMonthlyStats = async () => {
    try {
      const { data } = await supabase.rpc('refresh_mv_ad_stats_monthly');
      console.log('Monthly stats refreshed:', data);
      await loadAnalyticsData();
    } catch (error) {
      console.error('Failed to refresh monthly stats:', error);
    }
  };

  // KPI計算
  const totalImpressions = monthlyStats.reduce((sum, stat) => sum + stat.impressions, 0);
  const totalClicks = monthlyStats.reduce((sum, stat) => sum + stat.clicks, 0);
  const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const highConfidenceAds = monthlyStats.filter(stat => stat.statistical_confidence === 'high').length;

  // トップパフォーマー
  const topPerformers = monthlyStats
    .filter(stat => stat.statistical_confidence !== 'insufficient')
    .sort((a, b) => b.ctr_percentage - a.ctr_percentage)
    .slice(0, 5);

  // プラットフォーム分析
  const platformData = [
    {
      name: 'モバイル',
      impressions: monthlyStats.reduce((sum, stat) => sum + stat.impressions_mobile, 0),
      clicks: monthlyStats.reduce((sum, stat) => sum + stat.clicks_mobile, 0)
    },
    {
      name: 'デスクトップ',
      impressions: monthlyStats.reduce((sum, stat) => sum + (stat.impressions - stat.impressions_mobile), 0),
      clicks: monthlyStats.reduce((sum, stat) => sum + (stat.clicks - stat.clicks_mobile), 0)
    }
  ].map(item => ({
    ...item,
    ctr: item.impressions > 0 ? ((item.clicks / item.impressions) * 100).toFixed(2) : '0.00'
  }));

  if (loading) {
    return <div className="flex items-center justify-center h-64">読み込み中...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">月次広告分析ダッシュボード</h1>
        <div className="flex gap-4 items-center">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <button
            onClick={refreshMonthlyStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            データ更新
          </button>
        </div>
      </div>

      {/* 異常アラート */}
      {anomalies.length > 0 && (
        <div className="border border-orange-500 bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <div>
              <strong>{anomalies.length}件の異常が検出されました:</strong>
              <ul className="mt-2 space-y-1">
                {anomalies.slice(0, 3).map((anomaly, index) => (
                  <li key={index} className={`text-sm ${anomaly.severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`}>
                    広告ID: {anomaly.simple_ad_id.slice(0, 8)}... - {anomaly.metric_name}: {anomaly.current_value}% 
                    ({anomaly.severity === 'critical' ? '重大' : '警告'})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総インプレッション</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総クリック</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均CTR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallCTR.toFixed(4)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">信頼性高い広告</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highConfidenceAds}</div>
            <p className="text-xs text-muted-foreground">
              / {monthlyStats.length} 総広告数
            </p>
          </CardContent>
        </Card>
      </div>

      {/* パフォーマンストレンド表 */}
      <Card>
        <CardHeader>
          <CardTitle>月次パフォーマンストレンド</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">月</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">CTR (%)</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">12ヶ月移動平均</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">成長率 (%)</th>
                </tr>
              </thead>
              <tbody>
                {performanceTrends.slice(-6).map((trend, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">
                      {new Date(trend.month_start).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium">
                      {trend.ctr_percentage?.toFixed(4) || '---'}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      {trend.ctr_12month_avg?.toFixed(4) || '---'}
                    </td>
                    <td className={`border border-gray-300 px-4 py-2 text-right ${
                      (trend.impressions_growth_rate || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trend.impressions_growth_rate?.toFixed(2) || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* プラットフォーム別パフォーマンスとトップパフォーマー */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>プラットフォーム別パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformData.map((platform) => (
                <div key={platform.name} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{platform.name}</h3>
                    <span className="text-lg font-bold text-blue-600">{platform.ctr}%</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {platform.impressions.toLocaleString()} インプレッション / {platform.clicks} クリック
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>トップパフォーマー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div key={performer.simple_ad_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">広告 #{index + 1}</div>
                    <div className="text-sm text-gray-600">
                      {performer.impressions.toLocaleString()} imp. / {performer.clicks} clicks
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      performer.statistical_confidence === 'high' ? 'bg-green-100 text-green-800' :
                      performer.statistical_confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {performer.statistical_confidence === 'high' ? '高信頼' :
                       performer.statistical_confidence === 'medium' ? '中信頼' : '低信頼'}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {performer.ctr_percentage.toFixed(4)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 統計的有意性分布 */}
      <Card>
        <CardHeader>
          <CardTitle>データ信頼性分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {monthlyStats.filter(s => s.statistical_confidence === 'high').length}
              </div>
              <div className="text-sm text-green-800">高信頼</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {monthlyStats.filter(s => s.statistical_confidence === 'medium').length}
              </div>
              <div className="text-sm text-yellow-800">中信頼</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {monthlyStats.filter(s => s.statistical_confidence === 'low').length}
              </div>
              <div className="text-sm text-orange-800">低信頼</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {monthlyStats.filter(s => s.statistical_confidence === 'insufficient').length}
              </div>
              <div className="text-sm text-red-800">不十分</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyAdAnalyticsDashboard;
