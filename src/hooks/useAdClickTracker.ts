// useAdClickTracker.ts
// 目的: CTA クリックをキャプチャし /ad/track に click イベント送信。5s 重複防止。

import { getAnonSessionId } from '../utils/anonSession';
import { detectDeviceType, getBrowserLanguage } from '../utils/deviceInfo';
import { useRecentAdEventCache } from './useRecentAdEventCache';
import { trackClick as trackClickInternal } from '../lib/ads/tracker';

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
  const t: string = token; // token is string here (narrow)
    const anon = getAnonSessionId();
    const userOrAnon = userId || anon || 'anon';
  const key = recent.makeKey({ creativeId: t, placementId: 't', userOrAnon, type: 'click' });
    if (recent.has(key)) return; // 5s 内

  trackClickInternal(t, { anon, userId, meta: { ts: Date.now(), vw: window.innerWidth, vh: window.innerHeight, lang: getBrowserLanguage(), device: detectDeviceType(), ...extra } });
  recent.set(key, 5_000);
  }

  // 使用法: <button onClick={() => clickTracker.trackClick({cta:'X'})}>
  return { trackClick } as const;
}
