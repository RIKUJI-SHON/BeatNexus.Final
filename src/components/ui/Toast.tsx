import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onRemove: (id: string) => void;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    colors: 'bg-green-500/10 border-green-500/50 text-green-400',
    iconColors: 'text-green-400',
  },
  error: {
    icon: AlertCircle,
    colors: 'bg-red-500/10 border-red-500/50 text-red-400',
    iconColors: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    colors: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
    iconColors: 'text-yellow-400',
  },
  info: {
    icon: Info,
    colors: 'bg-blue-500/10 border-blue-500/50 text-blue-400',
    iconColors: 'text-blue-400',
  },
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onRemove,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto remove after duration
    const removeTimer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(removeTimer);
    };
  }, [duration]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(id);
    }, 300); // Match the transition duration
  };

  return (
    <div
      className={`
        toast-item
        relative flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        transition-all duration-300 ease-in-out
        ${config.colors}
        ${isVisible && !isLeaving
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-full'
        }
        max-w-md shadow-lg
      `}
      role="alert"
    >
      {/* Icon */}
      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColors}`} />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm">
          {title}
        </div>
        {message && (
          <div className="mt-1 text-sm opacity-90">
            {message}
          </div>
        )}
      </div>
      
      {/* Close button */}
      <button
        onClick={handleRemove}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        aria-label="通知を閉じる"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast; 