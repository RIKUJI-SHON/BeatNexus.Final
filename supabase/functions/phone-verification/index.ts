/**
 * 📱 BeatNexus カスタム電話番号認証 Edge Function
 * 
 * 機能:
 * 1. SMS OTP送信（Twilio Verify）
 * 2. OTP検証
 * 3. profiles.phone_verified 更新（既存ユーザー向け）
 * 
 * 認証:
 * - サインアップ前はJWT不要
 * - 既存ユーザーの電話番号追加時はJWT必須
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🔐 環境変数
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 🔧 CORS レスポンス関数
function corsResponse(body?: any, status = 200) {
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

// 📱 SMS OTP送信関数
async function sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const body = new URLSearchParams({ To: phoneNumber, Channel: 'sms' });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const responseData = await response.json();
    if (!response.ok) {
      return { success: false, error: `Twilio API error: ${responseData.message || 'Unknown error'}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: `Network error: ${error.message}` };
  }
}

// 🔐 OTP検証関数
async function verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const body = new URLSearchParams({ To: phoneNumber, Code: code });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const responseData = await response.json();
    if (responseData.status === 'approved') {
      return { success: true };
    } else {
      return { success: false, error: 'Invalid verification code' };
    }
  } catch (error) {
    return { success: false, error: `Verification request failed: ${error.message}` };
  }
}

// 🎯 メインハンドラー
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  try {
    const { action, phoneNumber, code } = await req.json();

    if (action === 'send_code') {
      if (!phoneNumber) return corsResponse({ error: 'Phone number is required' }, 400);
      const result = await sendVerificationCode(phoneNumber);
      return result.success 
        ? corsResponse({ success: true })
        : corsResponse({ error: result.error }, 400);
    }

    if (action === 'verify_code') {
      if (!phoneNumber || !code) return corsResponse({ error: 'Phone number and code are required' }, 400);
      const result = await verifyCode(phoneNumber, code);
      
      if (result.success) {
        // 既存ユーザー向けにprofilesを更新する（トークンがあれば）
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '');
          try {
            const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
              await supabaseAdmin
                .from('profiles')
                .update({ phone_number: phoneNumber, phone_verified: true, updated_at: new Date().toISOString() })
                .eq('id', user.id);
            }
          } catch (e) {
            // ここでのエラーは無視。サインアップ前なら当然失敗する。
            console.warn('Profile update skipped or failed (may be normal during sign-up):', e);
          }
        }
        return corsResponse({ success: true, message: 'Phone number verified successfully' });
      } else {
        return corsResponse({ error: result.error }, 400);
      }
    }

    return corsResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    return corsResponse({ error: `Internal server error: ${error.message}` }, 500);
  }
}); 