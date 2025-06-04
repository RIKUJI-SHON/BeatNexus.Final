import React from 'react';
import { createPortal } from 'react-dom';
import Toast, { ToastProps } from './Toast';

interface ToastContainerProps {
  toasts: Omit<ToastProps, 'onRemove'>[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer; 