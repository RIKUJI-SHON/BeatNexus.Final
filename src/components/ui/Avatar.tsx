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
  className?: string;
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

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  status,
  className,
}) => {
  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt={alt}
        className={twMerge(
          'rounded-full object-cover border-2 border-white',
          sizeStyles[size],
          className
        )}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = getDefaultAvatarUrl();
        }}
      />
      {status && (
        <span 
          className={twMerge(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white',
            statusStyles[status],
            size === 'xs' ? 'w-2 h-2' : 'w-3 h-3',
            size === 'xl' && 'w-4 h-4'
          )}
        />
      )}
    </div>
  );
};