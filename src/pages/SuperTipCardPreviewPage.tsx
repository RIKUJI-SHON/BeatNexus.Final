import { useMemo } from 'react';

type Side = 'A' | 'B';

function calcTier(amount: number): 1 | 2 | 3 | 4 {
  if (amount >= 3000) return 4;
  if (amount >= 1000) return 3;
  if (amount >= 500) return 2;
  return 1;
}

const samples: Array<{ amount: number; side: Side; username: string; comment: string; standalone?: boolean }>
  = [
    { amount: 100, side: 'A', username: 'Alice', comment: '応援してます！' },
    { amount: 500, side: 'A', username: 'Alice', comment: 'ナイス！' },
    { amount: 1000, side: 'A', username: 'Alice', comment: '最高のバトル！' },
    { amount: 3000, side: 'A', username: 'Alice', comment: '鳥肌！' },
    { amount: 100, side: 'B', username: 'Bob', comment: 'がんばれ！' },
    { amount: 500, side: 'B', username: 'Bob', comment: '良い音！' },
    { amount: 1000, side: 'B', username: 'Bob', comment: '痺れた！' },
    { amount: 3000, side: 'B', username: 'Bob', comment: '最強🔥' },
    // スタンドアロンでも支援したサイドの色を適用（A/B）。種類はチップで明記。
    { amount: 700, side: 'A', username: 'Charlie', comment: 'スタンドアロン支援', standalone: true },
    { amount: 7000, side: 'B', username: 'Dana', comment: 'スタンドアロン支援・大！', standalone: true },
  ];

export default function SuperTipCardPreviewPage() {
  const rows = useMemo(() => samples.map((s, i) => {
    const tier = calcTier(s.amount);
    const sideCls = s.side === 'A' ? 'supertip-side-A' : 'supertip-side-B';
    const containerCls = `supertip-card ${sideCls} supertip-tier-${tier}`.trim();
    const sideLabel = s.side === 'A' ? 'サイドA' : 'サイドB';
    const sideLabelCls = s.side === 'A'
      ? 'border-cyan-300/60 text-cyan-200'
      : 'border-pink-300/60 text-pink-200';
    return (
      <div key={i} className={containerCls}>
        <div className="supertip-card-info p-4">
          <div className="flex items-center gap-3">
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.username)}`}
              alt={s.username}
              className={`w-10 h-10 rounded-full border-2 ${s.side==='A'?'border-cyan-300/70':'border-pink-300/70'}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-semibold text-white truncate">{s.username}</span>
                <span className={`px-2 py-0.5 rounded-full border ${sideLabelCls}`}>{sideLabel}</span>
                {s.standalone && (
                  <span className="px-2 py-0.5 rounded-full border border-yellow-300/60 text-yellow-200">スタンドアロン</span>
                )}
                <span className="px-2 py-0.5 rounded-full border border-amber-300/60 text-amber-200">Tier {tier}</span>
                <span className="supertip-badge hidden sm:inline-flex">
                  <span className="supertip-badge__dot" />
                  Super Tip
                </span>
              </div>
              <div className="text-gray-300 text-sm truncate">{s.comment}</div>
            </div>
            <div className="ml-auto text-right whitespace-nowrap">
              <div className="text-white font-extrabold text-lg sm:text-xl tracking-wide">¥{s.amount.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }), []);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Super Tip コメントカード プレビュー</h1>
  <p className="text-gray-400 text-sm">金額に応じたティア（1〜4）は色の濃淡で表現し、スタンドアロンでも支援先サイド（A=青/B=赤）の色が適用されます。モバイルではバッジ非表示。</p>
      <div className="space-y-4">
        {rows}
      </div>
    </div>
  );
}
