// Minimal HS256 JWS utility for Ads Edge Functions
// Purpose: issue & verify signed ad impression tokens

import crypto from 'crypto';

export interface AdTokenPayload {
  creative_id: string;
  flight_id: string | null;
  placement_id: string;
  exp: number; // epoch seconds
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signAdToken(payload: AdTokenPayload, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest();
  return `${data}.${base64url(sig)}`;
}

export type VerifyResult = { ok: true; payload: AdTokenPayload } | { ok: false; reason: string };

export function verifyAdToken(token: string, secret: string, nowEpochSec = Math.floor(Date.now()/1000)): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'format' };
  const [h64, p64, s64] = parts;
  try {
    const data = `${h64}.${p64}`;
    const expected = base64url(
      crypto.createHmac('sha256', secret).update(data).digest()
    );
    if (expected !== s64) return { ok: false, reason: 'sig' };
    const payload: AdTokenPayload = JSON.parse(Buffer.from(p64.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
    if (payload.exp && payload.exp < nowEpochSec) return { ok: false, reason: 'exp' };
    if (!payload.creative_id || !payload.placement_id) return { ok: false, reason: 'claims' };
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'decode' };
  }
}
