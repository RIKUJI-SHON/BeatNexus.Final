/**
 * 🧪 Twilio API接続テスト用 Edge Function
 * 電話番号認証の問題を段階的にデバッグするためのテスト関数
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');

function corsResponse(body?: unknown, status = 200) {
  return new Response(
    body ? JSON.stringify(body) : null,
    {
      status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
      },
    }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  try {
    const { testType, phoneNumber } = await req.json();
    
    // 環境変数チェック
    const envCheck = {
      TWILIO_ACCOUNT_SID: !!TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: !!TWILIO_AUTH_TOKEN,
      TWILIO_VERIFY_SERVICE_SID: !!TWILIO_VERIFY_SERVICE_SID,
      values: {
        TWILIO_ACCOUNT_SID: TWILIO_ACCOUNT_SID?.substring(0, 10) + '...',
        TWILIO_VERIFY_SERVICE_SID: TWILIO_VERIFY_SERVICE_SID?.substring(0, 10) + '...'
      }
    };
    
    console.log('🔍 Environment variables check:', envCheck);
    
    if (testType === 'env_check') {
      return corsResponse({ 
        success: true, 
        environmentVariables: envCheck,
        message: 'Environment variables checked' 
      });
    }
    
    if (testType === 'twilio_test' && phoneNumber) {
      // Twilio API直接テスト
      const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
      const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      
      console.log('🚀 Testing Twilio API connection...');
      console.log('📍 URL:', url);
      console.log('🔑 Auth header created:', !!auth);
      
      const body = new URLSearchParams({ To: phoneNumber, Channel: 'sms' });
      console.log('📦 Request body:', body.toString());
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📨 Response status:', response.status);
        console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseData = await response.json();
        console.log('📄 Response data:', responseData);
        
        return corsResponse({
          success: response.ok,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          message: response.ok ? 'Twilio API test successful' : 'Twilio API test failed'
        });
        
      } catch (error) {
        console.error('❌ Twilio API error:', error);
        return corsResponse({
          success: false,
          error: error.message,
          errorName: error.name,
          message: 'Twilio API connection failed'
        }, 500);
      }
    }
    
    return corsResponse({ error: 'Invalid test type or missing parameters' }, 400);
    
  } catch (error) {
    console.error('🚨 Test function error:', error);
    return corsResponse({ 
      error: error.message,
      stack: error.stack,
      message: 'Test function failed' 
    }, 500);
  }
});
