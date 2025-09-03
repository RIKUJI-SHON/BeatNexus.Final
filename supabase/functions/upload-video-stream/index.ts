import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      name,
      fileName,
      battleFormat,
      requireSignedURLs = false,
      maxDurationSeconds,
    } = body as Record<string, unknown>;

    // Determine max duration by battle format if not explicitly provided
    // MAIN_BATTLE: up to 120s, MINI_BATTLE: up to 60s, THEME_CHALLENGE: up to 120s (default)
    let effectiveMaxDuration = typeof maxDurationSeconds === 'number' ? maxDurationSeconds : 120;
    if (typeof battleFormat === 'string') {
      switch (battleFormat) {
        case 'MINI_BATTLE':
          effectiveMaxDuration = 60;
          break;
        case 'MAIN_BATTLE':
        case 'THEME_CHALLENGE':
        default:
          effectiveMaxDuration = 120;
      }
    }

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    if (!accountId || !apiToken) {
      return new Response(JSON.stringify({ error: 'Cloudflare Stream env is not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: effectiveMaxDuration,
        requireSignedURLs,
        meta: { name: (name as string) ?? (fileName as string) ?? 'BeatNexus Upload' },
      }),
    });
    const data = await cfRes.json();
    if (!cfRes.ok || !data?.success) {
      console.error('Cloudflare direct_upload error:', data);
      return new Response(JSON.stringify({ error: data?.errors?.[0]?.message || 'Failed to create direct upload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const { uploadURL, uid } = data.result;
    return new Response(JSON.stringify({ uploadURL, uid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('upload-video-stream error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
