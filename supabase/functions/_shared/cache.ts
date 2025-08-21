// Simple TTL cache for small edge function use (in-memory per instance)
export interface TTLCacheOptions { defaultTtlMs?: number }
interface Entry<V> { v: V; exp: number }

export class TTLCache<K, V> {
  private store = new Map<K, Entry<V>>();
  constructor(private opts: TTLCacheOptions = {}) {}
  get(key: K): V | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.exp < Date.now()) { this.store.delete(key); return undefined; }
    return e.v;
  }
  set(key: K, value: V, ttlMs?: number) {
    const ttl = ttlMs ?? this.opts.defaultTtlMs ?? 30_000;
    this.store.set(key, { v: value, exp: Date.now() + ttl });
  }
}
