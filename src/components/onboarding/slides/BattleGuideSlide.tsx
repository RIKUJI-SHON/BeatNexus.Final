import React from 'react';

const BattleGuideSlide: React.FC = () => {
  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部タイトル */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white">
            戦い方は、驚くほど<br />シンプル。
          </h2>
        </div>

        {/* 中央動画 */}
        <div className="flex justify-center mb-6">
          <video 
            controls
            className="w-full max-w-[280px] h-40 object-cover rounded-lg shadow-lg"
            poster="/images/onboarding/Slide2.png"
          >
            <source src="/images/onboarding/Onboarding_video.mp4" type="video/mp4" />
            お使いのブラウザは動画の再生をサポートしていません。
          </video>
        </div>

        {/* 下部説明 */}
        <div className="text-center">
          <p className="text-gray-300 text-sm leading-relaxed">
            動画を投稿すれば、システムが自動で対戦相手をマッチング。勝敗は、コミュニティの投票によって決まります。
          </p>
        </div>
      </div>
    </div>
  );
};

export default BattleGuideSlide; 