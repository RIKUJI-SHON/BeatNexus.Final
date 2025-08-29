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

    const {
      name,
      requireSignedURLs = false,
      maxDurationSeconds = 120,
    } = await req.json().catch(() => ({}));

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
        maxDurationSeconds,
        requireSignedURLs,
        meta: { name: name ?? 'BeatNexus Upload' },
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
