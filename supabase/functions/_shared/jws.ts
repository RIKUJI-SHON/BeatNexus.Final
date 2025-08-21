// Minimal HS256 JWS utilities for Edge Functions
// NOTE: Later upgrade path to EdDSA (O-02)

const enc = (input: string) => btoa(input).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
const dec = (input: string) => atob(input.replace(/-/g,'+').replace(/_/g,'/'));

interface SignOptions { expSeconds?: number }
export interface AdTokenPayload {
  creative_id: string;
  flight_id: string | null;
  placement_id: string;
  anon_session_id?: string;
  iat: number; // issued at (unix sec)
  exp: number; // expiration (unix sec)
}

export async function signHs256(payload: Omit<AdTokenPayload,'iat'|'exp'>, secret: string, opts: SignOptions = {}): Promise<string> {
  const now = Math.floor(Date.now()/1000);
  const exp = now + (opts.expSeconds ?? 60); // short TTL
  const header = { alg: 'HS256', typ: 'JWT' };
  const body: AdTokenPayload = { ...payload, iat: now, exp } as AdTokenPayload;
  const data = `${enc(JSON.stringify(header))}.${enc(JSON.stringify(body))}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sig = enc(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${data}.${sig}`;
}

export async function verifyHs256(token: string, secret: string): Promise<AdTokenPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('format');
  const [h, p, s] = parts;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0)), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error('signature');
  const payload: AdTokenPayload = JSON.parse(dec(p));
  const now = Math.floor(Date.now()/1000);
  if (payload.exp < now) throw new Error('expired');
  return payload;
}
