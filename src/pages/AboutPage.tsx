import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Users, Target, Shield, Layers, RefreshCcw, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import JsonLd from '../components/seo/JsonLd';

const AboutPage: React.FC = () => {
  // translation hook not required currently (static Japanese copy). Add later if i18n needed.
  const navigate = useNavigate();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    'name': 'About BeatNexus',
    'description': 'BeatNexusの使命・ビジョン・公平なオンラインビートボックス競技基盤の設計思想。',
    'url': 'https://beatnexus.app/about'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Helmet>
        <title>About | BeatNexus</title>
        <meta name="description" content="BeatNexusの使命、課題認識、公平性と成長ループを実現するシステム設計。" />
        <link rel="canonical" href="https://beatnexus.app/about" />
      </Helmet>
      <JsonLd data={jsonLd} />
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-5xl">
        <button onClick={() => navigate(-1)} className="mb-8 flex items-center text-sm text-gray-400 hover:text-white transition-colors" aria-label="Back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </button>
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">BeatNexusについて</h1>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed">BeatNexusは「常時参加できる公平なデジタル競技空間」を基盤コンセプトに、実力向上のサイクルを誰にでも開くことを目指すオンライン・ビートボックスバトルプラットフォームです。</p>
        </header>

        <section className="space-y-14">
          <article>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Target className="w-6 h-6 text-cyan-400" /> 解決したい課題</h2>
            <p className="text-gray-300 leading-relaxed">従来のオンラインバトルは偶発的なイベント依存、待機時間の長さ、参加ハードル、結果フィードバックの分散など多くの摩擦を伴います。BeatNexusは非同期構造とレーティング・シーズン制を組み合わせ、継続的な挑戦と学習を阻害する要因を体系的に除去します。</p>
          </article>
          <article>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Layers className="w-6 h-6 text-purple-400" /> 体系的な成長ループ</h2>
            <p className="text-gray-300 leading-relaxed">(1) 投稿 → (2) 公平マッチング → (3) コミュニティ投票 → (4) レーティング & シーズンポイント反映 → (5) アーカイブ分析 → (6) 改善投稿、という循環を最短・低摩擦で回せるよう設計。更新されたレートは即座に次回マッチングに活かされ、ループの継続性が担保されます。</p>
          </article>
          <article>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Shield className="w-6 h-6 text-emerald-400" /> 公平性と不正耐性</h2>
            <p className="text-gray-300 leading-relaxed">電話番号認証・RLS・監査ログ・段階的レート拡張マッチング・アーカイブ一元管理関数などの複合防御により、不正投票/多重アカウント/レート操作を抑止。イベント駆動ではなく確率制御された自動化ロジックで“参加すれば進む”一貫性を保ちます。</p>
          </article>
          <article>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><RefreshCcw className="w-6 h-6 text-amber-400" /> シーズン & 報酬設計</h2>
            <p className="text-gray-300 leading-relaxed">単なる累積Eloでは離脱率が上昇しやすいため、期間限定の再スタートを与えるシーズン設計を採用。限定バッジ/フレームで参加実績を可視化し、過去参加者の復帰動機と新規参入者の追従意欲を両立します。</p>
          </article>
          <article>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Users className="w-6 h-6 text-pink-400" /> コミュニティ価値</h2>
            <p className="text-gray-300 leading-relaxed">閲覧だけのユーザーも “投票行為” を通じ価値貢献者としてランキング化。プレイヤーと観戦者の役割を明確に接続し、プラットフォーム全体の関与率を高めます。</p>
          </article>
          <article>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-6 h-6 text-fuchsia-400" /> 今後の拡張</h2>
            <ul className="text-gray-300 list-disc pl-5 space-y-2">
              <li>テーマチャレンジ & モード別最適化</li>
              <li>学習補助 (パターン比較・傾向分析)</li>
              <li>イベント連動リアルタイム企画</li>
              <li>AI支援フィードバックのガイドライン化</li>
            </ul>
          </article>
        </section>

        <div className="mt-16 p-6 rounded-xl bg-gradient-to-r from-cyan-600/10 to-purple-600/10 border border-cyan-500/20 text-sm text-gray-400">
          本ページはプラットフォームの設計思想を公開し透明性を高める目的です。仕様は改善のため予告なく調整される場合があります。
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
