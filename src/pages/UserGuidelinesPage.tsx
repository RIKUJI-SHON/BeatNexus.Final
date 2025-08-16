import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldAlert, AlertTriangle, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const UserGuidelinesPage: React.FC = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'ja' | 'en'>('ja');

  const sections = {
    ja: {
      title: '投稿・コミュニティガイドライン',
      intro: 'BeatNexus はビートボクサーが公平かつ創造的に競い合い、学び合うための場です。ユーザー生成コンテンツ (UGC) の品質と安全性を保つため、以下のルールを定めます。',
      allowed: [
        'オリジナルのビートボックス / ボイスパーカッション演奏',
        '学習・改善を目的とした建設的なフィードバック',
        '適切なクレジット表記によるコラボレーション',
        '文化的・言語的多様性を尊重する表現'
      ],
      prohibitedCategories: [
        '著作権・商標・肖像権その他第三者権利を侵害する素材（無断使用の音源・ループ等）',
        '差別的 / ヘイト / 過度に暴力的 / 露骨な性的表現 / 自傷行為の助長',
        'スパム行為、宣伝のみを目的とした大量投稿、機械生成された低品質コンテンツ',
        '他者になりすます行為、統計を歪める複数アカウント運用',
        '個人情報（住所・電話・他者の未公開情報等）の公開',
        '不正投票・結果操作（Bot / スクリプト / 報酬付き組織票）'
      ],
      enforcement: [
        '軽度: 警告・投稿削除・一時機能制限',
        '中度: 一時的なアカウント停止（期間: 24時間〜30日）',
        '重大/再犯: 永久停止（関連アカウント含む）',
        '違法性が高い場合は関係当局・権利者へ通報'
      ],
      report: '違反を発見した場合は動画/ページURL・理由・スクリーンショット（可能なら）を添えて「お問い合わせ」ページまたはメールにて報告してください。迅速な是正に協力いただき感謝します。'
    },
    en: {
      title: 'User Content & Community Guidelines',
      intro: 'BeatNexus is a space for fair, creative beatbox competition and learning. To keep UGC safe and high‑quality, please follow these rules.',
      allowed: [
        'Original beatbox / vocal percussion performances',
        'Constructive feedback aimed at learning and improvement',
        'Collaborations with proper credit attribution',
        'Expressions that respect cultural & linguistic diversity'
      ],
      prohibitedCategories: [
        'Copyright / trademark / likeness infringements (unauthorized audio loops, stems, samples)',
        'Hate, discriminatory, excessively violent, sexually explicit, or self‑harm promoting content',
        'Spam, mass promotional posting, auto‑generated low quality content',
        'Impersonation or multi‑account abuse manipulating rankings/votes',
        'Publishing personal or sensitive information of others',
        'Vote manipulation or fraud (bots, scripts, incentivized brigading)'
      ],
      enforcement: [
        'Minor: Warning, content removal, temporary feature limits',
        'Moderate: Account suspension (24h – 30 days)',
        'Severe / Repeat: Permanent ban (related accounts included)',
        'Where illegal: Report to authorities / rights holders'
      ],
      report: 'If you spot a violation, send the URL, reason and (if possible) a screenshot via the Contact page or email. Your cooperation helps keep the community healthy.'
    }
  };

  const c = sections[lang];

  return (
    <>
      <Helmet>
        <title>{lang === 'ja' ? 'ガイドライン | BeatNexus' : 'Guidelines | BeatNexus'}</title>
        <meta name="description" content="BeatNexus ユーザー投稿・コミュニティガイドライン" />
      </Helmet>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 text-gray-400 hover:text-white"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >{lang === 'ja' ? '戻る' : 'Back'}</Button>

          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold flex items-center gap-3"><ShieldAlert className="h-8 w-8 text-cyan-400" />{c.title}</h1>
            <div className="bg-gray-800 rounded-lg p-1 flex">
              <button onClick={() => setLang('ja')} className={`px-4 py-2 rounded-md text-sm ${lang==='ja'?'bg-cyan-600 text-white':'text-gray-400 hover:text-white'}`}>JA</button>
              <button onClick={() => setLang('en')} className={`px-4 py-2 rounded-md text-sm ${lang==='en'?'bg-cyan-600 text-white':'text-gray-400 hover:text-white'}`}>EN</button>
            </div>
          </div>

          <p className="text-gray-300 leading-relaxed mb-10">{c.intro}</p>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><CheckCircle2 className="h-6 w-6 text-green-400" />{lang==='ja'?'歓迎される内容':'Encouraged Content'}</h2>
            <ul className="space-y-2 text-gray-300 list-disc ml-6">
              {c.allowed.map(item => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><XCircle className="h-6 w-6 text-red-400" />{lang==='ja'?'禁止事項':'Prohibited Content'}</h2>
            <ul className="space-y-2 text-gray-300 list-disc ml-6">
              {c.prohibitedCategories.map(item => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-yellow-400" />{lang==='ja'?'対応/執行':'Enforcement'}</h2>
            <ul className="space-y-2 text-gray-300 list-disc ml-6">
              {c.enforcement.map(item => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-semibold mb-4">{lang==='ja'?'違反報告':'Reporting'}</h2>
            <p className="text-gray-300 leading-relaxed">{c.report}</p>
          </section>

          <p className="text-center text-gray-500 text-sm">© {new Date().getFullYear()} BeatNexus</p>
        </div>
      </div>
    </>
  );
};

export default UserGuidelinesPage;
