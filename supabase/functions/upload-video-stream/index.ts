import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS 設定
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-debug',
};

// 環境変数存在チェック（値自体はログに出さない）
function envPresence() {
  return {
    cfAccount: !!Deno.env.get('CLOUDFLARE_ACCOUNT_ID'),
    cfToken: !!Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN'),
    supabaseUrl: !!Deno.env.get('SUPABASE_URL'),
    supabaseAnon: !!Deno.env.get('SUPABASE_ANON_KEY'),
  };
}

serve(async (req: Request) => {
  const started = Date.now();
  const requestId = crypto.randomUUID();
  const debug = req.headers.get('x-debug') === 'true';

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const log = (...args: unknown[]) => { if (debug) console.log(`[upload-video-stream][${requestId}]`, ...args); };

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // 認証 (フロントは Authorization: Bearer <access_token> を送る想定)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      log('Missing authorization header');
      return new Response(JSON.stringify({ success: false, error: 'missing_authorization_header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) log('auth.getUser error', userErr);
    if (!user) {
      log('Unauthorized user');
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const rawBody = await req.text();
    let parsed: any = {};
    try { parsed = rawBody ? JSON.parse(rawBody) : {}; } catch { /* noop */ }
    const {
      name,
      fileName,
      fileSize,
      battleFormat,
      requireSignedURLs = false,
      maxDurationSeconds,
    } = parsed;

    log('incoming payload', {
      hasBody: !!rawBody,
      fileName,
      fileSize,
      battleFormat,
      requireSignedURLs,
      maxDurationSeconds,
      env: envPresence(),
    });

    // ファイルサイズ制限 (TUS 切替基準)
    const MAX_DIRECT = 200 * 1024 * 1024; // 200MB
    const MAX_TUS = 5 * 1024 * 1024 * 1024; // 5GB
    if (typeof fileSize === 'number' && fileSize > MAX_TUS) {
      return new Response(JSON.stringify({ success: false, error: 'file_too_large', maxBytes: MAX_TUS }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    const useTUS = typeof fileSize === 'number' ? fileSize > MAX_DIRECT : false;

    // battleFormat に基づく最大秒数
    let effectiveMaxDuration = typeof maxDurationSeconds === 'number' ? maxDurationSeconds : 120;
    if (typeof battleFormat === 'string') {
      switch (battleFormat) {
        case 'MINI_BATTLE':
          effectiveMaxDuration = 60; break;
        case 'MAIN_BATTLE':
        case 'THEME_CHALLENGE':
        default:
          effectiveMaxDuration = 120; break;
      }
    }

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    if (!accountId || !apiToken) {
      log('Missing Cloudflare env', envPresence());
      return new Response(JSON.stringify({ success: false, error: 'cloudflare_env_not_configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const payload = {
      maxDurationSeconds: effectiveMaxDuration,
      requireSignedURLs: !!requireSignedURLs,
      meta: {
        name: name || fileName || 'BeatNexus Upload',
        battleFormat: battleFormat || 'UNKNOWN',
        userId: user.id,
        uploadMethod: useTUS ? 'tus' : 'direct'
      }
    };

    log('requesting Cloudflare direct_upload', {
      maxDurationSeconds: effectiveMaxDuration,
      uploadMethod: useTUS ? 'tus' : 'direct'
    });

    const cfStart = Date.now();
    const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const cfElapsed = Date.now() - cfStart;
    let data: any = {};
    try { data = await cfRes.json(); } catch (e) { log('cf json parse error', e); }

    if (!cfRes.ok || !data?.success) {
      log('Cloudflare direct_upload error', { status: cfRes.status, data });
      return new Response(JSON.stringify({
        success: false,
        error: data?.errors?.[0]?.message || 'cloudflare_direct_upload_failed',
        status: cfRes.status,
        cfElapsedMs: cfElapsed,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const { uploadURL, uid } = data.result || {};
    if (!uploadURL || !uid) {
      log('Missing uploadURL / uid', data.result);
      return new Response(JSON.stringify({ success: false, error: 'invalid_cloudflare_response' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const elapsed = Date.now() - started;
    log('success', { uid, elapsedMs: elapsed, cfElapsedMs: cfElapsed });

    return new Response(JSON.stringify({
      success: true,
      uploadURL,
      streamVideoId: uid,
      uploadMethod: useTUS ? 'tus' : 'direct',
      maxDurationSeconds: effectiveMaxDuration,
      meta: {
        fileName: fileName || name,
        fileSize,
        battleFormat,
      },
      requestId,
      elapsedMs: elapsed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('[upload-video-stream][fatal]', e);
    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : 'unknown_error',
      requestId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
