// HouseAd.tsx
// プラットフォーム内自己プロモーション用簡易広告 (No Fill 時のフォールバック)。
// MVP では静的文言。将来: AB テストや複数候補ローテーションにも拡張可能。

import React from 'react';

export const HouseAd: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className} data-house-ad>
      <div className="bnx-ad-card bnx-house-ad">
        <div className="bnx-ad-body">
          <span className="bnx-ad-badge">広告 / AD</span>
          <h4 className="bnx-ad-headline">BeatNexus をもっと活用しよう</h4>
          <p className="bnx-ad-text">最新のバトルをフォローして推しを応援しよう！</p>
          <a href="/battles" className="bnx-ad-cta">バトル一覧へ</a>
        </div>
      </div>
    </div>
  );
};
