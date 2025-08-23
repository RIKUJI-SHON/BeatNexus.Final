import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// 簡略化されたWeight-based広告配信システム - placement assignmentを無視
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 簡略化されたWeight-based広告選択
 * placement assignmentを無視して、全ての有効な広告から直接選択
 */
async function selectAdDirectly(supabase: any) {
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

    // 広告レスポンスを構築
    const response = {
      ok: true,
      data: {
        placement_key: placement,
        creative: {
          creative_id: selectedAd.ad_id,
          headline: selectedAd.title,
          body: selectedAd.description,
          cta_text: "詳しく見る",
          target_url: selectedAd.click_url,
          file_url: selectedAd.image_url
        },
        token: null, // 計測停止中なのでnull
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
