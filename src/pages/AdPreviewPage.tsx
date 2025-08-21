import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AdSlot } from '../components/ads/AdSlot';
import { Eye, Code, Palette, Monitor } from 'lucide-react';

const AdPreviewPage: React.FC = () => {
  const [selectedVariant, setSelectedVariant] = useState<'all' | 'banner' | 'infeed' | 'inline' | 'carousel' | 'sidebar'>('all');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 広告配置の定義（配置キー仕様書より）
  const adPlacements = [
    // Banner型
    { key: 'ranking.top.banner', variant: 'banner', description: 'Ranking トップポディウム直下 Banner', height: '90px' },
    
    // Carousel型（新規追加）
    { key: 'home.hero.section.after.carousel', variant: 'carousel', description: 'Home ヒーローセクション後カルーセル', height: '240px' },
    
    // InFeed型
    { key: 'battles.list.after-3.infeed', variant: 'infeed', description: 'Battles 一覧 3件後 InFeed', height: '220px' },
    { key: 'battles.list.after-6.infeed', variant: 'infeed', description: 'Battles 一覧 6件後 InFeed', height: '220px' },
    { key: 'battles.list.after-9.infeed', variant: 'infeed', description: 'Battles 一覧 9件後 InFeed', height: '220px' },
    { key: 'ranking.list.after-5.infeed', variant: 'infeed', description: 'Ranking 5位後 InFeed', height: '220px' },
    
    // Inline型
    { key: 'home.features.mid.inline', variant: 'inline', description: 'Home HowItWorks→Features 間 Inline', height: '120px' },
    { key: 'home.latest.before-list.infeed', variant: 'infeed', description: 'Home LatestBattles 手前 InFeed', height: '200px' },
    
    // 将来実装予定（現在active: false）
    { key: 'battles.sidebar.ranking-bottom.card', variant: 'sidebar', description: 'Battles サイドバー下部 SidebarPromo（未実装）', height: '250px', disabled: true },
    { key: 'profile.activity.after-2.infeed', variant: 'infeed', description: 'Profile アクティビティ2件後 InFeed（未実装）', height: '220px', disabled: true },
  ];

  const filteredPlacements = selectedVariant === 'all' 
    ? adPlacements 
    : adPlacements.filter(p => p.variant === selectedVariant);

  const variantColors = {
    banner: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700',
    infeed: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700',
    inline: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700',
    carousel: 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-700',
    sidebar: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700'
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Palette className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                広告デザインプレビュー
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                {isDarkMode ? 'ライト' : 'ダーク'}モード
              </Button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            各配置での広告カードデザインを確認できます。実際のデータベースから広告を取得して表示します。
          </p>
        </div>

        {/* フィルター */}
        <Card className="mb-8 p-6">
          <div className="flex items-center gap-4 mb-4">
            <Eye className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">表示フィルター</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: '全て', count: adPlacements.length },
              { value: 'banner', label: 'Banner', count: adPlacements.filter(p => p.variant === 'banner').length },
              { value: 'infeed', label: 'InFeed', count: adPlacements.filter(p => p.variant === 'infeed').length },
              { value: 'inline', label: 'Inline', count: adPlacements.filter(p => p.variant === 'inline').length },
              { value: 'carousel', label: 'Carousel', count: adPlacements.filter(p => p.variant === 'carousel').length },
              { value: 'sidebar', label: 'Sidebar', count: adPlacements.filter(p => p.variant === 'sidebar').length },
            ].map((filter) => (
              <Button
                key={filter.value}
                onClick={() => setSelectedVariant(filter.value as typeof selectedVariant)}
                variant={selectedVariant === filter.value ? 'primary' : 'outline'}
                size="sm"
              >
                {filter.label} ({filter.count})
              </Button>
            ))}
          </div>
        </Card>

        {/* 広告プレビューグリッド */}
        <div className="space-y-8">
          {filteredPlacements.map((placement) => (
            <Card 
              key={placement.key} 
              className={`p-6 ${variantColors[placement.variant as keyof typeof variantColors]} ${
                placement.disabled ? 'opacity-50' : ''
              }`}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      placement.variant === 'banner' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                      placement.variant === 'infeed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                      placement.variant === 'inline' ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
                    }`}>
                      {placement.variant.toUpperCase()}
                    </span>
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                      {placement.key}
                    </code>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    推奨高さ: {placement.height}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {placement.description}
                  {placement.disabled && ' （未実装）'}
                </p>
              </div>

              {/* 広告プレビュー */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                {placement.disabled ? (
                  <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>未実装の配置</p>
                      <p className="text-xs">将来のリリースで対応予定</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ minHeight: placement.height }}>
                    <AdSlot
                      placementKey={placement.key}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* 統計情報 */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">配置統計</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {adPlacements.filter(p => p.variant === 'banner').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Banner配置</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {adPlacements.filter(p => p.variant === 'infeed').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">InFeed配置</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {adPlacements.filter(p => p.variant === 'inline').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Inline配置</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {adPlacements.filter(p => !p.disabled).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">実装済み配置</div>
            </div>
          </div>
        </Card>

        {/* 開発者向け情報 */}
        <Card className="mt-8 p-6 bg-gray-100 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5" />
            開発者向け情報
          </h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <strong>使用方法:</strong>
              <code className="block mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                {'<AdSlot placementKey="ranking.top.banner" />'}
              </code>
            </div>
            <div>
              <strong>データソース:</strong> データベースの simple_ads テーブルから実際の広告を取得
            </div>
            <div>
              <strong>フォールバック:</strong> 配置が見つからない場合やエラー時は代替広告を表示
            </div>
            <div>
              <strong>レスポンシブ:</strong> 各広告カードは自動的にコンテナ幅に調整されます
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdPreviewPage;
