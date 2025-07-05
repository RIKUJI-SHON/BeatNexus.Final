import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  topLayer?: boolean; // 最上層表示オプション
  backgroundOpacity?: 'light' | 'normal' | 'heavy'; // 背景透明度オプション
  plain?: boolean; // カード装飾なし
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  topLayer = false,
  backgroundOpacity = 'normal',
  plain = false,
}) => {
  if (!isOpen) return null;

  const sizeClasses: Record<typeof size, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const backgroundClasses: Record<typeof backgroundOpacity, string> = {
    light: 'bg-black/50',   // 動画が見える程度の軽い背景
    normal: 'bg-black/80',  // 通常の背景
    heavy: 'bg-black/95',   // 濃い背景
  };

  // 最上層表示の場合はz-indexを最大値に
  const zIndexClass = topLayer ? 'z-[9999]' : 'z-50';

  const modalContent = (
    <div 
      className={`fixed inset-0 ${backgroundClasses[backgroundOpacity]} flex items-center justify-center ${zIndexClass} p-4 transition-opacity duration-300 ease-in-out`}
      onClick={onClose} // Overlay click to close
    >
      <div 
        className={`relative transform transition-all duration-300 ease-in-out w-full ${sizeClasses[size]} ${plain ? '' : 'bg-gray-900 rounded-lg shadow-2xl p-6'}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {!plain && (
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {title && (
          <h2 className="text-xl font-semibold text-white mb-4 pr-8">{title}</h2>
        )}
        <div className={plain ? '' : 'text-gray-300'}>
          {children}
        </div>
      </div>
    </div>
  );

  // Portal を使用して document.body に直接レンダリング
  // SSR対応：documentが存在しない場合は通常レンダリング
  if (typeof document === 'undefined') {
    return modalContent;
  }
  
  return createPortal(modalContent, document.body);
}; 