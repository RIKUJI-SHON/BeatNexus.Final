import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORSプリフライト対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🧪 Debug function called')
    console.log('🔍 Method:', req.method)
    console.log('🔍 Headers:', Object.fromEntries(req.headers.entries()))
    
    const body = await req.text()
    console.log('🔍 Body:', body)

    // 環境変数チェック
    const envCheck = {
      STRIPE_SECRET_KEY: !!Deno.env.get('STRIPE_SECRET_KEY'),
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    }
    
    console.log('🔍 Environment:', envCheck)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Debug function working',
        method: req.method,
        body: body,
        environment: envCheck,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Debug function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
