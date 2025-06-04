import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses: Record<typeof size, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose} // Overlay click to close
    >
      <div 
        className={`bg-gray-900 rounded-lg shadow-2xl p-6 relative transform transition-all duration-300 ease-in-out w-full ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
        {title && (
          <h2 className="text-xl font-semibold text-white mb-4 pr-8">{title}</h2>
        )}
        <div className="text-gray-300">
          {children}
        </div>
      </div>
    </div>
  );
}; 