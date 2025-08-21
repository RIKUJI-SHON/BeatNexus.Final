// Common error / response helpers for Ads Edge Functions

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'METHOD_NOT_ALLOWED'
  | 'AD_NO_FILL'
  | 'AD_TOKEN_INVALID'
  | 'AD_CAP_REACHED'
  | 'DUPLICATE'
  | 'DB_ERROR'
  | 'UNEXPECTED';

export interface ErrorBody { ok: false; code: ErrorCode; message?: string; detail?: unknown }
export interface SuccessBody<T> { ok: true; data: T }

export function resErr(code: ErrorCode, status = 400, message?: string, detail?: unknown): Response {
  const body: ErrorBody = { ok: false, code, ...(message ? { message } : {}), ...(detail !== undefined ? { detail } : {}) };
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export function resOk<T>(data: T, status = 200): Response {
  const body: SuccessBody<T> = { ok: true, data };
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Specialized convenience
export const noFill = () => resErr('AD_NO_FILL', 204);
