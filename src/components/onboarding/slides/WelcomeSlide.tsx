import React from 'react';

const WelcomeSlide: React.FC = () => {
  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部タイトル */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">
            ようこそ、BeatNexusへ。
          </h2>
        </div>

        {/* 中央ロゴ */}
        <div className="flex justify-center mb-8">
          <img 
            src="/images/BEATNEXUS-WORDMARK.png" 
            alt="BeatNexus Logo"
            className="h-16 object-contain"
          />
        </div>

        {/* 下部説明 */}
        <div className="text-center">
          <p className="text-gray-300 text-sm leading-relaxed">
            ここは、世界中のビートボクサーが、そのスキルと魂をぶつけ合う、新たな伝説の舞台です。
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeSlide; 