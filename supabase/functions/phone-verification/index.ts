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
 * v3.3: 詳細ステップログとエラーハンドリング強化（2025-07-28）
 */

/// <reference types="https://deno.land/std@0.168.0/types.d.ts" />

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
  } else if (normalized.match(/^0[2569][0-9]{7,8}$/)) {
    // ラオスの電話番号形式: 020-XXXX-XXXX, 050-XXX-XXXX, 091-XXX-XXXX, 096-XXX-XXXX
    normalized = '+856' + normalized.substring(1);
  } else if (normalized.match(/^[2569][0-9]{7,8}$/)) {
    // ラオスの電話番号（先頭0なし）
    normalized = '+856' + normalized;
  } else if (!normalized.startsWith('+')) {
    // 国番号がない場合は日本と仮定（既存の動作を維持）
    normalized = '+81' + normalized;
  }
  
  return normalized;
}

// 📱 SMS OTP送信関数
async function sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 🔐 環境変数チェック
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
      console.error('Missing Twilio environment variables:', {
        TWILIO_ACCOUNT_SID: !!TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: !!TWILIO_AUTH_TOKEN,
        TWILIO_VERIFY_SERVICE_SID: !!TWILIO_VERIFY_SERVICE_SID
      });
      return { success: false, error: 'SMS service configuration error' };
    }

    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const body = new URLSearchParams({ To: phoneNumber, Channel: 'sms' });

    console.log('📤 Sending SMS to Twilio API...');
    
    // ⏰ タイムアウト付きfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

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
    console.log('📨 Twilio API response status:', response.status);

    const responseData = await response.json();
    console.log('📋 Twilio API response data:', responseData);
    
    if (!response.ok) {
      return { success: false, error: `Twilio API error: ${responseData.message || 'Unknown error'}` };
    }
    return { success: true };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('SMS sending timeout');
      return { success: false, error: 'SMS sending timeout - please try again' };
    }
    console.error('SMS sending error:', error);
    return { success: false, error: `Network error: ${error.message}` };
  }
}

// 🔐 OTP検証関数
async function verifyCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 🔐 環境変数チェック
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
      console.error('Missing Twilio environment variables for verification');
      return { success: false, error: 'SMS service configuration error' };
    }

    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    
    const body = new URLSearchParams({ To: phoneNumber, Code: code });

    console.log('🔍 Verifying code with Twilio API...');
    
    // ⏰ タイムアウト付きfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

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
    const responseData = await response.json();
    console.log('🔐 Twilio verify response:', responseData);
    
    if (responseData.status === 'approved') {
      return { success: true };
    } else {
      return { success: false, error: `Verification failed: ${responseData.status}` };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Code verification timeout');
      return { success: false, error: 'Code verification timeout - please try again' };
    }
    console.error('Code verification error:', error);
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
    console.log('📱 Phone verification request:', { action, phoneNumber: phoneNumber ? '***masked***' : null, code: code ? '***masked***' : null });

    // 電話番号の正規化
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;
    console.log('📞 Normalized phone:', normalizedPhone ? '***masked***' : null);

    if (action === 'send_code') {
      if (!phoneNumber) return corsResponse({ error: 'Phone number is required' }, 400);
      
      // 🔍 電話番号重複チェック（新データベース関数使用）
      const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      try {
        const { data: availabilityCheck, error: availabilityError } = await supabaseAdmin
          .rpc('check_phone_availability', { phone_input: phoneNumber });
          
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
      
      // 重複チェック通過後、SMS送信（正規化された電話番号使用）
      console.log('🔄 Starting SMS sending process...');
      console.log('📞 Target phone (masked):', normalizedPhone!.substring(0, 5) + '***');
      
      const result = await sendVerificationCode(normalizedPhone!);
      console.log('📊 SMS sending result:', result);
      
      if (result.success) {
        console.log('✅ SMS sent successfully');
        return corsResponse({ success: true, message: 'SMS送信が完了しました' });
      } else {
        console.error('❌ SMS sending failed:', result.error);
        return corsResponse({ 
          error: result.error,
          message: `SMS送信に失敗しました: ${result.error}` 
        }, 400);
      }
    }

    if (action === 'verify_code') {
      if (!phoneNumber || !code) return corsResponse({ error: 'Phone number and code are required' }, 400);
      
      const result = await verifyCode(normalizedPhone!, code);
      console.log('🔔 Verification result:', result);
      
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
              // 🗄️ 管理テーブルに電話番号認証を記録（新データベース関数使用）
              console.log('🔄 Calling record_phone_verification with user:', user.id);
              
              const { data: recordResult, error: recordError } = await supabaseAdmin
                .rpc('record_phone_verification', {
                  p_user_id: user.id,
                  p_phone_number: normalizedPhone
                });
                
              console.log('📝 record_phone_verification result:', { recordResult, recordError });
                
              if (recordError) {
                console.error('Phone verification record error:', recordError);
                return corsResponse({ 
                  error: 'record_error',
                  message: '電話番号認証の記録に失敗しました',
                  details: recordError.message 
                }, 500);
              }
              
              // 成功レスポンス（recordResultがJSONの場合）
              if (recordResult && typeof recordResult === 'object' && !recordResult.success) {
                console.error('Phone verification failed:', recordResult);
                return corsResponse({ 
                  error: recordResult.error,
                  message: recordResult.message 
                }, 400);
              }
              
              // 🔄 後方互換性のためprofilesテーブルも更新
              try {
                await supabaseAdmin
                  .from('profiles')
                  .update({ 
                    phone_number: normalizedPhone, 
                    phone_verified: true, 
                    updated_at: new Date().toISOString() 
                  })
                  .eq('id', user.id);
                console.log('✅ Profile updated successfully');
              } catch (profileError) {
                console.warn('Profile update failed (non-critical):', profileError);
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
          message: '認証コードが正しくありません',
          details: result.error 
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