import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface UseRequireAuthOptions {
  showAuthModal?: boolean;
  setAuthModalOpen?: (open: boolean) => void;
  setAuthModalMode?: (mode: 'login' | 'signup') => void;
}

export const useRequireAuth = (options: UseRequireAuthOptions = {}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const requireAuth = (callback?: () => void) => {
    if (!user) {
      if (options.showAuthModal && options.setAuthModalOpen && options.setAuthModalMode) {
        options.setAuthModalMode('signup');
        options.setAuthModalOpen(true);
      } else {
        navigate('/');
      }
      return false;
    }
    
    callback?.();
    return true;
  };

  return requireAuth;
};