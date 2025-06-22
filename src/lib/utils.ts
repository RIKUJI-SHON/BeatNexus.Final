import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 言語コードを検証して正規化する関数
 * @param language - 検証する言語コード
 * @returns 正規化された言語コード ('en' | 'ja')
 */
export const validateLanguageCode = (language: string): string => {
  if (language === 'ja' || language === 'en') {
    return language;
  }
  // 不正な値の場合はデフォルトを返す
  console.warn('Unexpected language value:', language);
  return 'en'; // デフォルトは英語
};

/**
 * ブラウザの言語設定を検出する関数
 * @returns 検出された言語コード ('en' | 'ja')
 */
export const detectBrowserLanguage = (): string => {
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