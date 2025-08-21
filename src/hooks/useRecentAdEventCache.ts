// useRecentAdEventCache.ts
// 目的: 直近送った impression / click を短時間記録して重複送信を防ぐ。
// サーバ側も重複排除するが、フロントでも無駄リクエストを減らす二重防御。
// TTL: impression 30s, click 5s

import { useRef } from 'react';

interface Entry { expires: number }

export function useRecentAdEventCache() {
  const mapRef = useRef<Map<string, Entry>>(new Map());

  function set(key: string, ttlMs: number) {
    const now = Date.now();
    mapRef.current.set(key, { expires: now + ttlMs });
  }
  function has(key: string) {
    const now = Date.now();
    const e = mapRef.current.get(key);
    if (!e) return false;
    if (e.expires < now) { mapRef.current.delete(key); return false; }
    return true;
  }
  function makeKey(params: { creativeId: string; placementId: string; userOrAnon: string; type: 'impression' | 'click' }) {
    return `${params.creativeId}:${params.placementId}:${params.userOrAnon}:${params.type}`;
  }

  return { set, has, makeKey } as const;
}
