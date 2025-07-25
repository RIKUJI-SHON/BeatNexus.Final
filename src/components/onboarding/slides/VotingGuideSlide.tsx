import React from 'react';

// 強制リロード用コメント - Updated at 2025-01-27 午後 v2
// このコンポーネントは翻訳システムを使用せず、完全にハードコード化されています
const VotingGuideSlide: React.FC = () => {
  // デバッグ用ログ
  console.log('[VotingGuideSlide] Component rendered - 栄光への道は一つじゃない。');
  
  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部タイトル - 完全ハードコード */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white" data-testid="voting-slide-title">
            栄光への道は<br />一つじゃない。
          </h2>
        </div>

        {/* 中央画像（左右並び） */}
        <div className="flex justify-center gap-4 mb-6">
          <div className="flex-1 text-center">
            <img 
              src="/images/Tournaments.png" 
              alt="Tournaments"
              className="w-full h-20 object-contain rounded-lg"
              data-testid="tournaments-image"
            />
          </div>
          <div className="flex-1 text-center">
            <img 
              src="/images/onboarding/judge.png" 
              alt="Official Judge"
              className="w-full h-20 object-contain rounded-lg"
              data-testid="judge-image"
            />
          </div>
        </div>

        {/* 下部説明 - 完全ハードコード */}
        <div className="text-center">
          <p className="text-gray-300 text-sm leading-relaxed" data-testid="voting-slide-description">
            プレイヤーとしてランキングの頂点を目指す道。そして、優れた審美眼で勝敗を決める「公式ジャッジ」を目指す道。あなたは、どちらの伝説を刻みますか？
          </p>
        </div>
      </div>
    </div>
  );
};

export default VotingGuideSlide;