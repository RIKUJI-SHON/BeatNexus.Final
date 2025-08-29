import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cf-webhook-signature',
};

function mapStatus(input?: string | null): 'uploading' | 'processing' | 'ready' | 'error' | undefined {
  if (!input) return undefined;
  const v = String(input).toLowerCase();
  if (v.includes('upload')) return 'uploading';
  if (v.includes('process') || v.includes('encoding') || v.includes('queued')) return 'processing';
  if (v.includes('ready') || v === 'success') return 'ready';
  if (v.includes('error') || v.includes('fail')) return 'error';
  return undefined;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const secret = Deno.env.get('CLOUDFLARE_STREAM_WEBHOOK_SECRET');
    const sig = req.headers.get('cf-webhook-signature');
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    if (!sig || sig !== secret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = await req.json().catch(() => ({}));
    const type: string | undefined = body?.type || body?.event || body?.action;
    const data = body?.data || body?.video || body?.result || body || {};
    const uid: string | undefined = data?.uid || data?.id || data?.videoId || body?.uid;
    const rawState: string | undefined = data?.status?.state || data?.state || body?.status;
    const status = mapStatus(rawState) || (type ? mapStatus(type) : undefined) || 'processing';
    const thumbnail: string | undefined = data?.thumbnail || data?.thumbnail_url || data?.thumbnailUrl;
    const preview: string | undefined = data?.preview || data?.preview_url || data?.previewUrl;
    const errorMessage: string | undefined = data?.status?.errorReason || data?.error || body?.error;

    if (!uid) {
      return new Response(JSON.stringify({ error: 'Missing uid in payload' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase env not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const update: Record<string, unknown> = {
      stream_status: status,
      updated_at: new Date().toISOString(),
    };
    if (thumbnail) update.stream_thumbnail_url = thumbnail;
    if (preview) update.stream_preview_url = preview;
    if (status === 'error' && errorMessage) update.stream_error_message = String(errorMessage);

    const { error } = await supabase
      .from('submissions')
      .update(update)
      .eq('stream_video_id', uid);

    if (error) {
      console.error('stream-webhook update error:', error);
      return new Response(JSON.stringify({ error: 'DB update failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    console.error('stream-webhook error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
