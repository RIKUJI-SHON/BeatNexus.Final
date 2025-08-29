import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
}

// Webhook署名検証（Cloudflare Stream用）
async function verifyStreamWebhookSignature(body: string, signature: string, secret: string): boolean {
  try {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret);
    const messageBytes = encoder.encode(body);

    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSignature = await globalThis.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageBytes
    );

    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // タイミング攻撃を防ぐための比較
    return expectedHex === signature;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

// Cloudflare Stream webhook処理
async function handleStreamWebhook(supabaseClient: any, webhookData: any) {
  console.log('🎬 Processing Stream webhook:', webhookData)
  
  if (!webhookData || typeof webhookData !== 'object') {
    throw new Error('Invalid webhook data')
  }

  // Context7から取得した最新のペイロード形式に対応
  const { uid: streamVideoId, status, readyToStream } = webhookData
  
  if (!streamVideoId) {
    throw new Error('Stream video ID is required')
  }

  try {
    // Stream状態をDBに更新
    let streamStatus = 'processing'
    let streamThumbnailUrl = null
    let streamPreviewUrl = null
    let streamErrorMessage = null

    if (status?.state === 'ready') {
      streamStatus = 'ready'
      // 成功時のサムネイルURL生成
      streamThumbnailUrl = `https://videodelivery.net/${streamVideoId}/thumbnails/thumbnail.jpg`
      streamPreviewUrl = `https://videodelivery.net/${streamVideoId}/manifest/video.m3u8`
    } else if (status?.state === 'error') {
      streamStatus = 'error'
      streamErrorMessage = status.errReasonText || status.errReasonCode || 'Unknown encoding error'
    } else if (readyToStream === false) {
      streamStatus = 'processing'
    }

    const updateData: any = { 
      stream_status: streamStatus,
      updated_at: new Date().toISOString()
    }

    if (streamThumbnailUrl) updateData.stream_thumbnail_url = streamThumbnailUrl
    if (streamPreviewUrl) updateData.stream_preview_url = streamPreviewUrl
    if (streamErrorMessage) updateData.stream_error_message = streamErrorMessage

    const { error: updateError } = await supabaseClient
      .from('submissions')
      .update(updateData)
      .eq('stream_video_id', streamVideoId)

    if (updateError) {
      console.error('❌ Failed to update submission stream status:', updateError)
      throw updateError
    }

    console.log(`✅ Updated stream status to ${streamStatus} for video ${streamVideoId}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stream webhook processed successfully',
        streamVideoId,
        status: streamStatus
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Stream webhook error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
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

    // Get raw request body for signature verification
    const rawBody = await req.text()
    const requestBody = JSON.parse(rawBody)
    
    // Check if this is a Cloudflare Stream webhook
    if (requestBody.uid && requestBody.status) {
      // Verify webhook signature for Stream webhooks
      const webhookSignature = req.headers.get('webhook-signature')
      const webhookSecret = Deno.env.get('CLOUDFLARE_STREAM_WEBHOOK_SECRET')
      
      if (webhookSecret && webhookSignature) {
        const isValidSignature = await verifyStreamWebhookSignature(
          rawBody,
          webhookSignature,
          webhookSecret
        )
        
        if (!isValidSignature) {
          console.error('❌ Invalid webhook signature')
          return new Response(
            JSON.stringify({ error: 'Invalid webhook signature' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 401,
            }
          )
        }
      }
      
      return await handleStreamWebhook(supabaseClient, requestBody)
    }
    
    // Otherwise, handle as submission matchmaking
    const { submission_id } = requestBody
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