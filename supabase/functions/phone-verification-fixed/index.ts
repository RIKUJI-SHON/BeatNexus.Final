/**
 * 📱 BeatNexus 電話番号認証システム - 修正版
 * 
 * 機能:
 * 1. SMS OTP送信（Twilio Verify）
 * 2. OTP検証と重複チェック
 * 3. phone_verifications テーブルへの記録
 * 
 * 修正点:
 * - 正しいデータベース関数パラメーター名を使用
 * - エラーハンドリングの改善
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
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
      return { success: false, error: 'SMS service not configured' };
    }

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
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
      return { success: false, error: 'SMS service not configured' };
    }

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
  
  // 日本の携帯電話番号の正規化
  if (normalized.match(/^0[789][0-9]{8,9}$/)) {
    // 0X0-XXXX-XXXX -> +81X0-XXXX-XXXX
    normalized = '+81' + normalized.substring(1);
  } else if (normalized.match(/^[789][0-9]{8,9}$/)) {
    // X0-XXXX-XXXX -> +81X0-XXXX-XXXX
    normalized = '+81' + normalized;
  } else if (normalized.match(/^0[2569][0-9]{7,8}$/)) {
    // ラオスの電話番号形式: 020-XXXX-XXXX, 050-XXX-XXXX, 091-XXX-XXXX, 096-XXX-XXXX
    normalized = '+856' + normalized.substring(1);
  } else if (normalized.match(/^[2569][0-9]{7,8}$/)) {
    // ラオスの電話番号（先頭0なし）
    normalized = '+856' + normalized;
  } else if (!normalized.startsWith('+')) {
    // If no country code and starts with digits, assume Japan
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return corsResponse({ error: 'Server configuration error' }, 500);
    }

    // Supabase管理クライアント初期化
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === 'send_code') {
      if (!phoneNumber) {
        return corsResponse({ error: '電話番号が必要です' }, 400);
      }

      // 電話番号を正規化
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      console.log('📞 Normalized phone number:', normalizedPhone);

      // 重複チェック（正しいパラメーター名を使用）
      try {
        const { data: availabilityResult, error: availabilityError } = await supabaseAdmin
          .rpc('check_phone_availability', { phone_input: normalizedPhone });

        if (availabilityError) {
          console.error('❌ Error checking phone availability:', availabilityError);
          return corsResponse({ error: 'システムエラーが発生しました' }, 500);
        }

        console.log('🔍 Availability check result:', availabilityResult);

        if (!availabilityResult?.available) {
          console.warn('⚠️ Phone number already registered:', normalizedPhone);
          return corsResponse({ 
            error: 'phone_already_registered',
            message: 'この電話番号は既に他のアカウントで使用されています' 
          }, 409);
        }
      } catch (dbError) {
        console.error('❌ Database availability check failed:', dbError);
        return corsResponse({ error: 'システムエラーが発生しました' }, 500);
      }

      // SMS送信
      const smsResult = await sendVerificationCode(normalizedPhone);
      if (!smsResult.success) {
        // 監査ログ記録（正しいパラメーター名を使用）
        try {
          await supabaseAdmin.rpc('log_phone_verification_attempt', {
            p_phone_number: normalizedPhone,
            p_user_id: null,
            p_action: 'send_code_failed',
            p_success: false,
            p_error_message: smsResult.error || 'Unknown error'
          });
        } catch (logError) {
          console.error('Failed to log audit:', logError);
        }

        return corsResponse({ error: smsResult.error }, 400);
      }

      // 成功時の監査ログ
      try {
        await supabaseAdmin.rpc('log_phone_verification_attempt', {
          p_phone_number: normalizedPhone,
          p_user_id: null,
          p_action: 'send_code_success',
          p_success: true,
          p_error_message: null
        });
      } catch (logError) {
        console.error('Failed to log audit:', logError);
      }

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
        try {
          await supabaseAdmin.rpc('log_phone_verification_attempt', {
            p_phone_number: normalizedPhone,
            p_user_id: null,
            p_action: 'verify_code_failed',
            p_success: false,
            p_error_message: verifyResult.error || 'Verification failed'
          });
        } catch (logError) {
          console.error('Failed to log audit:', logError);
        }

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
              .rpc('check_phone_availability', { phone_input: normalizedPhone });

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
            try {
              await supabaseAdmin.rpc('log_phone_verification_attempt', {
                p_phone_number: normalizedPhone,
                p_user_id: user.id,
                p_action: 'verify_code_success',
                p_success: true,
                p_error_message: null
              });
            } catch (logError) {
              console.error('Failed to log audit:', logError);
            }

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
      try {
        await supabaseAdmin.rpc('log_phone_verification_attempt', {
          p_phone_number: normalizedPhone,
          p_user_id: null,
          p_action: 'verify_code_success_pre_auth',
          p_success: true,
          p_error_message: null
        });
      } catch (logError) {
        console.error('Failed to log audit:', logError);
      }

      return corsResponse({ 
        success: true, 
        message: '電話番号認証が完了しました',
        verified: true,
        phone_number: normalizedPhone,
        // サインアップ時に使用するための一時的なトークンを生成
        temp_verification_token: btoa(JSON.stringify({
          phone: normalizedPhone,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10分で期限切れ
        }))
      });
    }

    if (action === 'record_signup_phone') {
      const { temp_verification_token } = await req.json();
      
      if (!temp_verification_token) {
        return corsResponse({ error: '認証トークンが必要です' }, 400);
      }

      // 認証トークンが必要（サインアップ完了後）
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return corsResponse({ error: '認証が必要です' }, 401);
      }

      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (!user || authError) {
          return corsResponse({ error: '無効な認証トークンです' }, 401);
        }

        // 一時的な認証トークンを検証
        let phoneVerificationData;
        try {
          phoneVerificationData = JSON.parse(atob(temp_verification_token));
        } catch (parseError) {
          return corsResponse({ error: '無効な認証トークンです' }, 400);
        }

        // トークンの有効期限確認
        if (new Date() > new Date(phoneVerificationData.expires_at)) {
          return corsResponse({ error: '認証トークンの有効期限が切れています' }, 400);
        }

        const normalizedPhone = phoneVerificationData.phone;
        console.log('📝 Recording phone for signup user:', user.id, normalizedPhone);

        // 最終的な重複チェック
        const { data: finalAvailabilityResult, error: finalAvailabilityError } = await supabaseAdmin
          .rpc('check_phone_availability', { phone_input: normalizedPhone });

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
        try {
          await supabaseAdmin.rpc('log_phone_verification_attempt', {
            p_phone_number: normalizedPhone,
            p_user_id: user.id,
            p_action: 'record_signup_phone_success',
            p_success: true,
            p_error_message: null
          });
        } catch (logError) {
          console.error('Failed to log audit:', logError);
        }

        console.log('✅ Signup phone verification recorded successfully:', recordResult);
        return corsResponse({ 
          success: true, 
          message: 'サインアップ時の電話番号が管理テーブルに記録されました',
          recorded: true
        });

      } catch (e) {
        console.error('❌ Error in record_signup_phone:', e);
        return corsResponse({ error: 'システムエラーが発生しました' }, 500);
      }
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
