// Edge Function: ad-serve (scaffold)
// Responsibility: Select one eligible ad creative for a placement and return signed token.

import { createClient } from '@supabase/supabase-js';
import { signAdToken } from '../lib/jws';
import { TTLCache } from '../lib/dedupeCache';
import { serveCandidateCache, buildServeCacheKey, ServeCandidateRow } from '../lib/valueCache';
import { resErr, resOk, noFill } from '../lib/errors';
// AdCreative type no longer needed directly after RPC refactor

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-side only
const jwsSecret = process.env.AD_JWS_SECRET || 'dev-secret-change-me';

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

export const cache = new TTLCache(); // placeholder (not heavily used here yet)

interface ServeRequest {
  placement: string;
  country?: string; // ISO country code (lower/upper mix acceptable)
  language?: string; // e.g. 'ja','en'
  device?: string; // 'desktop' | 'mobile' ... (自由形式 MVP)
  userId?: string; // Supabase auth user id
  anon?: string; // client generated anon session id
}

interface ServeResponseCreative {
  id: string;
  headline: string | null;
  body: string | null;
  cta_text: string | null;
  file_url: string | null;
  target_url: string | null;
}
interface ServeResponse { creative: ServeResponseCreative; token: string; }

function weightPick<T extends { weight: number | null }>(items: T[]): T | undefined {
  const total = items.reduce((s,i)=> s + (i.weight || 1), 0);
  if (total <= 0) return undefined;
  let r = Math.random() * total;
  for (const it of items) { r -= (it.weight || 1); if (r <= 0) return it; }
  return items[items.length - 1];
}

// Targeting 判定: targeting_json は以下例を想定
// { countries: ["JP","US"], languages:["ja"], devices:["mobile","desktop"] }
// Targeting logic moved into SQL RPC; keeping placeholder type for future extension if needed.
type TargetingShape = unknown;

export async function handleServe(req: ServeRequest): Promise<Response> {
  if (!req.placement) return resErr('BAD_REQUEST', 400, 'placement required');
  // Enforce anon session id presence when unauthenticated to stabilize attribution & daily caps
  if (!req.userId && !req.anon) return resErr('BAD_REQUEST', 400, 'anon session id required (generate a UUID and persist client-side)');
  if (req.anon && (req.anon.length < 8 || req.anon.length > 64)) return resErr('BAD_REQUEST', 400, 'invalid anon session id');

  // Use consolidated RPC to fetch candidates + counts
  interface RpcRow extends ServeCandidateRow { targeting_json: TargetingShape }
  const cacheKey = buildServeCacheKey({ placement: req.placement, country: req.country, language: req.language, device: req.device, userOrAnon: req.userId || req.anon || null });
  let rpcData: RpcRow[] | undefined = serveCandidateCache.get(cacheKey) as RpcRow[] | undefined;
  if (!rpcData) {
    try {
      const { data, error } = await supabase.rpc('ad_serve_candidates', {
        p_placement_key: req.placement,
        p_user_id: req.userId || null,
        p_anon_id: req.userId ? null : (req.anon || null), // userId 優先、両方渡さない
        p_country: req.country || null,
        p_language: req.language || null,
        p_device: req.device || null,
      });
      if (error) return resErr('DB_ERROR', 500, error.message);
      rpcData = (data || []) as RpcRow[];
      // Adaptive candidate caching:
      //  - If any flight has caps (imp_goal / daily_cap) we shorten TTL to reduce stale cap decisions.
      //  - Otherwise (fully uncapped) we keep 30s TTL.
      //  - Only cache reasonably small result sets to avoid memory pressure.
      if (rpcData.length > 0 && rpcData.length <= 200) {
        const hasDynamicCaps = rpcData.some(r => (r.imp_goal != null && r.imp_goal > 0) || (r.daily_cap != null && r.daily_cap > 0));
        const ttl = hasDynamicCaps ? 5_000 : 30_000; // 5s for cap-sensitive, 30s for stable
        serveCandidateCache.set(cacheKey, rpcData, ttl);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'rpc failed';
      return resErr('DB_ERROR', 500, msg);
    }
  }

  if (rpcData.length === 0) return noFill();

  // Apply cap / goal filtering client side to distinguish AD_CAP_REACHED later
  const candidates = rpcData.filter(row => {
    if (row.imp_goal != null && row.imp_goal > 0 && row.total_imps >= row.imp_goal) return false;
    if (row.daily_cap != null && row.daily_cap > 0 && row.user_today_imps >= row.daily_cap) return false;
    return true;
  });

  if (candidates.length === 0) {
    // All filtered by caps / goals
    return resErr('AD_CAP_REACHED', 204);
  }

  const picked = weightPick(candidates.map(c => ({ ...c, weight: c.weight ?? 1 })));
  if (!picked) return noFill();

  const token = signAdToken({
    creative_id: picked.creative_id,
    flight_id: picked.flight_id,
    placement_id: picked.placement_id,
    exp: Math.floor(Date.now()/1000) + 60 * 10,
  }, jwsSecret);

  const res: ServeResponse = {
    creative: {
      id: picked.creative_id,
      headline: picked.creative_headline,
      body: picked.creative_body,
      cta_text: picked.creative_cta_text,
      file_url: picked.creative_file_url,
      target_url: picked.creative_target_url,
    },
    token,
  };
  return resOk(res, 200);
}

// legacy json removed (use resOk/resErr)

// Deno.serve adapter (if running as Edge Function)
// @ts-expect-error Deno global only in Edge runtime
if (typeof Deno !== 'undefined' && (Deno as unknown as { serve?: unknown }).serve) {
  // @ts-expect-error serve exists in Edge runtime
  (Deno as unknown as { serve: (h: (req: Request) => Promise<Response>) => void }).serve(async (req: Request) => {
    try {
      const url = new URL(req.url);
      const placement = url.searchParams.get('placement') || '';
      const body = await req.json().catch(()=>({}));
      return await handleServe({ placement, ...body });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown';
  return resErr('UNEXPECTED', 500, message);
    }
  });
}
