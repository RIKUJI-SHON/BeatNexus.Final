import React from 'react';
import { twMerge } from 'tailwind-merge';

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
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
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