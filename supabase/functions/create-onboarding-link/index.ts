import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-client-version, apikey, content-type',
}

interface OnboardingRequest {
  refresh_url?: string;
  return_url?: string;
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

    // リクエストボディを取得
    const body = await req.json()
    const { refresh_url, return_url }: OnboardingRequest = body

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

    console.log('🚀 Creating onboarding link for account:', profile.stripe_account_id)

    // デフォルトのリダイレクトURL設定
    const baseUrl = req.headers.get('origin') || 'http://localhost:5173'
    const defaultRefreshUrl = refresh_url || `${baseUrl}/payment-setup`
    const defaultReturnUrl = return_url || `${baseUrl}/payment-setup?success=true`

    // Stripe Account Links 作成（オンボーディング用）
    const stripeResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-07-30.basil'
      },
      body: new URLSearchParams({
        account: profile.stripe_account_id,
        refresh_url: defaultRefreshUrl,
        return_url: defaultReturnUrl,
        type: 'account_onboarding', // オンボーディング専用リンク
        'collect': 'currently_due' // 現在必要な最小限の情報のみ収集
      })
    })

    const stripeData = await stripeResponse.json()

    if (!stripeResponse.ok) {
      console.error('❌ Stripe account link creation failed:', stripeData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create onboarding link. Please try again.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Onboarding link created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        onboarding_url: stripeData.url,
        expires_at: stripeData.expires_at,
        message: 'Onboarding link created successfully'
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
