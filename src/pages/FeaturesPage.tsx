import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Cpu, Vote, Layers, BarChart3, Award, ArrowLeft, Shield, Workflow, Clock } from 'lucide-react';
import JsonLd from '../components/seo/JsonLd';

const featureBlocks = [
  {
    icon: Cpu,
    title: '段階的マッチングアルゴリズム',
    body: '投稿直後は±50レート差で高速マッチングを優先し、経過時間ごとに許容レート差を拡張する確率制御ロジック。公平性と成立率バランスを動的最適化。'
  },
  {
    icon: Vote,
    title: 'コミュニティ投票システム',
    body: '投票行為も “貢献” と評価しシーズン投票ランキングを生成。観戦者の動機を強化しエコシステム循環率を向上。'
  },
  {
    icon: BarChart3,
    title: 'シーズン & レーティング二層構造',
    body: 'Eloベースの実力値と期間限定のシーズンポイントを分離。短期競争と長期成長を両立。'
  },
  {
    icon: Award,
    title: '報酬 & コスメティック進行',
    body: '限定バッジ/アイコンフレームによる視覚的報酬で継続参加を促進。実力以外の“継続/支援”価値も表彰。'
  },
  {
    icon: Shield,
    title: '多層不正対策',
    body: '電話番号認証 / RLS / 監査ログ / 関数集約アーカイブ処理で多重アカウントや投票操作リスクを最小化。'
  },
  {
    icon: Workflow,
    title: 'アーカイブ & 分析基盤',
    body: '完了バトルは動画URL/レート変動/投票分布を保存。後続の統計機能・学習支援に活用。'
  },
  {
    icon: Clock,
    title: 'pg_cron 定期自動処理',
    body: 'バトル期限監視と段階マッチング拡張を自動化し、手動オペレーション依存を排除。'
  },
  {
    icon: Layers,
    title: '拡張性を意識したスキーマ',
    body: 'シーズン/報酬/通知/投票/アーカイブを疎結合に保ち、機能追加リスクを低減。'
  }
];

const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': 'BeatNexus Features',
    'description': 'BeatNexus プラットフォームの主要機能と技術的特徴の一覧。',
    'url': 'https://beatnexus.app/features'
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Helmet>
        <title>Features | BeatNexus</title>
        <meta name="description" content="BeatNexusの段階的マッチング・投票システム・シーズン機構・不正対策・アーカイブ基盤など主要機能一覧" />
        <link rel="canonical" href="https://beatnexus.app/features" />
      </Helmet>
      <JsonLd data={jsonLd} />
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-6xl">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center text-sm text-gray-400 hover:text-white transition-colors" aria-label="Back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
        <header className="mb-14 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Core Features</h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">競技性・継続性・透明性を両立するために設計された主要機能を技術的視点を交えて紹介します。</p>
        </header>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureBlocks.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 flex flex-col hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-6 h-6 text-cyan-400" />
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed flex-1">{f.body}</p>
              </div>
            );
          })}
        </div>
        <section className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">技術スタックと方針</h2>
          <p className="text-gray-300 leading-relaxed">React + TypeScript + Supabase を中心に、サーバーレス指向と軽量なリアルタイム性確保のバランスを重視。ロジックはデータベース関数に寄せ、クライアントは薄い状態管理（Zustand）と描画最適化に集中させています。中規模段階での Next.js / SSR への漸進的移行余地を残し、現フェーズではプリレンダリング導入優先度を評価中です。</p>
          <h2 className="text-2xl font-semibold mt-10 mb-4">今後予定</h2>
          <ul className="text-gray-300 list-disc pl-5 space-y-2">
            <li>構造化データ拡張 (Article / FAQ / Breadcrumb)</li>
            <li>ランキング可視化高度化（期間フィルタ・モード別指標）</li>
            <li>学習支援レコメンド（過去アーカイブ統計 + 将来AI補助）</li>
            <li>多言語拡張と地域イベント連動</li>
          </ul>
        </section>
        <div className="mt-16 p-6 rounded-xl bg-gradient-to-r from-cyan-600/10 to-purple-600/10 border border-cyan-500/20 text-sm text-gray-400 text-center">機能はアクティブに改善中です。ご意見は Contact からお寄せください。</div>
      </div>
    </div>
  );
};

export default FeaturesPage;
