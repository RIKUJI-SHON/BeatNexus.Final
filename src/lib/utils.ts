import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ブラウザの言語設定を検出し、サポートされている言語コードを返す
 */
export function detectBrowserLanguage(): string {
  // サポートされている言語
  const supportedLanguages = ['ja', 'en'];
  
  // ブラウザの言語設定を取得
  const browserLanguage = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage;
  
  // 言語コードを正規化（例: "ja-JP" -> "ja"）
  const languageCode = browserLanguage?.split('-')[0].toLowerCase();
  
  // サポートされている言語かチェック
  if (languageCode && supportedLanguages.includes(languageCode)) {
    return languageCode;
  }
  
  // デフォルトは英語
  return 'en';
}

/**
 * 言語コードが有効かどうかをチェックし、有効な言語コードを返す
 */
export function validateLanguageCode(language: string): string {
  const supportedLanguages = ['ja', 'en'];
  
  if (supportedLanguages.includes(language.toLowerCase())) {
    return language.toLowerCase();
  }
  
  // 無効な場合はデフォルトの日本語を返す
  return 'ja';
}
