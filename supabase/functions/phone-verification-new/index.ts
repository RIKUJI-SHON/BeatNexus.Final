/**
 * 📱 BeatNexus 電話番号認証システム - 管理テーブル方式対応版
 * 
 * 機能:
 * 1. SMS OTP送信（Twilio Verify）
 * 2. OTP検証と重複チェック
 * 3. phone_verifications テーブルへの記録
 * 
 * 管理テーブル方式:
 * - auth.users テーブルを直接変更せず
 * - phone_verifications テーブルで管理
 * - 重複電話番号の防止
 * - セキュリティ監査ログ対応
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🔐 環境変数
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
  console.error('❌ Missing Twilio environment variables');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
}

// 🔧 CORS レスポンス関数
function corsResponse(body?: Record<string, unknown>, status = 200) {
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

    if (!response.ok) {
      const responseData = await response.json();
      console.error('❌ Twilio API error:', responseData);
      return { success: false, error: `SMS送信に失敗しました: ${responseData.message || 'Unknown error'}` };
    }

    console.log('✅ SMS verification code sent successfully to:', phoneNumber);
    return { success: true };
  } catch (error) {
    console.error('❌ Network error in sendVerificationCode:', error);
    return { success: false, error: `ネットワークエラー: ${error.message}` };
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
      console.log('✅ OTP verification successful for:', phoneNumber);
      return { success: true };
    } else {
      console.warn('⚠️ OTP verification failed:', responseData);
      return { success: false, error: '認証コードが正しくありません' };
    }
  } catch (error) {
    console.error('❌ Error in verifyCode:', error);
    return { success: false, error: `認証エラー: ${error.message}` };
  }
}

// 📞 電話番号正規化関数
function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters except +
  let normalized = phoneNumber.replace(/[^\d+]/g, '');
  
  // If starts with 0, replace with +81
  if (normalized.startsWith('0')) {
    normalized = '+81' + normalized.slice(1);
  }
  
  // If no country code and starts with digits, assume Japan
  if (/^\d/.test(normalized)) {
    normalized = '+81' + normalized;
  }
  
  return normalized;
}

// 🎯 メインハンドラー
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return corsResponse();
  }

  try {
    const { action, phoneNumber, code } = await req.json();
    console.log('📱 Phone verification request:', { action, phoneNumber: phoneNumber ? 'provided' : 'missing' });

    // Supabase管理クライアント初期化
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    if (action === 'send_code') {
      if (!phoneNumber) {
        return corsResponse({ error: '電話番号が必要です' }, 400);
      }

      // 電話番号を正規化
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      console.log('📞 Normalized phone number:', normalizedPhone);

      // 重複チェック（管理テーブル使用）
      const { data: availabilityResult, error: availabilityError } = await supabaseAdmin
        .rpc('check_phone_availability', { phone_number: normalizedPhone });

      if (availabilityError) {
        console.error('❌ Error checking phone availability:', availabilityError);
        return corsResponse({ error: 'システムエラーが発生しました' }, 500);
      }

      if (!availabilityResult?.available) {
        console.warn('⚠️ Phone number already registered:', normalizedPhone);
        return corsResponse({ 
          error: 'phone_already_registered',
          message: 'この電話番号は既に他のアカウントで使用されています' 
        }, 409);
      }

      // SMS送信
      const smsResult = await sendVerificationCode(normalizedPhone);
      if (!smsResult.success) {
        // 監査ログ記録
        await supabaseAdmin.rpc('log_phone_verification_attempt', {
          phone_number: normalizedPhone,
          action: 'send_code_failed',
          user_id: null,
          details: { error: smsResult.error }
        }).catch(err => console.error('Failed to log audit:', err));

        return corsResponse({ error: smsResult.error }, 400);
      }

      // 成功時の監査ログ
      await supabaseAdmin.rpc('log_phone_verification_attempt', {
        phone_number: normalizedPhone,
        action: 'send_code_success',
        user_id: null,
        details: { normalized_phone: normalizedPhone }
      }).catch(err => console.error('Failed to log audit:', err));

      return corsResponse({ success: true, message: 'SMS認証コードを送信しました' });
    }

    if (action === 'verify_code') {
      if (!phoneNumber || !code) {
        return corsResponse({ error: '電話番号と認証コードの両方が必要です' }, 400);
      }

      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      console.log('🔐 Verifying code for:', normalizedPhone);

      // OTP検証
      const verifyResult = await verifyCode(normalizedPhone, code);
      if (!verifyResult.success) {
        // 失敗時の監査ログ
        await supabaseAdmin.rpc('log_phone_verification_attempt', {
          phone_number: normalizedPhone,
          action: 'verify_code_failed',
          user_id: null,
          details: { error: verifyResult.error }
        }).catch(err => console.error('Failed to log audit:', err));

        return corsResponse({ 
          error: 'invalid_otp_code',
          message: verifyResult.error 
        }, 400);
      }

      // 認証済みユーザーの場合は管理テーブルに記録
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
          
          if (user && !authError) {
            console.log('👤 Recording phone verification for authenticated user:', user.id);

            // 再度重複チェック（レースコンディション対策）
            const { data: finalAvailabilityResult, error: finalAvailabilityError } = await supabaseAdmin
              .rpc('check_phone_availability', { phone_number: normalizedPhone });

            if (finalAvailabilityError) {
              console.error('❌ Final availability check failed:', finalAvailabilityError);
              return corsResponse({ error: 'システムエラーが発生しました' }, 500);
            }

            if (!finalAvailabilityResult?.available) {
              return corsResponse({ 
                error: 'phone_already_registered',
                message: 'この電話番号は既に他のアカウントで使用されています' 
              }, 409);
            }

            // 管理テーブルに記録
            const { data: recordResult, error: recordError } = await supabaseAdmin
              .rpc('record_phone_verification', {
                p_user_id: user.id,
                p_phone_number: normalizedPhone
              });

            if (recordError) {
              console.error('❌ Failed to record phone verification:', recordError);
              return corsResponse({ error: 'システムエラーが発生しました' }, 500);
            }

            // 成功時の監査ログ
            await supabaseAdmin.rpc('log_phone_verification_attempt', {
              phone_number: normalizedPhone,
              action: 'verify_code_success',
              user_id: user.id,
              details: { normalized_phone: normalizedPhone, recorded: true }
            }).catch(err => console.error('Failed to log audit:', err));

            console.log('✅ Phone verification recorded successfully:', recordResult);
            return corsResponse({ 
              success: true, 
              message: '電話番号認証が完了しました',
              verified: true
            });
          }
        } catch (e) {
          console.warn('⚠️ Auth token processing failed (may be normal during sign-up):', e);
        }
      }

      // 認証前のユーザー（サインアップ中）の場合
      console.log('📝 Code verification successful for unauthenticated user');
      
      // 監査ログ（認証前）
      await supabaseAdmin.rpc('log_phone_verification_attempt', {
        phone_number: normalizedPhone,
        action: 'verify_code_success_pre_auth',
        user_id: null,
        details: { normalized_phone: normalizedPhone, pre_authentication: true }
      }).catch(err => console.error('Failed to log audit:', err));

      return corsResponse({ 
        success: true, 
        message: '電話番号認証が完了しました',
        verified: true,
        phone_number: normalizedPhone
      });
    }

    return corsResponse({ error: '無効なアクションです' }, 400);

  } catch (error) {
    console.error('❌ Internal server error:', error);
    return corsResponse({ 
      error: 'system_error',
      message: 'システムエラーが発生しました。しばらく待ってから再度お試しください。' 
    }, 500);
  }
});
