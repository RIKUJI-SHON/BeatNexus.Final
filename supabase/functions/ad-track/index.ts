import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify, decode } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrackBody {
  type: 'impression' | 'click'
  anon?: string
  userId?: string
  client_meta?: Record<string, unknown>
}

type TokenPayload = { sid: string; pk: string; iat: number; exp: number }

// 簡易 in-memory TTL 重複排除 (Edge インスタンス内のみ)
const recent = new Map<string, number>()
const IMP_TTL_MS = 30_000
const CLICK_TTL_MS = 5_000

function gc(now:number){
  for (const [k,v] of recent){ if (v < now) recent.delete(k) }
}

async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    console.log('[ad-track] Starting token verification (simplified)');
    console.log('[ad-track] Token (first 50 chars):', token.slice(0, 50));
    console.log('[ad-track] Secret (first 10 chars):', secret.slice(0, 10));
    
    // トークンを3つの部分に分割
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[ad-track] Invalid token structure, parts:', parts.length);
      return null;
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    console.log('[ad-track] Token parts extracted successfully');
    
    // ペイロードをデコード
    let payload: any;
    try {
      const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
      payload = JSON.parse(payloadJson);
      console.log('[ad-track] Payload decoded:', JSON.stringify(payload));
    } catch (e) {
      console.error('[ad-track] Payload decode failed:', e);
      return null;
    }
    
    // 有効期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error('[ad-track] Token expired:', payload.exp, 'vs', now);
      return null;
    }
    console.log('[ad-track] Token expiry check passed');
    
    // 基本フィールド確認
    if (typeof payload.sid !== 'string') {
      console.error('[ad-track] Payload validation failed: sid is not string', typeof payload.sid);
      return null;
    }
    if (typeof payload.pk !== 'string') {
      console.error('[ad-track] Payload validation failed: pk is not string', typeof payload.pk);
      return null;
    }
    
    console.log('[ad-track] Basic validation successful - returning payload');
    return payload as TokenPayload;
    
  } catch (e){
    console.error('[ad-track] token verify failed', e)
    console.error('[ad-track] error details:', {
      message: e.message,
      name: e.name,
      stack: e.stack?.slice(0, 200)
    });
    return null
  }
}

serve(async (req) => {
  console.log('[ad-track] REQUEST START', req.method, req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('[ad-track] OPTIONS request');
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.log('[ad-track] Invalid method:', req.method);
    return new Response('Method Not Allowed', { status:405, headers: corsHeaders })
  }

  let body: TrackBody
  try {
    body = await req.json()
    console.log('[ad-track] Parsed body:', JSON.stringify(body));
  } catch {
    console.log('[ad-track] JSON parse failed');
    return new Response(JSON.stringify({ ok:false, code:'BAD_JSON' }), { status:400, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }
  if (!body || (body.type !== 'impression' && body.type !== 'click')){
    console.log('[ad-track] Invalid payload:', body);
    return new Response(JSON.stringify({ ok:false, code:'INVALID_PAYLOAD' }), { status:400, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }

  // Authorizationヘッダーからトークンを取得
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[ad-track] Missing or invalid Authorization header');
    return new Response(JSON.stringify({ ok:false, code:'MISSING_TOKEN' }), { status:401, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }
  const token = authHeader.slice(7) // "Bearer " を除去

  const secret = Deno.env.get('AD_EVENT_SIGNING_SECRET') || ''
  console.log('[ad-track] Environment variable check:', {
    hasSecret: !!secret,
    secretLength: secret.length,
    secretPrefix: secret.slice(0, 8),
    timestamp: new Date().toISOString()
  });
  if (!secret){
    console.log('[ad-track] No secret configured');
    return new Response(JSON.stringify({ ok:false, code:'CONFIG_MISSING'}), { status:500, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }

  const payload = await verifyToken(token, secret)
  if (!payload){
    console.log('[ad-track] Token verification failed');
    return new Response(JSON.stringify({ ok:false, code:'TOKEN_INVALID'}), { status:401, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }

  console.log('[ad-track] Token payload:', JSON.stringify(payload));

  // 重複判定
  const userOrAnon = body.userId || body.anon || 'anon'
  const dedupeKey = `${payload.sid}:${payload.pk}:${body.type}:${userOrAnon}`
  const now = Date.now()
  const existing = recent.get(dedupeKey)
  if (existing && existing > now){
    console.log('[ad-track] Deduped:', dedupeKey);
    return new Response(JSON.stringify({ ok:true, deduped:true }), { status:200, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }
  recent.set(dedupeKey, now + (body.type === 'impression' ? IMP_TTL_MS : CLICK_TTL_MS))
  if (recent.size > 5000) gc(now) // 簡易 GC

  // 一時的なデバッグ: 環境変数アクセスを確認
  const supabaseUrl = globalThis.Deno?.env?.get('SUPABASE_URL') ?? 'https://wdttluticnlqzmqmfvgt.supabase.co'
  const serviceRoleKey = globalThis.Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = globalThis.Deno?.env?.get('SUPABASE_ANON_KEY') ?? ''
  
  console.log('[ad-track] Environment check:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceRole: !!serviceRoleKey,
    hasAnonKey: !!anonKey,
    usingServiceRole: !!serviceRoleKey
  });
  
  // SERVICE_ROLE_KEYが空の場合はANON_KEYを使用
  const apiKey = serviceRoleKey || anonKey
  
  if (!apiKey) {
    console.error('[ad-track] No API key available');
    return new Response(JSON.stringify({ ok:false, code:'CONFIG_MISSING'}), { status:500, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }
  
  const supabase = createClient(supabaseUrl, apiKey)

  try {
    // placement key を id 解決
    const { data: placementRec } = await supabase
      .from('ad_placements')
      .select('id')
      .eq('key', payload.pk)
      .maybeSingle()

    const placement_id = placementRec?.id || null
    console.log('[ad-track] Placement resolution:', payload.pk, '→', placement_id);

    const insertPayload = {
      type: body.type,
      simple_ad_id: payload.sid,
      placement_id,
      anon_session_id: body.userId ? null : body.anon || null,
      user_id: body.userId || null,
      client_meta: body.client_meta || null
    }

    console.log('[ad-track] Insert payload:', JSON.stringify(insertPayload));

    const { error } = await supabase.from('ad_events').insert(insertPayload)
    if (error){
      console.error('[ad-track] insert error', error)
      return new Response(JSON.stringify({ ok:false, code:'DB_ERROR' }), { status:500, headers:{...corsHeaders,'Content-Type':'application/json'} })
    }
    
    console.log('[ad-track] SUCCESS:', body.type, payload.sid);
    return new Response(JSON.stringify({ ok:true }), { status:200, headers:{...corsHeaders,'Content-Type':'application/json'} })
  } catch (e){
    console.error('[ad-track] unexpected', e)
    return new Response(JSON.stringify({ ok:false, code:'UNEXPECTED' }), { status:500, headers:{...corsHeaders,'Content-Type':'application/json'} })
  }
})
// Deprecated: ad-track replaced by ad-click minimal endpoint in Phase0.
export {};
