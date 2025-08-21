// Simple in-memory TTL cache for impression/click deduplication
// NOTE: Edge cold starts reset; acceptable for MVP.

interface Entry { expires: number }

export class TTLCache {
  private store = new Map<string, Entry>();
  constructor(private nowFn: () => number = () => Date.now()) {}

  set(key: string, ttlMs: number) {
    this.store.set(key, { expires: this.nowFn() + ttlMs });
  }
  has(key: string) {
    const e = this.store.get(key);
    if (!e) return false;
    if (e.expires < this.nowFn()) { this.store.delete(key); return false; }
    return true;
  }
  sweep() {
    const now = this.nowFn();
    for (const [k,v] of this.store.entries()) if (v.expires < now) this.store.delete(k);
  }
}

export const DEDUPE_TTL_MS = {
  impression: 30_000,
  click: 5_000,
};
