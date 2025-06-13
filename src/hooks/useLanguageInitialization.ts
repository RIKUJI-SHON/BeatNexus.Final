import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

/**
 * ユーザーの言語設定を初期化するカスタムフック
 * - ログインしていないユーザー：ブラウザの言語設定を検出して適用
 * - ログインユーザー：ブラウザ設定を優先（認証エラーを防ぐため）
 */
export const useLanguageInitialization = () => {
  const { i18n } = useTranslation();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    const initializeLanguage = async () => {
      // 認証状態のロードが完了するまで待機
      if (loading) return;

      // ブラウザの言語設定を検出
      const detectBrowserLanguage = () => {
        const browserLanguages = navigator.languages || [navigator.language];
        
        for (const lang of browserLanguages) {
          const normalizedLang = lang.toLowerCase();
          if (normalizedLang.startsWith('ja')) {
            return 'ja';
          }
          if (normalizedLang.startsWith('en')) {
            return 'en';
          }
        }
        return 'en'; // デフォルト
      };

      const detectedLanguage = detectBrowserLanguage();
      
      // 現在の言語と異なる場合のみ変更
      if (i18n.language !== detectedLanguage) {
        console.log(`useLanguageInitialization: Setting language to ${detectedLanguage}`);
        i18n.changeLanguage(detectedLanguage);
      } else {
        console.log(`useLanguageInitialization: Language already set to ${detectedLanguage}`);
      }
    };

    initializeLanguage();
  }, [loading, i18n]); // userを依存配列から削除してシンプルに

  return {
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
}; 