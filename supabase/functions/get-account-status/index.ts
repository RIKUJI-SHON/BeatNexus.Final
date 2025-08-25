import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-client-version, apikey, content-type',
}

serve(async (req) => {
  // CORSプリフライト対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数確認
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY is required. Please set this environment variable.')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Stripe configuration missing. Please contact support.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Supabase クライアント初期化
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ユーザー認証確認
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ユーザーのStripe アカウントIDを取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, username')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.stripe_account_id) {
      console.error('❌ No Stripe account found for user:', user.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment account not found. Please create an account first.' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 Checking account status for:', profile.stripe_account_id)

    // Stripe アカウント情報を取得
    const stripeResponse = await fetch(`https://api.stripe.com/v1/accounts/${profile.stripe_account_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2025-07-30.basil'
      }
    })

    const stripeData = await stripeResponse.json()

    if (!stripeResponse.ok) {
      console.error('❌ Failed to retrieve Stripe account:', stripeData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check account status' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // アカウント状態の分析
    const requirements = stripeData.requirements || {}
    const isOnboardingComplete = !requirements.currently_due || requirements.currently_due.length === 0
    const isChargesEnabled = stripeData.charges_enabled
    const isPayoutsEnabled = stripeData.payouts_enabled
    
    // ステータス判定
    let status = 'incomplete'
    let statusMessage = 'アカウント設定が未完了です'
    
    if (isOnboardingComplete && isChargesEnabled && isPayoutsEnabled) {
      status = 'complete'
      statusMessage = 'アカウント設定が完了しています'
    } else if (isChargesEnabled) {
      status = 'partial'
      statusMessage = '決済受付可能ですが、設定の完了をお勧めします'
    }

    console.log('✅ Account status retrieved successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        account_id: profile.stripe_account_id,
        status: status,
        status_message: statusMessage,
        onboarding_complete: isOnboardingComplete,
        charges_enabled: isChargesEnabled,
        payouts_enabled: isPayoutsEnabled,
        requirements: {
          currently_due: requirements.currently_due || [],
          eventually_due: requirements.eventually_due || [],
          past_due: requirements.past_due || []
        },
        business_profile: stripeData.business_profile || {},
        country: stripeData.country,
        created: stripeData.created,
        details_submitted: stripeData.details_submitted
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
