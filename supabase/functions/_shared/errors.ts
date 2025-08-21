// Standardized ad system error codes
export const AD_ERRORS = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  NO_FILL: 'AD_NO_FILL',
  TOKEN_INVALID: 'AD_TOKEN_INVALID',
  TOKEN_EXPIRED: 'AD_TOKEN_EXPIRED',
  INTERNAL: 'AD_INTERNAL',
  DUP_EVENT: 'AD_DUP_EVENT',
  PLACEMENT_NOT_FOUND: 'PLACEMENT_NOT_FOUND',
} as const;

export type AdErrorCode = typeof AD_ERRORS[keyof typeof AD_ERRORS];

export function jsonError(code: AdErrorCode, detail?: unknown, status = 400): Response {
  return new Response(
    JSON.stringify({ error: code, detail: detail instanceof Error ? detail.message : detail }),
    { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}
