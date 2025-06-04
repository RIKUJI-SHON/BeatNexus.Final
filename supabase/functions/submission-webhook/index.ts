import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false }
      }
    )

    // Parse request body
    const { submission_id } = await req.json()
    
    if (!submission_id) {
      throw new Error('submission_id is required')
    }

    console.log('🎯 Processing submission:', submission_id)

    // Get the submitted submission
    const { data: submission, error: submissionError } = await supabaseClient
      .from('submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (submissionError || !submission) {
      throw new Error(`Submission not found: ${submissionError?.message}`)
    }

    console.log('📋 Submission details:', submission)

    // Call the matchmaking function
    const { data: matchResult, error: matchError } = await supabaseClient
      .rpc('find_match_and_create_battle', {
        p_submission_id: submission_id
      })

    if (matchError) {
      console.error('❌ Matchmaking error:', matchError)
      throw new Error(`Matchmaking failed: ${matchError.message}`)
    }

    console.log('🎮 Matchmaking result:', matchResult)

    // Check if a battle was created
    if (matchResult && matchResult.battle_created) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Battle created successfully!',
          battle_id: matchResult.battle_id,
          matched_with: matchResult.opponent_id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      // No match found, submission is waiting
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Submission is waiting for an opponent',
          waiting: true,
          submission_id: submission_id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

  } catch (error) {
    console.error('💥 Webhook error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_details: {
          name: error.name,
          stack: error.stack
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 