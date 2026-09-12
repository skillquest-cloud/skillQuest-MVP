/**
 * Minimal in-memory cache with a time-to-live.
 *
 * Caveat: on Vercel serverless, this cache only persists while a function
 * instance stays "warm" — a cold start clears it. That's fine for MVP1
 * (content changes rarely, and a cold-start Drive fetch just costs one
 * slower request). If usage grows, swap this for Vercel KV so the cache
 * survives across instances — the get/set call sites below wouldn't
 * need to change, only this file.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Fetch-or-cache helper: returns the cached value, or runs fn and caches it. */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const existing = cacheGet<T>(key);
  if (existing !== undefined) return existing;

  const fresh = await fn();
  cacheSet(key, fresh, ttlMs);
  return fresh;
}

/** Invalidate a single cache key — used after a write so stale reads
 *  (e.g. the notes list) don't linger for the rest of the TTL window. */
export function cacheInvalidate(key: string) {
  store.delete(key);
}
