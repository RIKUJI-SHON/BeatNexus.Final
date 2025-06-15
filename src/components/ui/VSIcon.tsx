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
        onLoad={() => {
          console.log('✅ VS.png loaded successfully');
        }}
        onError={(e) => {
          console.error('❌ VS.png failed to load:', e);
          console.log('🔍 Attempted URL:', '/images/VS.png');
          console.log('🔍 Current origin:', window.location.origin);
          console.log('🔍 Full URL would be:', window.location.origin + '/images/VS.png');
          
          // フォールバック: 画像が読み込めない場合はテキストで表示
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) {
            fallback.style.display = 'flex';
            console.log('🔄 Switched to fallback VS text display');
          }
        }}
      />
      <div 
        className="w-full h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg"
        style={{ display: 'none' }}
      >
        VS
      </div>
    </div>
  );
}; 