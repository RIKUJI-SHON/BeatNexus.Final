import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zhCN from './locales/zh-CN.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

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
      },
      ko: {
        translation: ko
      },
      'zh-CN': {
        translation: zhCN
      },
      es: {
        translation: es
      },
      'pt-BR': {
        translation: ptBR
      },
      fr: {
        translation: fr
      },
      de: {
        translation: de
      }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ja', 'ko', 'zh-CN', 'es', 'pt-BR', 'fr', 'de'],
    
    // LanguageDetectorの設定
    detection: {
      // 検出順序：localStorage → navigator(ブラウザ設定) → htmlTag → path → subdomain
      order: ['localStorage', 'navigator', 'htmlTag'],

      // ブラウザの言語をサポート言語に正規化
      convertDetectedLanguage: (lng: string) => {
        if (!lng) return 'en';
        const lower = lng.toLowerCase();
        // 完全一致優先
        const supported = ['en', 'ja', 'ko', 'zh-cn', 'es', 'pt-br', 'fr', 'de'];
        if (supported.includes(lower)) return lower.replace('zh-cn', 'zh-CN').replace('pt-br', 'pt-BR');

        // ベース言語へ縮約
        const base = lower.split('-')[0];

        // 特殊マッピング
        if (base === 'zh') return 'zh-CN';
        if (base === 'pt') return 'pt-BR';
        if (base === 'ja') return 'ja';
        if (base === 'ko') return 'ko';
        if (base === 'es') return 'es';
        if (base === 'fr') return 'fr';
        if (base === 'de') return 'de';

        // それ以外は英語
        return 'en';
      }
    },
    
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;