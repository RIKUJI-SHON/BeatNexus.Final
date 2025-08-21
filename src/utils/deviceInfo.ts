// deviceInfo.ts
// 簡易なデバイスタイプ判定とブラウザ言語取得。
// 厳密さより軽量さ重視 (MVP)。将来 UA-CH 等で改善可。

export function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobi|iphone|android/.test(ua)) return 'mobile';
  return 'desktop';
}

export function getBrowserLanguage(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.language || null;
}
