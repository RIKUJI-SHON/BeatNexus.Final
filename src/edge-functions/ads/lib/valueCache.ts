// Generic in-memory TTL value cache (best-effort; reset on cold start)
// Not for critical correctness. Used to reduce RPC frequency for identical serve contexts.

interface ValueEntry<T> { value: T; expires: number }

export class ValueTTLCache<T = unknown> {
  private store = new Map<string, ValueEntry<T>>();
  constructor(private nowFn: () => number = () => Date.now()) {}

  get(key: string): T | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expires < this.nowFn()) { this.store.delete(key); return undefined; }
    return e.value;
  }
  set(key: string, value: T, ttlMs: number) {
    this.store.set(key, { value, expires: this.nowFn() + ttlMs });
  }
  sweep() {
    const now = this.nowFn();
    for (const [k,v] of this.store.entries()) if (v.expires < now) this.store.delete(k);
  }
  size() { return this.store.size; }
}

// Candidate row minimal shape (subset used for caching pre-cap filtering)
export interface ServeCandidateRow { flight_id: string; placement_id: string; creative_id: string; weight: number | null; daily_cap: number | null; imp_goal: number | null; user_today_imps: number; total_imps: number; creative_headline: string | null; creative_body: string | null; creative_cta_text: string | null; creative_file_url: string | null; creative_target_url: string | null }
export const serveCandidateCache = new ValueTTLCache<ServeCandidateRow[]>();

export function buildServeCacheKey(params: { placement: string; country?: string; language?: string; device?: string; userOrAnon?: string | null }) {
  const { placement, country='', language='', device='', userOrAnon='' } = params;
  return [placement, country.toLowerCase(), language.toLowerCase(), device.toLowerCase(), userOrAnon || ''].join('|');
}
