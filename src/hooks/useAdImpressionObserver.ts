// useAdImpressionObserver.ts
// 目的: DOM要素が 50% 以上 300ms 連続可視になったら impression を一度送信する。 (要件 FR-1)
// シンプル化: 要素が外れたらタイマーリセット。複雑な部分 (部分的な断続) は MVP では扱わない。

import { useEffect, useRef } from 'react';
import { getAnonSessionId } from '../utils/anonSession';
import { detectDeviceType, getBrowserLanguage } from '../utils/deviceInfo';
import { useRecentAdEventCache } from './useRecentAdEventCache';
import { queueImpression as queueImpressionInternal } from '../lib/ads/tracker';

declare global { interface Window { __AD_DEBUG_ENABLED?: boolean } }
function isDebug(){ return typeof window !== 'undefined' && window.__AD_DEBUG_ENABLED; }
function dbg(...args: unknown[]){ if (isDebug()) console.debug('[ad-imp]', ...args); }

interface Params {
  enabled: boolean;
  ref: React.RefObject<HTMLElement>;
  creativeId: string | null;
  placementId: string | null;
  token: string | null;
  userId?: string;
  onSent?: () => void;
}

// 型安全な impression 送信ヘルパー
function sendImpression(
  token: string, 
  anon: string, 
  userId?: string, 
  meta?: Record<string, unknown>
) {
  dbg('send impression');
  queueImpressionInternal(token, { 
    anon, 
    userId, 
    meta: { 
      vw: window.innerWidth, 
      vh: window.innerHeight, 
      lang: getBrowserLanguage(), 
      device: detectDeviceType(),
      ...meta
    } 
  });
}

export function useAdImpressionObserver(params: Params) {
  const { enabled, ref, creativeId, placementId, token, userId, onSent } = params;
  const recent = useRecentAdEventCache();
  const sentRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current || !token) { 
      dbg('inactive', { enabled, hasRef: !!ref.current, hasToken: !!token }); 
      return; 
    }
    
    // この時点で token は確実に string
    const tokenStr = token as string;
    
    if (sentRef.current) return; // 1回のみ

    const anon = getAnonSessionId();
    const userOrAnon = userId || anon || 'anon';
    // token ベース重複キー (MVP: token 自体 + 種別)
    const key = recent.makeKey({ creativeId: tokenStr, placementId: 't', userOrAnon, type: 'impression' });
    if (recent.has(key)) { 
      sentRef.current = true; 
      dbg('already recent (front dedupe)'); 
      return; 
    }

    const el = ref.current;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const ratio = entry.intersectionRatio;
      dbg('observe', { ratio });
      
      if (ratio >= 0.5) {
        // 開始: まだタイマーが無ければセット (300ms)
        if (timerRef.current == null) {
          dbg('>=0.5 start timer');
          timerRef.current = window.setTimeout(() => {
            const visible = entry.intersectionRatio >= 0.5;
            if (visible && !sentRef.current) {
              // 一時的に型チェック回避
              if (tokenStr) {
                sendImpression(tokenStr, anon, userId);
              }
              recent.set(key, 30_000); // 30s 再送防止 (フロント側)
              sentRef.current = true;
              onSent?.();
            }
          }, 300);
        }
      } else {
        // 50% 未満に落ちたらタイマー解除
        if (timerRef.current != null) {
          dbg('<0.5 cancel timer');
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }, { threshold: [0, 0.5, 1] });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
  }, [enabled, ref, creativeId, placementId, token, userId, recent, onSent]);
}
