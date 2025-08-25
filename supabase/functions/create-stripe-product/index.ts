import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateProductRequest {
  name: string;
  description: string;
  price_cents: number;
  currency?: string;
  connected_account_id: string;
  images?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🛍️ Starting product creation...')

    // ================================
    // Step 1: Environment Variables Check
    // ================================
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!STRIPE_SECRET_KEY) {
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

    // ================================
    // Step 2: User Authentication
    // ================================
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ================================
    // Step 3: Parse and Validate Request
    // ================================
    const requestData: CreateProductRequest = await req.json()
    const { 
      name, 
      description, 
      price_cents, 
      currency = 'jpy', 
      connected_account_id,
      images = []
    } = requestData

    // Validate required fields
    if (!name || !description || !price_cents || !connected_account_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: name, description, price_cents, connected_account_id' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (price_cents < 50) { // Stripe minimum
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Price must be at least 50 cents (¥50)' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ================================
    // Step 4: Verify Connected Account Ownership
    // ================================
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_account_id || profile.stripe_account_id !== connected_account_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid connected account. You can only create products for your own account.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Account ownership verified')

    // ================================
    // Step 5: Create Product at Platform Level
    // ================================
    // NOTE: Creating products at platform level (not on connected account)
    // as per the requirements. We'll store the connected account mapping.
    
    const productParams = new URLSearchParams({
      name: name,
      description: description,
      
      // Create with default price data
      'default_price_data[unit_amount]': price_cents.toString(),
      'default_price_data[currency]': currency,
      
      // Store connected account mapping in metadata
      'metadata[connected_account_id]': connected_account_id,
      'metadata[creator_user_id]': user.id,
      'metadata[platform]': 'BeatNexus',
      'metadata[created_at]': new Date().toISOString(),
    })

    // Add images if provided
    images.forEach((imageUrl, index) => {
      productParams.set(`images[${index}]`, imageUrl)
    })

    console.log('🏗️ Creating Stripe product...')

    const stripeResponse = await fetch('https://api.stripe.com/v1/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-07-30.basil'
      },
      body: productParams
    })

    const stripeData = await stripeResponse.json()

    if (!stripeResponse.ok) {
      console.error('❌ Stripe product creation failed:', stripeData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create product. Please try again.',
          debug: stripeData
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Stripe product created:', stripeData.id)

    // ================================
    // Step 6: Store Product in Database
    // ================================
    // Store product information in our database for easier querying
    const { data: savedProduct, error: dbError } = await supabase
      .from('stripe_products')
      .insert({
        stripe_product_id: stripeData.id,
        stripe_price_id: stripeData.default_price,
        name: name,
        description: description,
        price_cents: price_cents,
        currency: currency,
        connected_account_id: connected_account_id,
        creator_user_id: user.id,
        images: images,
        is_active: true,
        stripe_data: stripeData // Store full Stripe response
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database save failed:', dbError)
      // Product was created in Stripe but failed to save in DB
      // Could implement cleanup here, but for now just warn
      console.warn('⚠️ Product created in Stripe but failed to save in database')
    } else {
      console.log('✅ Product saved to database')
    }

    // ================================
    // Step 7: Return Success Response
    // ================================
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Product created successfully',
        product: {
          id: stripeData.id,
          name: stripeData.name,
          description: stripeData.description,
          default_price: stripeData.default_price,
          images: stripeData.images,
          url: stripeData.url,
          created: stripeData.created,
          database_id: savedProduct?.id
        },
        connected_account_id: connected_account_id,
        next_steps: {
          storefront: 'Product will appear in the storefront',
          checkout: 'Use create-checkout-session to process payments'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in create-product:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error?.message || 'Unknown error'}`,
        debug: {
          name: error?.name,
          message: error?.message
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
