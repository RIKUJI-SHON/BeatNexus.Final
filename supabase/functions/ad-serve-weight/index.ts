import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// Weight-based広告配信システム対応版 ad-serve Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Weight-based広告主選択
 * advertisers.weightに基づいて確率的に広告主を選択
 */
async function selectAdvertiserByWeight(supabase: any): Promise<string | null> {
  console.log('Selecting advertiser by weight...')
  
  const { data, error } = await supabase.rpc('weighted_random_advertiser')
  
  if (error) {
    console.error('Error selecting advertiser by weight:', error)
    return null
  }
  
  console.log('Selected advertiser ID:', data)
  return data
}

/**
 * 選択された広告主から優先度ベースで広告を選択
 */
async function selectAdByWeight(supabase: any, placementId: string, advertiserId: string) {
  console.log(`Selecting ad for advertiser ${advertiserId} in placement ${placementId}`)
  
  // 1. 該当する広告主の広告を優先度順で取得
  const { data: assignments, error: assignmentError } = await supabase
    .from('ad_placement_assignments')
    .select(`
      simple_ad_id, 
      priority, 
      is_pinned,
      simple_ads!inner(
        id, 
        title, 
        description, 
        image_url, 
        click_url, 
        advertiser_id, 
        is_active,
        contract_start_date,
        contract_end_date
      )
    `)
    .eq('placement_id', placementId)
    .eq('simple_ads.advertiser_id', advertiserId)
    .eq('simple_ads.is_active', true)
    .lte('simple_ads.contract_start_date', new Date().toISOString().split('T')[0])
    .gte('simple_ads.contract_end_date', new Date().toISOString().split('T')[0])
    .order('is_pinned', { ascending: false })
    .order('priority', { ascending: true })
    .limit(1)

  if (assignmentError || !assignments || assignments.length === 0) {
    console.log('No valid ads found for selected advertiser')
    return null
  }

  const assignment = assignments[0]
  const adData = assignment.simple_ads

  console.log('Selected ad:', { 
    ad_id: adData.id, 
    title: adData.title, 
    advertiser_id: adData.advertiser_id 
  })

  return adData
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting weight-based ad-serve function...')
    
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

    // 1. placement_idを取得
    const { data: placementData, error: placementError } = await supabase
      .from('ad_placements')
      .select('id')
      .eq('key', placement)
      .eq('is_active', true)
      .single()

    if (placementError || !placementData) {
      console.log('Placement not found, returning no fill')
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'AD_NO_FILL', 
          message: 'Placement not found', 
          placement_key: placement 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const placementId = placementData.id
    console.log('Placement ID:', placementId)

    // 2. Weight-based広告主選択
    const selectedAdvertiserId = await selectAdvertiserByWeight(supabase)
    
    if (!selectedAdvertiserId) {
      console.log('No advertiser selected by weight, returning no fill')
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'AD_NO_FILL', 
          message: 'No advertiser selected', 
          placement_key: placement 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. 選択された広告主から広告を選択
    const adData = await selectAdByWeight(supabase, placementId, selectedAdvertiserId)
    
    if (!adData) {
      console.log('No valid ad found for selected advertiser, returning no fill')
      return new Response(
        JSON.stringify({ 
          ok: false, 
          code: 'AD_NO_FILL', 
          message: 'No valid ad found for selected advertiser', 
          placement_key: placement,
          selected_advertiser_id: selectedAdvertiserId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 広告レスポンスを構築
    const response = {
      ok: true,
      data: {
        placement_key: placement,
        creative: {
          creative_id: adData.id,
          headline: adData.title,
          body: adData.description,
          cta_text: "詳しく見る",
          target_url: adData.click_url,
          file_url: adData.image_url
        },
        token: null, // 計測停止中なのでnull
        debug: {
          selected_advertiser_id: selectedAdvertiserId,
          selection_method: 'weight_based'
        }
      }
    }

    console.log('Sending weight-based ad response:', {
      creative_id: adData.id,
      advertiser_id: selectedAdvertiserId,
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
    console.error('Weight-based ad serve error:', error)
    
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
