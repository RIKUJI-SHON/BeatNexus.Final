// 月次データ分析とレポート生成のためのユーティリティ
import { supabase } from '@/lib/supabase';

export interface AdPerformanceMetrics {
  totalImpressions: number;
  totalClicks: number;
  overallCTR: number;
  uniqueUsers: number;
  conversionRate: number;
  averageEngagementTime: number;
  topPerformingPlacements: Array<{
    placement_id: string;
    ctr: number;
    impressions: number;
    revenue?: number;
  }>;
  demographicBreakdown: {
    mobile: { impressions: number; clicks: number; ctr: number };
    desktop: { impressions: number; clicks: number; ctr: number };
    businessHours: { impressions: number; clicks: number; ctr: number };
    weekends: { impressions: number; clicks: number; ctr: number };
  };
  seasonalTrends: Array<{
    month: string;
    ctr: number;
    impressionGrowth: number;
    anomalies: string[];
  }>;
}

export interface DataQualityAssessment {
  totalDataPoints: number;
  highConfidenceAds: number;
  mediumConfidenceAds: number;
  lowConfidenceAds: number;
  insufficientDataAds: number;
  dataReliabilityScore: number; // 0-100
  recommendedActions: string[];
}

export interface CompetitiveAnalysis {
  benchmarkCTR: number; // 業界平均
  performanceVsBenchmark: 'above' | 'below' | 'on-par';
  improvementOpportunities: string[];
  strengths: string[];
}

export class AdAnalyticsEngine {
  /**
   * 月次包括的分析の実行
   */
  static async runMonthlyAnalysis(targetMonth: string): Promise<{
    metrics: AdPerformanceMetrics;
    quality: DataQualityAssessment;
    insights: string[];
    recommendations: string[];
  }> {
    try {
      // 1. 基本メトリクス収集
      const metrics = await this.calculatePerformanceMetrics(targetMonth);
      
      // 2. データ品質評価
      const quality = await this.assessDataQuality(targetMonth);
      
      // 3. インサイト生成
      const insights = await this.generateInsights(metrics, quality);
      
      // 4. 推奨アクション生成
      const recommendations = await this.generateRecommendations(metrics, quality);
      
      return { metrics, quality, insights, recommendations };
    } catch (error) {
      console.error('Monthly analysis failed:', error);
      throw error;
    }
  }

  /**
   * パフォーマンスメトリクス計算
   */
  private static async calculatePerformanceMetrics(targetMonth: string): Promise<AdPerformanceMetrics> {
    const { data: monthlyStats } = await supabase
      .from('mv_ad_stats_monthly')
      .select('*')
      .gte('month_start', `${targetMonth}-01`)
      .lt('month_start', `${targetMonth}-31`);

    if (!monthlyStats || monthlyStats.length === 0) {
      throw new Error('No data available for the specified month');
    }

    const totalImpressions = monthlyStats.reduce((sum, stat) => sum + stat.impressions, 0);
    const totalClicks = monthlyStats.reduce((sum, stat) => sum + stat.clicks, 0);
    const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // プレースメント別パフォーマンス
    const placementPerformance = new Map<string, { impressions: number; clicks: number }>();
    monthlyStats.forEach(stat => {
      const key = stat.placement_id;
      const existing = placementPerformance.get(key) || { impressions: 0, clicks: 0 };
      placementPerformance.set(key, {
        impressions: existing.impressions + stat.impressions,
        clicks: existing.clicks + stat.clicks
      });
    });

    const topPerformingPlacements = Array.from(placementPerformance.entries())
      .map(([placement_id, data]) => ({
        placement_id,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        impressions: data.impressions
      }))
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 5);

    // デバイス別分析
    const mobileImpressions = monthlyStats.reduce((sum, stat) => sum + (stat.impressions_mobile || 0), 0);
    const mobileClicks = monthlyStats.reduce((sum, stat) => sum + (stat.clicks_mobile || 0), 0);
    const desktopImpressions = totalImpressions - mobileImpressions;
    const desktopClicks = totalClicks - mobileClicks;

    // 営業時間分析
    const businessHoursImpressions = monthlyStats.reduce((sum, stat) => sum + (stat.impressions_business_hours || 0), 0);
    const businessHoursClicks = monthlyStats.reduce((sum, stat) => sum + (stat.clicks_business_hours || 0), 0);

    // 平日分析
    const weekdayImpressions = monthlyStats.reduce((sum, stat) => sum + (stat.impressions_weekdays || 0), 0);
    const weekdayClicks = monthlyStats.reduce((sum, stat) => sum + (stat.clicks_weekdays || 0), 0);

    return {
      totalImpressions,
      totalClicks,
      overallCTR,
      uniqueUsers: monthlyStats.reduce((sum, stat) => sum + (stat.unique_users_impressions || 0) + (stat.unique_anon_impressions || 0), 0),
      conversionRate: 0, // 将来実装
      averageEngagementTime: 0, // 将来実装
      topPerformingPlacements,
      demographicBreakdown: {
        mobile: {
          impressions: mobileImpressions,
          clicks: mobileClicks,
          ctr: mobileImpressions > 0 ? (mobileClicks / mobileImpressions) * 100 : 0
        },
        desktop: {
          impressions: desktopImpressions,
          clicks: desktopClicks,
          ctr: desktopImpressions > 0 ? (desktopClicks / desktopImpressions) * 100 : 0
        },
        businessHours: {
          impressions: businessHoursImpressions,
          clicks: businessHoursClicks,
          ctr: businessHoursImpressions > 0 ? (businessHoursClicks / businessHoursImpressions) * 100 : 0
        },
        weekends: {
          impressions: totalImpressions - weekdayImpressions,
          clicks: totalClicks - weekdayClicks,
          ctr: (totalImpressions - weekdayImpressions) > 0 ? ((totalClicks - weekdayClicks) / (totalImpressions - weekdayImpressions)) * 100 : 0
        }
      },
      seasonalTrends: [] // 将来実装: 年間トレンド分析
    };
  }

  /**
   * データ品質評価
   */
  private static async assessDataQuality(targetMonth: string): Promise<DataQualityAssessment> {
    const { data: monthlyStats } = await supabase
      .from('mv_ad_stats_monthly')
      .select('statistical_confidence, impressions')
      .gte('month_start', `${targetMonth}-01`)
      .lt('month_start', `${targetMonth}-31`);

    if (!monthlyStats) {
      throw new Error('No data available for quality assessment');
    }

    const totalDataPoints = monthlyStats.length;
    const highConfidenceAds = monthlyStats.filter(s => s.statistical_confidence === 'high').length;
    const mediumConfidenceAds = monthlyStats.filter(s => s.statistical_confidence === 'medium').length;
    const lowConfidenceAds = monthlyStats.filter(s => s.statistical_confidence === 'low').length;
    const insufficientDataAds = monthlyStats.filter(s => s.statistical_confidence === 'insufficient').length;

    // データ信頼性スコア計算 (0-100)
    const reliabilityScore = totalDataPoints > 0 ? 
      ((highConfidenceAds * 100 + mediumConfidenceAds * 70 + lowConfidenceAds * 40) / totalDataPoints) : 0;

    const recommendedActions: string[] = [];
    
    if (insufficientDataAds > totalDataPoints * 0.3) {
      recommendedActions.push('30%以上の広告で十分なデータが不足しています。より長期間のデータ収集またはトラフィック増加施策を検討してください。');
    }
    
    if (highConfidenceAds < totalDataPoints * 0.5) {
      recommendedActions.push('高信頼性データが50%未満です。統計的有意性を向上させるため、インプレッション数の増加を図ってください。');
    }

    if (reliabilityScore < 60) {
      recommendedActions.push('全体的なデータ信頼性が低下しています。データ収集期間の延長または計測精度の向上を検討してください。');
    }

    return {
      totalDataPoints,
      highConfidenceAds,
      mediumConfidenceAds,
      lowConfidenceAds,
      insufficientDataAds,
      dataReliabilityScore: reliabilityScore,
      recommendedActions
    };
  }

  /**
   * インサイト生成
   */
  private static async generateInsights(
    metrics: AdPerformanceMetrics, 
    quality: DataQualityAssessment
  ): Promise<string[]> {
    const insights: string[] = [];

    // CTRパフォーマンス分析
    if (metrics.overallCTR > 2.0) {
      insights.push(`優秀なCTRパフォーマンス: ${metrics.overallCTR.toFixed(4)}%は業界平均を上回っています。`);
    } else if (metrics.overallCTR < 0.5) {
      insights.push(`CTR改善が必要: ${metrics.overallCTR.toFixed(4)}%は業界平均を下回っています。`);
    }

    // デバイス別分析
    const { mobile, desktop } = metrics.demographicBreakdown;
    if (mobile.ctr > desktop.ctr * 1.5) {
      insights.push(`モバイル優位: モバイルCTR(${mobile.ctr.toFixed(2)}%)がデスクトップ(${desktop.ctr.toFixed(2)}%)を大幅に上回っています。`);
    } else if (desktop.ctr > mobile.ctr * 1.5) {
      insights.push(`デスクトップ優位: デスクトップCTR(${desktop.ctr.toFixed(2)}%)がモバイル(${mobile.ctr.toFixed(2)}%)を大幅に上回っています。`);
    }

    // 営業時間分析
    const { businessHours } = metrics.demographicBreakdown;
    const afterHoursImpressions = metrics.totalImpressions - businessHours.impressions;
    const afterHoursClicks = metrics.totalClicks - businessHours.clicks;
    const afterHoursCTR = afterHoursImpressions > 0 ? (afterHoursClicks / afterHoursImpressions) * 100 : 0;

    if (businessHours.ctr > afterHoursCTR * 1.2) {
      insights.push(`営業時間効果: 営業時間中のCTR(${businessHours.ctr.toFixed(2)}%)が時間外より高く、ビジネス関連コンテンツの効果が表れています。`);
    }

    // データ品質に基づくインサイト
    if (quality.dataReliabilityScore >= 80) {
      insights.push(`高品質データ: データ信頼性スコア${quality.dataReliabilityScore.toFixed(0)}%で、分析結果の精度が高く保たれています。`);
    }

    // トップパフォーマー分析
    if (metrics.topPerformingPlacements.length > 0) {
      const topPlacement = metrics.topPerformingPlacements[0];
      insights.push(`最高パフォーマンス: プレースメント${topPlacement.placement_id}がCTR ${topPlacement.ctr.toFixed(4)}%でトップです。`);
    }

    return insights;
  }

  /**
   * 推奨アクション生成
   */
  private static async generateRecommendations(
    metrics: AdPerformanceMetrics,
    quality: DataQualityAssessment
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // CTR改善推奨
    if (metrics.overallCTR < 1.0) {
      recommendations.push('CTR改善施策: クリエイティブの最適化、ターゲティングの精度向上、またはプレースメント位置の見直しを検討してください。');
    }

    // デバイス最適化
    const { mobile, desktop } = metrics.demographicBreakdown;
    if (mobile.impressions > desktop.impressions * 2 && mobile.ctr < desktop.ctr) {
      recommendations.push('モバイル最適化: モバイルトラフィックが多いにも関わらずCTRが低いため、モバイル向けクリエイティブの改善を推奨します。');
    }

    // データ収集改善
    if (quality.insufficientDataAds > quality.totalDataPoints * 0.2) {
      recommendations.push('データ収集強化: 統計的有意性確保のため、低パフォーマンス広告の配信量増加または測定期間の延長を検討してください。');
    }

    // A/Bテスト推奨
    if (metrics.topPerformingPlacements.length >= 2) {
      const gap = metrics.topPerformingPlacements[0].ctr - metrics.topPerformingPlacements[1].ctr;
      if (gap > 1.0) {
        recommendations.push('A/Bテスト実施: トップパフォーマンスプレースメントの成功要因を他に適用するためのA/Bテストを実施してください。');
      }
    }

    // 時間帯最適化
    const { businessHours } = metrics.demographicBreakdown;
    if (businessHours.ctr > metrics.overallCTR * 1.3) {
      recommendations.push('配信時間最適化: 営業時間中の高いパフォーマンスを活用し、予算配分を時間帯別に調整することを推奨します。');
    }

    return recommendations;
  }

  /**
   * 月次レポートPDF生成（概念実装）
   */
  static async generateMonthlyReport(targetMonth: string): Promise<{
    reportUrl: string;
    summary: string;
  }> {
    const analysis = await this.runMonthlyAnalysis(targetMonth);
    
    // 実際の実装では、PDF生成ライブラリ（jsPDF等）を使用
    const reportSummary = `
月次広告分析レポート - ${targetMonth}

## 主要指標
- 総インプレッション: ${analysis.metrics.totalImpressions.toLocaleString()}
- 総クリック: ${analysis.metrics.totalClicks.toLocaleString()}  
- 平均CTR: ${analysis.metrics.overallCTR.toFixed(4)}%
- データ信頼性: ${analysis.quality.dataReliabilityScore.toFixed(0)}%

## 主要インサイト
${analysis.insights.map(insight => `- ${insight}`).join('\n')}

## 推奨アクション
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}
    `.trim();

    // 実際の実装では、生成されたPDFのURL等を返す
    return {
      reportUrl: `/reports/monthly-ad-report-${targetMonth}.pdf`,
      summary: reportSummary
    };
  }
}

export default AdAnalyticsEngine;
