import React from 'react';
import { Upload } from 'lucide-react';

const GetStartedSlide: React.FC = () => {
  return (
    <div className="onboarding-card md:w-96 md:h-[500px] w-[340px] h-[440px]">
      <div className="onboarding-content">
        {/* 上部タイトル */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white">
            準備は、整った。
          </h2>
        </div>

        {/* 中央バトルスタートアイコン */}
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 rounded-full shadow-lg hover:scale-105 transition-transform cursor-pointer">
            <Upload className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* 下部説明 */}
        <div className="text-center">
          <p className="text-gray-300 text-lg font-medium">
            あなたの最初の戦いが、今、始まります。
          </p>
        </div>
      </div>
    </div>
  );
};

export default GetStartedSlide; 