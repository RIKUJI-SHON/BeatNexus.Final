import React from 'react';

interface VSIconProps {
  className?: string;
}

export const VSIcon: React.FC<VSIconProps> = ({ className = "" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/images/VS.png"
        alt="VS"
        className="w-full h-full object-contain"
        loading="lazy"
        onError={(e) => {
          // フォールバック: 画像が読み込めない場合はテキストで表示
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) {
            fallback.style.display = 'flex';
          }
        }}
      />
      <div 
        className="w-full h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg hidden"
        style={{ display: 'none' }}
      >
        VS
      </div>
    </div>
  );
}; 