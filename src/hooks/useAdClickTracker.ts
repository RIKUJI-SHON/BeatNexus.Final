// useAdClickTracker.ts
// 目的: CTA クリックをキャプチャし /ad/track に click イベント送信。5s 重複防止。

import { getAnonSessionId } from '../utils/anonSession';
import { detectDeviceType, getBrowserLanguage } from '../utils/deviceInfo';
import { useRecentAdEventCache } from './useRecentAdEventCache';

interface Params {
  creativeId: string | null;
  placementId: string | null;
  token: string | null;
  userId?: string;
}

export function useAdClickTracker(params: Params) {
  const { token, userId } = params;
  const recent = useRecentAdEventCache();

  async function trackClick(extra?: Record<string, unknown>) {
  if (!token) return;
    const anon = getAnonSessionId();
    const userOrAnon = userId || anon || 'anon';
  const key = recent.makeKey({ creativeId: token, placementId: 't', userOrAnon, type: 'click' });
    if (recent.has(key)) return; // 5s 内

    try {
      const res = await fetch('/ad/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, type: 'click', anon, client_meta: { ts: Date.now(), vw: window.innerWidth, vh: window.innerHeight, lang: getBrowserLanguage(), device: detectDeviceType(), ...extra } }),
      });
      if (res.ok) {
        recent.set(key, 5_000);
      }
    } catch (e) {
      console.warn('[ad] click send failed', e);
    }
  }

  // 使用法: <button onClick={() => clickTracker.trackClick({cta:'X'})}>
  return { trackClick } as const;
}
