// useAdServe.ts
// 目的: placementKey を指定してサーバ(ad-serve Edge Function)から広告クリエイティブを取得し、状態管理する React Hook。
// 状態: { loading, error, creative, token, noFill }
// シンプルなフェッチ。リトライや高度キャッシュは MVP では後回し。

import { useEffect, useState, useRef } from 'react';
import { getAnonSessionId } from '../utils/anonSession';
import { ADS_DELIVERY_DISABLED, STATIC_AD_OVERRIDES, isAdPlacementKey } from '../config/ads';

export interface AdCreativePayload {
  id: string;
  headline: string | null;
  body: string | null;
  cta_text: string | null;
  file_url: string | null;
  target_url: string | null;
}

interface ServeOk { ok: true; data: { key: string; creative: { creative_id: string; headline: string|null; body: string|null; cta_text: string|null; target_url: string|null; file_url: string|null }; token: string; cached?: boolean } }
interface ServeErr { ok: false; code: string; message?: string; placement_key?: string }
type ServeResponse = ServeOk | ServeErr;

export function useAdServe(placementKey: string | undefined, opts?: { country?: string; language?: string; device?: string; userId?: string; defer?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creative, setCreative] = useState<AdCreativePayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [noFill, setNoFill] = useState(false);
  const requestedRef = useRef(false); // 重複 fetch 防止 (一度だけ)

  useEffect(() => {
  if (!placementKey) return;
  if (opts?.defer) return; // まだ視界接近前
  if (requestedRef.current) return;
  
  // 配信完全無効: 何も表示しない (fallback 使用)
  if (ADS_DELIVERY_DISABLED) {
    if (!isAdPlacementKey(placementKey)) setError('INVALID_PLACEMENT_KEY');
    setNoFill(true);
    requestedRef.current = true;
    return;
  }
  // 静的オーバーライド優先 (計測不要 / token なし)
  if (isAdPlacementKey(placementKey) && STATIC_AD_OVERRIDES[placementKey]) {
    const ov = STATIC_AD_OVERRIDES[placementKey]!;
    setCreative({
      id: ov.id,
      headline: ov.headline || null,
      body: ov.body || null,
      cta_text: ov.cta_text || null,
      target_url: ov.target_url || null,
      file_url: ov.file_url || null,
    });
    // token 無 → impression / click フックは自動無効
    requestedRef.current = true;
    return;
  }
  // ここから先: シンプル広告システムの動的取得
  requestedRef.current = true;
    const anon = getAnonSessionId();
    setLoading(true);
    (async () => {
      try {
        // Supabase Edge Function への正しいパス
        const apiUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${apiUrl}/functions/v1/ad-serve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placement: placementKey, language: opts?.language, device: opts?.device, userId: opts?.userId, anon }),
        });
        const json: ServeResponse = await res.json().catch(() => ({ ok: false, code: 'AD_INTERNAL' } as ServeErr));
        
        if (!json.ok) {
          if (json.code === 'AD_NO_FILL' || json.code === 'AD_CAP_REACHED') {
            setNoFill(true);
          } else {
            console.warn('[useAdServe] Ad serve error:', placementKey, json.code);
            setError(json.code || json.message || 'UNKNOWN');
          }
          return;
        }
        // Map creative payload shape
        setCreative({
          id: json.data.creative.creative_id,
          headline: json.data.creative.headline,
          body: json.data.creative.body,
          cta_text: json.data.creative.cta_text,
          target_url: json.data.creative.target_url,
          file_url: json.data.creative.file_url || null, // シンプル広告システムでは対応済み
        });
        setToken(json.data.token);
      } catch (e) {
        console.error('[useAdServe] Fetch error:', placementKey, e);
        setError(e instanceof Error ? e.message : 'fetch failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [placementKey, opts?.country, opts?.language, opts?.device, opts?.userId, opts?.defer]);

  return { loading, error, creative, token, noFill } as const;
}
