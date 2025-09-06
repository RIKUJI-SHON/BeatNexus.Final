import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// 重み付きシンプル広告配信 + 署名付きトークン発行（impression / click 用）
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

// deno-lint-ignore-file no-explicit-any
interface DenoLike { env: { get: (key: string) => string | undefined } }
declare const Deno: DenoLike;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 簡略化されたWeight-based広告選択
 * placement assignmentを無視して、全ての有効な広告から直接選択
 */
// 型簡略化: Supabase クライアント rpc 戻り値のみ使用
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function selectAdDirectly(supabase: { rpc: (fn: string) => Promise<{ data: any; error: any }> }) {
  console.log('Selecting ad directly from all active ads by weight...')
  
  const { data, error } = await supabase.rpc('weighted_random_ad')
  
  if (error) {
    console.error('Error selecting ad by weight:', error)
    return null
  }
  
  if (!data || data.length === 0) {
    console.log('No ads selected')
    return null
  }
  
  const selectedAd = data[0]
  console.log('Selected ad:', {
    ad_id: selectedAd.ad_id,
    title: selectedAd.title,
    advertiser_name: selectedAd.advertiser_name,
    advertiser_weight: selectedAd.advertiser_weight
  })
  
  return selectedAd
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting simplified weight-based ad-serve function...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { placement } = await req.json()
    console.log('Received placement:', placement)
    
    if (!placement) {
      return new Response(
        JSON.stringify({ ok: false, code: 'AD_INVALID_PLACEMENT' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // placementは受け取るが、実際の選択には影響しない（全広告から選択）
    console.log('Selecting ad directly from all active ads...')
    
    // 全ての有効な広告から直接選択
    const selectedAd = await selectAdDirectly(supabase)
    
    if (!selectedAd) {
      console.log('No ad selected, returning no fill')
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'AD_NO_FILL', 
          message: 'No ad available', 
          placement_key: placement 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 署名トークン生成
    const secret = Deno.env.get('AD_EVENT_SIGNING_SECRET') ?? ''
    console.log('[ad-serve] Environment variable check:', {
      hasSecret: !!secret,
      secretLength: secret.length,
      secretPrefix: secret.slice(0, 8),
      timestamp: new Date().toISOString()
    });
    if (!secret) {
      console.error('[ad-serve] AD_EVENT_SIGNING_SECRET not set')
      return new Response(JSON.stringify({ ok:false, code:'AD_CONFIG_ERROR'}), { status:500, headers:{...corsHeaders,'Content-Type':'application/json'} })
    }
    const header = { alg: 'HS256', typ: 'JWT' }
    const expSeconds = 60 * 5 // 5 分有効
    const payload = {
      sid: selectedAd.ad_id,        // simple_ad_id
      pk: placement,                // placement key
      iat: Math.floor(Date.now()/1000),
      exp: getNumericDate(expSeconds)
    }
    // djwt v3 create は secretKey を CryptoKey で要求。HMAC ライブラリ経由で bytes 化。
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign','verify']
    )
    const token = await create(header, payload, key)

    const response = {
      ok: true,
      data: {
        placement_key: placement,
        creative: {
          creative_id: selectedAd.ad_id, // 後方互換フィールド名
          headline: selectedAd.title,
          body: selectedAd.description,
          cta_text: '詳しく見る',
          target_url: selectedAd.click_url,
          file_url: selectedAd.image_url
        },
        token,
        debug: {
          advertiser_id: selectedAd.advertiser_id,
            advertiser_name: selectedAd.advertiser_name,
            advertiser_weight: selectedAd.advertiser_weight,
            selection_method: 'direct_weight_based'
        }
      }
    }

    console.log('Sending simplified weight-based ad response:', {
      creative_id: selectedAd.ad_id,
      advertiser_name: selectedAd.advertiser_name,
      advertiser_weight: selectedAd.advertiser_weight,
      placement: placement
    })
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Simplified weight-based ad serve error:', error)
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        code: 'AD_SERVER_ERROR', 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
