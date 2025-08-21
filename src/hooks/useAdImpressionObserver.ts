// useAdImpressionObserver.ts
// 目的: DOM要素が 50% 以上 1000ms 連続可視になったら impression を一度送信する。
// シンプル化: 要素が外れたらタイマーリセット。複雑な部分 (部分的な断続) は MVP では扱わない。

import { useEffect, useRef } from 'react';
import { getAnonSessionId } from '../utils/anonSession';
import { detectDeviceType, getBrowserLanguage } from '../utils/deviceInfo';
import { useRecentAdEventCache } from './useRecentAdEventCache';

interface Params {
  enabled: boolean;
  ref: React.RefObject<HTMLElement>;
  creativeId: string | null;
  placementId: string | null;
  token: string | null;
  userId?: string;
  onSent?: () => void;
}

export function useAdImpressionObserver(params: Params) {
  const { enabled, ref, creativeId, placementId, token, userId, onSent } = params;
  const recent = useRecentAdEventCache();
  const sentRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
  if (!enabled || !ref.current || !token) return; // token を唯一必須にシフト (creativeId/placementId はサーバ側で復元)
    if (sentRef.current) return; // 1回のみ

    const anon = getAnonSessionId();
  const userOrAnon = userId || anon || 'anon';
  // token ベース重複キー (MVP: token 自体 + 種別)
  const key = recent.makeKey({ creativeId: token, placementId: 't', userOrAnon, type: 'impression' });
    if (recent.has(key)) { sentRef.current = true; return; }

    const el = ref.current;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const ratio = entry.intersectionRatio;
      if (ratio >= 0.5) {
        // 開始: まだタイマーが無ければセット
        if (timerRef.current == null) {
          timerRef.current = window.setTimeout(async () => {
            // 1000ms 経過 still in view? 再チェック (最新 entry が 0.5 以上か) -> 実装簡略: 再取得
            const visible = entry.intersectionRatio >= 0.5; // entry は更新され続けるので近似でOK
            if (visible && !sentRef.current) {
              try {
                const res = await fetch('/ad/track', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token, type: 'impression', anon, client_meta: { vw: window.innerWidth, vh: window.innerHeight, lang: getBrowserLanguage(), device: detectDeviceType() } }),
                });
                if (res.ok) {
                  recent.set(key, 30_000); // 30s 再送防止
                  sentRef.current = true;
                  onSent?.();
                }
              } catch (e) {
                // ネットワークエラー等は黙殺 (MVP) 将来: リトライ/ログ
                console.warn('[ad] impression send failed', e);
              }
            }
          }, 1000);
        }
      } else {
        // 50% 未満に落ちたらタイマー解除
        if (timerRef.current != null) {
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
