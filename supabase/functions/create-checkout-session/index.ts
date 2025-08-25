import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutSessionRequest {
  product_id: string;
  connected_account_id: string;
  success_url: string;
  cancel_url: string;
  quantity?: number;
  application_fee_percent?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('💳 Starting checkout session creation...')

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
    const requestData: CheckoutSessionRequest = await req.json()
    const { 
      product_id, 
      connected_account_id, 
      success_url, 
      cancel_url,
      quantity = 1,
      application_fee_percent = 10 // Default 10% platform fee
    } = requestData

    // Validate required fields
    if (!product_id || !connected_account_id || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: product_id, connected_account_id, success_url, cancel_url' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Request validated')

    // ================================
    // Step 4: Retrieve Product Information
    // ================================
    const stripeProductResponse = await fetch(`https://api.stripe.com/v1/products/${product_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2025-07-30.basil'
      }
    })

    const productData = await stripeProductResponse.json()

    if (!stripeProductResponse.ok) {
      console.error('❌ Product not found:', productData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Product not found or inactive' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the product belongs to the specified connected account
    if (productData.metadata?.connected_account_id !== connected_account_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Product does not belong to the specified connected account' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Product verified')

    // ================================
    // Step 5: Get Price Information
    // ================================
    const priceId = productData.default_price
    if (!priceId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Product has no default price configured' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get price details to calculate application fee
    const stripePriceResponse = await fetch(`https://api.stripe.com/v1/prices/${priceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2025-07-30.basil'
      }
    })

    const priceData = await stripePriceResponse.json()
    if (!stripePriceResponse.ok) {
      console.error('❌ Price not found:', priceData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Price information not available' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate application fee amount
    const unitAmount = priceData.unit_amount
    const totalAmount = unitAmount * quantity
    const applicationFeeAmount = Math.round(totalAmount * (application_fee_percent / 100))

    console.log('💰 Price calculation:', {
      unitAmount,
      quantity,
      totalAmount,
      applicationFeeAmount,
      applicationFeePercent: application_fee_percent
    })

    // ================================
    // Step 6: Create Checkout Session
    // ================================
    const checkoutParams = new URLSearchParams({
      'mode': 'payment',
      'success_url': success_url,
      'cancel_url': cancel_url,
      
      // Line items
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': quantity.toString(),
      
      // Payment intent data for destination charges
      'payment_intent_data[transfer_data][destination]': connected_account_id,
      'payment_intent_data[application_fee_amount]': applicationFeeAmount.toString(),
      
      // Customer and metadata
      'metadata[product_id]': product_id,
      'metadata[connected_account_id]': connected_account_id,
      'metadata[buyer_user_id]': user.id,
      'metadata[quantity]': quantity.toString(),
      'metadata[application_fee_percent]': application_fee_percent.toString(),
      'metadata[platform]': 'BeatNexus',
      'metadata[created_at]': new Date().toISOString(),
      
      // Optional customer email (if available)
      ...(user.email && { 'customer_email': user.email })
    })

    console.log('🏗️ Creating Stripe checkout session...')

    const checkoutResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-07-30.basil'
      },
      body: checkoutParams
    })

    const checkoutData = await checkoutResponse.json()

    if (!checkoutResponse.ok) {
      console.error('❌ Checkout session creation failed:', checkoutData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create checkout session. Please try again.',
          debug: checkoutData
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Checkout session created:', checkoutData.id)

    // ================================
    // Step 7: Store Session in Database
    // ================================
    const { data: savedSession, error: dbError } = await supabase
      .from('stripe_checkout_sessions')
      .insert({
        stripe_session_id: checkoutData.id,
        stripe_product_id: product_id,
        connected_account_id: connected_account_id,
        buyer_user_id: user.id,
        quantity: quantity,
        total_amount: totalAmount,
        application_fee_amount: applicationFeeAmount,
        application_fee_percent: application_fee_percent,
        status: 'pending',
        stripe_data: checkoutData
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database save failed:', dbError)
      console.warn('⚠️ Checkout session created but failed to save in database')
    } else {
      console.log('✅ Session saved to database')
    }

    // ================================
    // Step 8: Return Success Response
    // ================================
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Checkout session created successfully',
        session: {
          id: checkoutData.id,
          url: checkoutData.url,
          expires_at: checkoutData.expires_at,
          status: checkoutData.status
        },
        payment_details: {
          product_name: productData.name,
          unit_amount: unitAmount,
          quantity: quantity,
          total_amount: totalAmount,
          application_fee_amount: applicationFeeAmount,
          connected_account_receives: totalAmount - applicationFeeAmount,
          currency: priceData.currency
        },
        database_id: savedSession?.id,
        next_steps: {
          redirect: 'Redirect user to session.url to complete payment',
          webhook: 'Listen for checkout.session.completed webhook to update order status'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in create-checkout-session:', error)
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
