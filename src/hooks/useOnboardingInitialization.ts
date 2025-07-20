import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * オンボーディング状況を初期化するカスタムフック
 * ログインユーザーの場合、データベースのオンボーディング状況を確認し、
 * 必要に応じてオンボーディングモーダルを表示する
 */
export const useOnboardingInitialization = () => {
  const { user, loading } = useAuthStore();
  const { triggerOnboardingForNewUser } = useOnboardingStore();

  useEffect(() => {
    const initializeOnboarding = async () => {
      // 認証状態のロードが完了するまで待機
      if (loading) return;

      if (user) {
        // ログインユーザーの場合、オンボーディング状況をチェック
        try {
          console.log(`useOnboardingInitialization: Checking onboarding status for user ${user.id}`);
          await triggerOnboardingForNewUser(user.id);
        } catch (error) {
          console.error('useOnboardingInitialization: Failed to initialize onboarding:', error);
        }
      }
    };

    initializeOnboarding();
  }, [user, loading, triggerOnboardingForNewUser]);
};
