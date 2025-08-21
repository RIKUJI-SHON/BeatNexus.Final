// Shared singleton TTL cache for ad event deduplication across Edge Functions
// Import this instead of creating multiple instances to maximize hit rate per cold start.
import { TTLCache } from './dedupeCache';

export const globalDedupeCache = new TTLCache();

export function dedupeKey(params: { creative_id: string; placement_id: string; user_or_anon: string; type: 'impression' | 'click'; }) {
  const { creative_id, placement_id, user_or_anon, type } = params;
  return `${creative_id}:${placement_id}:${user_or_anon}:${type}`;
}
