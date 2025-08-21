// Edge Function: ad-track
// Responsibility: Receive impression / click events, verify token, dedupe and insert ad_events.

import { createClient } from '@supabase/supabase-js';
import { verifyAdToken } from '../lib/jws';
import { globalDedupeCache, dedupeKey } from '../lib/cache';
import { DEDUPE_TTL_MS } from '../lib/dedupeCache';
import { resErr, resOk } from '../lib/errors';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwsSecret = process.env.AD_JWS_SECRET || 'dev-secret-change-me';
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

interface TrackBody {
  token: string;
  type: 'impression' | 'click';
  userId?: string; // optional authenticated user
  anon?: string; // anon session id
  client_meta?: Record<string, unknown>;
}

// Use resErr / resOk

async function insertEvent(params: { creative_id: string; flight_id: string | null; placement_id: string; type: 'impression' | 'click'; user_id?: string; anon?: string; client_meta?: Record<string, unknown>; }) {
  const { creative_id, flight_id, placement_id, type, user_id, anon, client_meta } = params;
  return supabase.from('ad_events').insert({
    creative_id,
    flight_id,
    placement_id,
    type,
    user_id: user_id || null,
    anon_session_id: anon || null,
    client_meta: client_meta || null,
  });
}

export async function handleTrack(body: TrackBody): Promise<Response> {
  if (!body || !body.token || !body.type) return resErr('BAD_REQUEST', 400, 'token & type required');
  if (!(body.type === 'impression' || body.type === 'click')) return resErr('BAD_REQUEST', 400, 'invalid type');
  // Require anon session id if unauthenticated for consistent attribution
  if (!body.userId && !body.anon) return resErr('BAD_REQUEST', 400, 'anon session id required (same id used at serve)');
  if (body.anon && (body.anon.length < 8 || body.anon.length > 64)) return resErr('BAD_REQUEST', 400, 'invalid anon session id');

  const verify = verifyAdToken(body.token, jwsSecret);
  if (!verify.ok) return resErr('AD_TOKEN_INVALID', 400, undefined, verify.reason);
  const payload = verify.payload;

  // dedupe
  const userOrAnon = body.userId || body.anon || 'anon';
  const key = dedupeKey({ creative_id: payload.creative_id, placement_id: payload.placement_id, user_or_anon: userOrAnon, type: body.type });
  const ttl = DEDUPE_TTL_MS[body.type];
  if (globalDedupeCache.has(key)) return resOk({ duplicate: true, ignored: true }, 200);
  globalDedupeCache.set(key, ttl);

  // Insert
  const { error } = await insertEvent({
    creative_id: payload.creative_id,
    flight_id: payload.flight_id,
    placement_id: payload.placement_id,
    type: body.type,
    user_id: body.userId,
    anon: body.anon,
    client_meta: body.client_meta,
  });
  if (error) return resErr('DB_ERROR', 500, error.message);
  return resOk({ inserted: true }, 201);
}

// Deno runtime adapter
// @ts-expect-error Deno global only when deployed
if (typeof Deno !== 'undefined' && (Deno as unknown as { serve?: unknown }).serve) {
  // @ts-expect-error serve present in Edge runtime
  (Deno as unknown as { serve: (h: (req: Request) => Promise<Response>) => void }).serve(async (req: Request) => {
    try {
  if (req.method !== 'POST') return resErr('METHOD_NOT_ALLOWED', 405);
      const body = await req.json().catch(()=> ({}));
      return await handleTrack(body as TrackBody);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown';
  return resErr('UNEXPECTED', 500, message);
    }
  });
}
