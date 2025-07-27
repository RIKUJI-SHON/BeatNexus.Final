/**
 * 📱 BeatNexus カスタム電話番号認証 Edge Function
 * 
 * 機能:
 * 1. 電話番号重複チェック（管理テーブル方式）
 * 2. SMS OTP送信（Twilio Verify）
 * 3. OTP検証
 * 4. 電話番号認証記録（auth.users + phone_verifications）
 * 
 * 認証:
 * - サインアップ前はJWT不要
 * - 既存ユーザーの電話番号追加時はJWT必須
 * 
 * v2.0: 管理テーブル方式対応（2025-01-27）
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

// 📞 電話番号正規化関数
function normalizePhoneNumber(phoneNumber: string): string {
  // 数字と+以外を除去
  let normalized = phoneNumber.replace(/[^\d+]/g, '');
  
  // 日本の携帯電話番号の正規化
  if (normalized.match(/^0[789][0-9]{8,9}$/)) {
    // 0X0-XXXX-XXXX -> +81X0-XXXX-XXXX
    normalized = '+81' + normalized.substring(1);
  } else if (normalized.match(/^[789][0-9]{8,9}$/)) {
    // X0-XXXX-XXXX -> +81X0-XXXX-XXXX
    normalized = '+81' + normalized;
  } else if (!normalized.startsWith('+')) {
    // 国番号がない場合は日本と仮定
    normalized = '+81' + normalized;
  }
  
  return normalized;
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

    // 電話番号の正規化
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;

    if (action === 'send_code') {
      if (!phoneNumber) return corsResponse({ error: 'Phone number is required' }, 400);
      
      // 🔍 電話番号重複チェック
      const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      try {
        const { data: availabilityCheck, error: availabilityError } = await supabaseAdmin
          .rpc('check_phone_availability', { phone_input: normalizedPhone });
          
        if (availabilityError) {
          console.error('Phone availability check error:', availabilityError);
          return corsResponse({ 
            error: 'system_error',
            message: 'システムエラーが発生しました。しばらくしてからお試しください。' 
          }, 500);
        }
        
        if (!availabilityCheck.available) {
          return corsResponse({ 
            error: availabilityCheck.error,
            message: availabilityCheck.message 
          }, 409);
        }
      } catch (checkError) {
        console.error('Exception during phone availability check:', checkError);
        return corsResponse({ 
          error: 'system_error',
          message: 'システムエラーが発生しました。しばらくしてからお試しください。' 
        }, 500);
      }
      
      // 重複チェック通過後、SMS送信
      const result = await sendVerificationCode(normalizedPhone!);
      return result.success 
        ? corsResponse({ success: true, message: 'SMS送信が完了しました' })
        : corsResponse({ error: result.error }, 400);
    }

    if (action === 'verify_code') {
      if (!phoneNumber || !code) return corsResponse({ error: 'Phone number and code are required' }, 400);
      
      const result = await verifyCode(normalizedPhone!, code);
      
      if (result.success) {
        // 🔐 既存ユーザー向けに電話番号認証を記録
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '');
          try {
            const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
            const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
            
            if (userError) {
              console.error('User verification error:', userError);
              return corsResponse({ 
                error: 'auth_error',
                message: '認証エラーが発生しました' 
              }, 401);
            }
            
            if (user) {
              // 🗄️ 管理テーブルに電話番号認証を記録
              const { data: recordResult, error: recordError } = await supabaseAdmin
                .rpc('record_phone_verification', {
                  p_user_id: user.id,
                  p_phone_number: normalizedPhone
                });
                
              if (recordError) {
                console.error('Phone verification record error:', recordError);
                return corsResponse({ 
                  error: 'record_error',
                  message: '電話番号認証の記録に失敗しました' 
                }, 500);
              }
              
              // 成功レスポンス（recordResultがJSONの場合）
              if (recordResult && typeof recordResult === 'object' && !recordResult.success) {
                return corsResponse({ 
                  error: recordResult.error,
                  message: recordResult.message 
                }, 400);
              }
            }
          } catch (e) {
            console.error('Phone verification recording failed:', e);
            return corsResponse({ 
              error: 'system_error',
              message: 'システムエラーが発生しました' 
            }, 500);
          }
        }
        
        return corsResponse({ 
          success: true, 
          message: '電話番号認証が完了しました' 
        });
      } else {
        return corsResponse({ 
          error: 'verification_failed',
          message: '認証コードが正しくありません' 
        }, 400);
      }
    }

    return corsResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('Internal server error:', error);
    return corsResponse({ 
      error: 'internal_error',
      message: `サーバー内部エラー: ${error.message}` 
    }, 500);
  }
}); 