import React from 'react';
import { twMerge } from 'tailwind-merge';
import { getDefaultAvatarUrl } from '../../utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

interface AvatarProps {
  src: string;
  alt: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  frameUrl?: string;  // フレーム画像URL
  className?: string;
  showFrame?: boolean; // フレーム表示の制御
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'w-10 h-10',    // 32px → 40px に拡大
  sm: 'w-12 h-12',    // 40px → 48px に拡大
  md: 'w-16 h-16',    // 48px → 64px に拡大
  lg: 'w-20 h-20',    // 64px → 80px に拡大
  xl: 'w-28 h-28',    // 96px → 112px に拡大
};

const statusStyles: Record<AvatarStatus, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

// フレーム用のサイズスタイル（アバターより少し大きく）
const frameSizeStyles: Record<AvatarSize, string> = {
  xs: 'w-12 h-12',    // アバター + 8px
  sm: 'w-14 h-14',    // アバター + 8px  
  md: 'w-20 h-20',    // アバター + 16px
  lg: 'w-24 h-24',    // アバター + 16px
  xl: 'w-32 h-32',    // アバター + 16px
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  status,
  frameUrl,
  className,
  showFrame = true,
}) => {
  return (
    <div className="relative inline-block">
      {/* アバター画像 */}
      <img
        src={src}
        alt={alt}
        className={twMerge(
          'rounded-full object-cover border-2 border-white relative z-10',
          sizeStyles[size],
          className
        )}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = getDefaultAvatarUrl();
        }}
      />

      {/* フレーム画像（オーバーレイ） */}
      {showFrame && frameUrl && (
        <img
          src={frameUrl}
          alt="Avatar Frame"
          className={twMerge(
            'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none object-contain z-20',
            frameSizeStyles[size]
          )}
          onError={(e) => {
            // フレーム画像の読み込みに失敗した場合は非表示にする
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      )}

      {/* ステータスインジケーター */}
      {status && (
        <span 
          className={twMerge(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white z-30',
            statusStyles[status],
            size === 'xs' ? 'w-2 h-2' : 'w-3 h-3',
            size === 'xl' && 'w-4 h-4'
          )}
        />
      )}
    </div>
  );
};