import { create } from 'zustand';
import { ToastType } from '../components/ui/Toast';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onRemove: (id: string) => void;
}

interface ToastState {
  toasts: Omit<ToastItem, 'onRemove'>[];
  addToast: (toast: Omit<ToastItem, 'id' | 'onRemove'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = generateId();
    const newToast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  
  clearAllToasts: () => {
    set({ toasts: [] });
  },
}));

// Convenience functions for different toast types
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'success', title, message, duration });
  },
  
  error: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'error', title, message, duration });
  },
  
  warning: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'warning', title, message, duration });
  },
  
  info: (title: string, message?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'info', title, message, duration });
  },
}; 