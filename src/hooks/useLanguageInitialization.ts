import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { detectBrowserLanguage, validateLanguageCode } from '../lib/utils';

/**
 * ユーザーの言語設定を初期化するカスタムフック
 * - ログインしていないユーザー：ブラウザの言語設定を使用
 * - ログインユーザー：データベースの言語設定のみを使用（ブラウザ設定は無視）
 */
export const useLanguageInitialization = () => {
  const { i18n } = useTranslation();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    const initializeLanguage = async () => {
      // 認証状態のロードが完了するまで待機
      if (loading) return;

      if (user) {
        // ログインユーザー：データベースの言語設定を取得
        try {
          console.log(`useLanguageInitialization: Loading language for logged-in user ${user.id}`);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', user.id)
            .single();

          if (error) {
            console.warn('useLanguageInitialization: Failed to fetch user language:', error);
            // エラー時はブラウザ設定をフォールバック
            const detectedLanguage = detectBrowserLanguage();
            if (i18n.language !== detectedLanguage) {
              console.log(`useLanguageInitialization: Using browser fallback language ${detectedLanguage}`);
              i18n.changeLanguage(detectedLanguage);
            }
            return;
          }

          const userLanguage = data?.language ? validateLanguageCode(data.language) : detectBrowserLanguage();
          
          // データベースの言語設定と現在の言語が異なる場合のみ変更
          if (i18n.language !== userLanguage) {
            console.log(`useLanguageInitialization: Setting language from database to ${userLanguage}`);
            i18n.changeLanguage(userLanguage);
          } else {
            console.log(`useLanguageInitialization: Language already set to ${userLanguage} from database`);
          }
        } catch (error) {
          console.error('useLanguageInitialization: Error fetching user language:', error);
          // エラー時はブラウザ設定をフォールバック
          const detectedLanguage = detectBrowserLanguage();
          if (i18n.language !== detectedLanguage) {
            console.log(`useLanguageInitialization: Using browser fallback language ${detectedLanguage}`);
            i18n.changeLanguage(detectedLanguage);
          }
        }
      } else {
        // ログインしていない場合：ブラウザの言語設定を使用
        const detectedLanguage = detectBrowserLanguage();
        
        // 現在の言語と異なる場合のみ変更
        if (i18n.language !== detectedLanguage) {
          console.log(`useLanguageInitialization: Setting browser language to ${detectedLanguage}`);
          i18n.changeLanguage(detectedLanguage);
        } else {
          console.log(`useLanguageInitialization: Browser language already set to ${detectedLanguage}`);
        }
      }
    };

    initializeLanguage();
  }, [loading, user?.id, i18n]); // userとuser.idの両方を依存配列に含める

  return {
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
}; 