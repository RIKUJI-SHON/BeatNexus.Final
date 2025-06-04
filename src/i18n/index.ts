import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ja from './locales/ja.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      ja: {
        translation: ja
      }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja'],
    
    // LanguageDetectorの設定
    detection: {
      // 検出順序：localStorage → navigator(ブラウザ設定) → htmlTag → path → subdomain
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // ブラウザの言語を確認する際にサポートされている言語に変換
      convertDetectedLanguage: (lng: string) => {
        // 日本語の場合（ja, ja-JP, ja-jp等）
        if (lng.toLowerCase().startsWith('ja')) {
          return 'ja';
        }
        // 英語の場合、またはその他の場合はデフォルトで英語
        return 'en';
      }
    },
    
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;