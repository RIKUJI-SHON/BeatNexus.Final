// Deprecated: ad-serve removed in Phase0 minimal click-only mode.
// シンプルな広告配信API - 複雑なフライト・ターゲティングロジックを排除
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting ad-serve function...')
    
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

    console.log('Looking up placement in database...')
    // 1. placement_idを取得
    const { data: placementData, error: placementError } = await supabase
      .from('ad_placements')
      .select('id')
      .eq('key', placement)
      .eq('is_active', true)
      .single()

    console.log('Placement lookup result:', { placementData, placementError })

    if (placementError || !placementData) {
      console.log('Placement not found, returning test ad')
      // フォールバック: テスト広告を返す
      const fallbackAd = {
        ok: true,
        data: {
          placement_key: placement,
          creative: {
            creative_id: "fallback-test-123",
            headline: "フォールバック広告",
            body: "配置設定が見つからないため、テスト広告を表示しています",
            cta_text: "詳しく見る",
            target_url: "https://example.com/fallback",
            file_url: "https://via.placeholder.com/300x200/ff6600/ffffff?text=Fallback+Ad"
          },
          token: null
        }
      }
      return new Response(
        JSON.stringify(fallbackAd),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const placementId = placementData.id
    console.log('Placement ID:', placementId)

    console.log('Looking up ad assignments...')
    // 2. 現在有効な広告を取得
    const { data: assignments, error: assignmentError } = await supabase
      .from('ad_placement_assignments')
      .select('simple_ad_id, priority, is_pinned')
      .eq('placement_id', placementId)
      .order('is_pinned', { ascending: false })
      .order('priority', { ascending: true })
      .limit(1)

    console.log('Assignment lookup result:', { assignments, assignmentError })

    if (assignmentError || !assignments || assignments.length === 0) {
      console.log('No assignments found, returning test ad')
      // フォールバック: テスト広告を返す
      const fallbackAd = {
        ok: true,
        data: {
          placement_key: placement,
          creative: {
            creative_id: "fallback-no-assignment-123",
            headline: "デフォルト広告",
            body: "この配置に広告が設定されていません",
            cta_text: "詳しく見る",
            target_url: "https://example.com/no-assignment",
            file_url: "https://via.placeholder.com/300x200/999999/ffffff?text=No+Assignment"
          },
          token: null
        }
      }
      return new Response(
        JSON.stringify(fallbackAd),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const assignment = assignments[0]
    console.log('Selected assignment:', assignment)

    // 3. 広告の詳細を取得
    const { data: adData, error: adError } = await supabase
      .from('simple_ads')
      .select('*')
      .eq('id', assignment.simple_ad_id)
      .eq('is_active', true)
      .lte('contract_start_date', new Date().toISOString().split('T')[0])
      .gte('contract_end_date', new Date().toISOString().split('T')[0])
      .single()

    console.log('Ad lookup result:', { adData, adError })

    if (adError || !adData) {
      console.log('Ad not found or expired, returning test ad')
      // フォールバック: テスト広告を返す
      const fallbackAd = {
        ok: true,
        data: {
          placement_key: placement,
          creative: {
            creative_id: "fallback-expired-123",
            headline: "期限切れ広告",
            body: "設定された広告が期限切れです",
            cta_text: "詳しく見る",
            target_url: "https://example.com/expired",
            file_url: "https://via.placeholder.com/300x200/cc6600/ffffff?text=Expired+Ad"
          },
          token: null
        }
      }
      return new Response(
        JSON.stringify(fallbackAd),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. データベースから取得した実際の広告を返す
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
        token: null // 計測停止中なのでnull
      }
    }

    console.log('Sending database ad response:', response)
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Ad serve error:', error)
    
    return new Response(
      JSON.stringify({ ok: false, code: 'AD_SERVER_ERROR', error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
