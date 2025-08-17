/// <reference types="https://deno.land/std@0.168.0/types.d.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function cors(body?: unknown, status = 200) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json'
    }
  });
}

function validateE164(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (!/^\+[1-9]\d{5,14}$/.test(cleaned)) throw new Error('invalid_format');
  return cleaned;
}

async function sendCode(phone: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return { success: false, error: 'config_error' };
  }
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const body = new URLSearchParams({ To: phone, Channel: 'sms' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message || 'twilio_error' };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

async function checkCode(phone: string, code: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return { success: false, error: 'config_error' };
  }
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const body = new URLSearchParams({ To: phone, Code: code });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status === 'approved') return { success: true };
    return { success: false, error: data.status || 'verify_failed' };
  } catch (e) {
    return { success: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return cors();
  try {
    const { action, phoneNumber, code } = await req.json();
    let normalized: string | null = null;
    try {
      normalized = phoneNumber ? validateE164(phoneNumber) : null;
    } catch {
      return cors({ error: 'invalid_phone_format', message: 'Invalid phone format. Provide E.164 (+XXXXXXXXXXX)' }, 400);
    }

    if (action === 'send_code') {
      if (!normalized) return cors({ error: 'phone_required' }, 400);
      const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const { data: availability, error: availErr } = await supabaseAdmin.rpc('check_phone_availability', { phone_input: normalized });
      if (availErr) return cors({ error: 'system_error' }, 500);
      if (!availability.available) return cors({ error: availability.error, message: availability.message }, 409);
      const result = await sendCode(normalized);
      if (result.success) return cors({ success: true, message: 'SMS sent' });
      return cors({ error: result.error }, 400);
    }

    if (action === 'verify_code') {
      if (!normalized || !code) return cors({ error: 'phone_and_code_required' }, 400);
      const result = await checkCode(normalized, code);
      if (!result.success) return cors({ error: result.error || 'verification_failed' }, 400);

      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr) return cors({ error: 'auth_error' }, 401);
        if (user) {
          const { data: recordResult, error: recordErr } = await supabaseAdmin.rpc('record_phone_verification', { p_user_id: user.id, p_phone_number: normalized });
          if (recordErr) return cors({ error: 'record_error' }, 500);
          if (recordResult && typeof recordResult === 'object' && !recordResult.success) {
            return cors({ error: recordResult.error }, 400);
          }
          await supabaseAdmin.from('profiles').update({ phone_number: normalized, phone_verified: true, updated_at: new Date().toISOString() }).eq('id', user.id);
        }
      }
      return cors({ success: true, message: 'Phone verified' });
    }

    return cors({ error: 'invalid_action' }, 400);
  } catch (e) {
    return cors({ error: 'internal_error', message: e.message }, 500);
  }
});
