import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ブラウザの言語設定を検出し、サポートされている言語コードを返す
 */
export function detectBrowserLanguage(): string {
  // サポートされている言語（i18nと一致させる）
  const supportedLanguages = ['en', 'ja', 'ko', 'zh-CN', 'es', 'pt-BR', 'fr', 'de'];
  
  // ブラウザの言語設定を取得
  const browserLanguage = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage;
  console.log('🌐 Browser raw language:', browserLanguage);
  console.log('🌐 Navigator languages:', navigator.languages);
  
  // 言語コードを正規化（例: "ja-JP" -> "ja"）
  const languageCode = browserLanguage?.toLowerCase();
  console.log('🌐 Normalized language code:', languageCode);
  
  // サポートされている言語かチェック
  if (languageCode && supportedLanguages.includes(languageCode)) {
    console.log('🌐 Language supported, returning:', languageCode);
    return languageCode;
  }
  // ベース言語へ縮約（例: es-419 -> es）
  const base = browserLanguage?.split('-')[0]?.toLowerCase();
  if (base) {
    if (base === 'zh') return 'zh-CN';
    if (base === 'pt') return 'pt-BR';
    if (supportedLanguages.includes(base)) {
      console.log('🌐 Base language supported, returning:', base);
      return base;
    }
  }

  // デフォルトは英語
  console.log('🌐 Language not supported or not detected, defaulting to: en');
  return 'en';
}

/**
 * 言語コードが有効かどうかをチェックし、有効な言語コードを返す
 */
export function validateLanguageCode(language: string): string {
  const supportedLanguages = ['en', 'ja', 'ko', 'zh-CN', 'es', 'pt-BR', 'fr', 'de'];
  const lower = language?.toLowerCase();
  if (!lower) return 'en';
  if (supportedLanguages.includes(lower)) return lower;
  // ベース言語対応
  const base = lower.split('-')[0];
  if (base === 'zh') return 'zh-CN';
  if (base === 'pt') return 'pt-BR';
  if (supportedLanguages.includes(base)) return base;
  // 無効な場合は英語
  return 'en';
}
