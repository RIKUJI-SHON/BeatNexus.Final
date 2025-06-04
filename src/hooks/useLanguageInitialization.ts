import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

/**
 * ユーザーの言語設定を初期化するカスタムフック
 * - ログインしていないユーザー：ブラウザの言語設定を検出して適用
 * - ログインユーザー：データベースの設定を優先、なければブラウザ設定
 */
export const useLanguageInitialization = () => {
  const { i18n } = useTranslation();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    const initializeLanguage = async () => {
      // 認証状態のロードが完了するまで待機
      if (loading) return;

      if (user) {
        // ログインユーザーの場合：データベースから言語設定を取得
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', user.id)
            .single();

          if (data?.language && (data.language === 'ja' || data.language === 'en')) {
            // データベースに言語設定がある場合はそれを使用
            if (i18n.language !== data.language) {
              i18n.changeLanguage(data.language);
            }
            return;
          }
        } catch (error) {
          console.warn('Failed to load user language preference:', error);
        }
      }

      // ログインしていないユーザー、またはデータベースに言語設定がない場合
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
        i18n.changeLanguage(detectedLanguage);
        console.log(`Language initialized from browser setting: ${detectedLanguage}`);
      }
    };

    initializeLanguage();
  }, [user, loading, i18n]);

  return {
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
}; 