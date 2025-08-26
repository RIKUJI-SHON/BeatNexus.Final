import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-client-version, apikey, content-type',
}

interface CreateAccountRequest {
  email: string;
  country?: string;
  business_profile?: {
    name?: string;
    url?: string;
    product_description?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const debugLog: string[] = [];
    debugLog.push('🚀 Starting Stripe Connect account creation...');
    console.log('🚀 Starting Stripe Connect account creation...')

    // ================================
    // Step 1: Environment Variables Check
    // ================================
    // These environment variables must be set in Supabase Edge Functions settings
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    debugLog.push(`✅ Environment variables loaded. STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY ? 'present' : 'missing'}`);
    console.log(`✅ Environment variables loaded. STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY ? 'present' : 'missing'}`)

    if (!STRIPE_SECRET_KEY) {
      const errorMsg = 'STRIPE_SECRET_KEY environment variable is required';
      debugLog.push(`❌ ${errorMsg}`);
      console.error(`❌ ${errorMsg}`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Stripe configuration missing. Please contact support.',
          debug: 'STRIPE_SECRET_KEY not found',
          debugLog: debugLog
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ================================
    // Step 2: User Authentication
    // ================================
    debugLog.push('🔐 Checking user authentication...');
    console.log('🔐 Checking user authentication...');
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      debugLog.push('❌ No Authorization header found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authorization header required',
          debugLog: debugLog
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client for user verification
    debugLog.push('🔗 Initializing Supabase client...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    
    debugLog.push('🔍 Getting user from token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      debugLog.push(`❌ Authentication failed: ${authError?.message || 'User not found'}`);
      console.error('❌ Authentication failed:', authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication required',
          debugLog: debugLog,
          authError: authError?.message
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    debugLog.push(`✅ User authenticated: ${user.id}`);
    console.log('✅ User authenticated:', user.id)

    // ================================
    // Step 3: Parse Request Data
    // ================================
    debugLog.push('📝 Parsing request data...');
    console.log('📝 Parsing request data...')
    const requestData: CreateAccountRequest = await req.json()
    const { email, country = 'JP', business_profile } = requestData
    
    debugLog.push(`📊 Request data: email=${email}, country=${country}`);
    console.log('📊 Request data:', { email, country, business_profile })

    if (!email) {
      debugLog.push('❌ No email provided');
      console.error('❌ No email provided')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email address is required',
          debugLog: debugLog
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ================================
    // Step 4: Check for Existing Account
    // ================================
    debugLog.push('🔍 Checking for existing Stripe account...');
    console.log('🔍 Checking for existing Stripe account...')
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, username')
      .eq('id', user.id)
      .single()

    debugLog.push(`👤 Profile data: ${JSON.stringify(profile)}`);
    console.log('👤 Profile data:', profile)

    if (profile?.stripe_account_id) {
      debugLog.push(`✅ User already has Stripe account: ${profile.stripe_account_id}`);
      console.log('✅ User already has Stripe account:', profile.stripe_account_id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          accountId: profile.stripe_account_id,
          message: 'Stripe Connect account already exists',
          existing: true,
          debugLog: debugLog
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ================================
    // Step 5: Create Stripe Connect Account
    // ================================
    debugLog.push('🏗️ Creating new Stripe Connect account...');
    console.log('🏗️ Creating new Stripe Connect account...')
    
    // Prepare account creation parameters according to latest Stripe API
    debugLog.push('⚙️ Preparing account parameters...');
    console.log('⚙️ Preparing account parameters...')
    const accountParams = new URLSearchParams({
      // 🎯 IMPORTANT: Use controller properties only, never top-level type
      'controller[fees][payer]': 'application', // Platform handles pricing and fee collection
      'controller[losses][payments]': 'application', // Platform responsible for losses/refunds/chargebacks  
      'controller[stripe_dashboard][type]': 'express', // Give access to Express Dashboard
      
      // Basic account information
      email: email,
      country: country,
      business_type: 'individual', // 個人アカウントとして設定
      
      // エンターテイメント・音楽関連のMCCコード
      'business_profile[mcc]': '7929', // Band, Orchestra, Miscellaneous Entertainers (Not Elsewhere Classified)
      
      // Metadata for tracking
      'metadata[user_id]': user.id,
      'metadata[username]': profile?.username || 'unknown',
      'metadata[platform]': 'BeatNexus',
      'metadata[created_at]': new Date().toISOString(),
    })

    // Add business profile if provided
    if (business_profile?.name) {
      accountParams.set('business_profile[name]', business_profile.name)
    }
    if (business_profile?.url) {
      accountParams.set('business_profile[url]', business_profile.url)
    }

    // BeatNexus用のデフォルトビジネスプロファイル設定
    if (!business_profile?.name && profile?.username) {
      // ユーザー名をビジネス名として使用
      accountParams.set('business_profile[name]', `${profile.username} - BeatNexus Creator`)
    }
    
    if (!business_profile?.url) {
      // BeatNexusプロフィールページをビジネスURLとして使用
      const beatNexusProfileUrl = `https://beatnexus.com/profile/${user.id}`
      accountParams.set('business_profile[url]', beatNexusProfileUrl)
    }

    // 商品・サービス説明の設定
    const defaultProductDescription = 
      'Digital content creation and live performance entertainment on BeatNexus platform. ' +
      'Receives tips and support from community members for beatboxing performances and content.'
    
    accountParams.set('business_profile[product_description]', 
      business_profile?.product_description || defaultProductDescription
    )

    // ================================
    // Step 5-1: Stripe API call with latest controller params and pinned version
    // ================================
    debugLog.push('🔗 Making Stripe API call (controller + pinned Stripe-Version)...');
    console.log('🔗 Making Stripe API call (controller + pinned Stripe-Version)...')

    async function createStripeAccount(
      headers: Record<string, string>,
      body: URLSearchParams
    ) {
      const res = await fetch('https://api.stripe.com/v1/accounts', {
        method: 'POST',
        headers,
        body
      })
      const json = await res.json()
      return { res, json }
    }

    // Try 1: controller params + pinned version
  const { res: stripeRes1, json: stripeJson1 } = await createStripeAccount({
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2025-07-30.basil'
    }, accountParams)

    debugLog.push(`📡 Stripe response[1] status: ${stripeRes1.status}`)
    const error1 = !stripeRes1.ok ? (stripeJson1?.error || stripeJson1) : null
    if (!stripeRes1.ok) {
      console.error('❌ Stripe create (attempt 1) failed:', error1)
    }

    // Heuristic: if controller params or version cause issues, retry without Stripe-Version
  let stripeData: Record<string, unknown> = stripeJson1 as Record<string, unknown>
    let stripeResponseOk = stripeRes1.ok
    let usedStrategy: 'controller+pinned' | 'controller+default' | 'legacy-express' = 'controller+pinned'

    if (!stripeResponseOk) {
  // note: we could branch on error code/param here if needed
      const shouldRetryWithoutVersion = true // broad fallback if first attempt fails
      if (shouldRetryWithoutVersion) {
        debugLog.push('↩️ Retrying without Stripe-Version header...')
        const r2 = await createStripeAccount({
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }, accountParams)
        debugLog.push(`📡 Stripe response[2] status: ${r2.res.status}`)
        if (r2.res.ok) {
          stripeData = r2.json
          stripeResponseOk = true
          usedStrategy = 'controller+default'
        } else {
          console.error('❌ Stripe create (attempt 2) failed:', r2.json?.error || r2.json)
          // If still failing, try legacy style: type=express + capabilities requested
          debugLog.push('↩️ Retrying with legacy params (type=express + capabilities)...')
          const legacyParams = new URLSearchParams()
          legacyParams.set('type', 'express')
          legacyParams.set('email', email)
          legacyParams.set('country', country)
          legacyParams.set('business_type', 'individual')
          legacyParams.set('business_profile[mcc]', '7929')
          // metadata
          legacyParams.set('metadata[user_id]', user.id)
          legacyParams.set('metadata[username]', profile?.username || 'unknown')
          legacyParams.set('metadata[platform]', 'BeatNexus')
          legacyParams.set('metadata[created_at]', new Date().toISOString())
          // optional business profile
          const bpName = business_profile?.name || (profile?.username ? `${profile.username} - BeatNexus Creator` : undefined)
          if (bpName) legacyParams.set('business_profile[name]', bpName)
          const bpUrl = business_profile?.url || `https://beatnexus.com/profile/${user.id}`
          if (bpUrl) legacyParams.set('business_profile[url]', bpUrl)
          legacyParams.set('business_profile[product_description]', business_profile?.product_description || defaultProductDescription)
          // capabilities (old style)
          legacyParams.set('capabilities[transfers][requested]', 'true')
          legacyParams.set('capabilities[card_payments][requested]', 'true')

          const r3 = await createStripeAccount({
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }, legacyParams)
          debugLog.push(`📡 Stripe response[3] status: ${r3.res.status}`)
          if (r3.res.ok) {
            stripeData = r3.json
            stripeResponseOk = true
            usedStrategy = 'legacy-express'
          } else {
            console.error('❌ Stripe create (attempt 3, legacy) failed:', r3.json?.error || r3.json)
            stripeData = r3.json
          }
        }
      }
    }

    if (!stripeResponseOk) {
      debugLog.push('❌ All attempts to create Stripe account failed')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create payment account. Please try again.',
          debug: stripeData,
          strategy: usedStrategy,
          debugLog
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    debugLog.push(`✅ Stripe account created via strategy: ${usedStrategy}`)
    console.log('✅ Stripe account created via strategy:', usedStrategy)

    const accountId = stripeData.id
    debugLog.push(`✅ Stripe Connect account created: ${accountId}`);
    console.log('✅ Stripe Connect account created:', accountId)

    // ================================
    // Step 6: Save Account ID to Database
    // ================================
    debugLog.push('💾 Saving account ID to database...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        stripe_account_id: accountId,
        stripe_charges_enabled: false, // Will be updated after onboarding
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      debugLog.push(`❌ Failed to save Stripe account ID: ${updateError.message}`);
      console.error('❌ Failed to save Stripe account ID:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to save account information',
          debug: updateError,
          debugLog: debugLog
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    debugLog.push('✅ Stripe account ID saved to database');
    console.log('✅ Stripe account ID saved to database')

    // ================================
    // Step 7: Return Success Response
    // ================================
    debugLog.push('🎉 Returning success response');
    return new Response(
      JSON.stringify({ 
        success: true, 
        accountId: accountId,
        message: 'Stripe Connect account created successfully',
        next_steps: {
          onboarding: 'Use create-onboarding-link to start the onboarding process',
          status_check: 'Use get-account-status to check onboarding progress'
        },
        account_info: {
          id: stripeData.id,
          country: stripeData.country,
          created: stripeData.created,
          details_submitted: stripeData.details_submitted,
          charges_enabled: stripeData.charges_enabled,
          payouts_enabled: stripeData.payouts_enabled
        },
        debugLog: debugLog
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in create-connect-account:', error)
    
    // Detailed error logging for debugging
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error?.message || 'Unknown error'}`,
        debug: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack?.substring(0, 1000), // Longer stack trace for debugging
          timestamp: new Date().toISOString(),
          function: 'create-connect-account'
        },
        // Include debug log in catch block too
        debugLog: [`❌ Caught exception: ${error?.message}`]
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
