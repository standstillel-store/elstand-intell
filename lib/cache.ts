// Minimal in-memory cache with a time-to-live, shared by every data source
// so repeated page loads / widget refreshes don't hammer free-tier rate
// limits. Note: on serverless platforms (Vercel, etc.) each cold start gets
// a fresh in-memory store, so this helps most on a long-running server
// (e.g. `next start` on a VPS) or between requests hitting a warm instance.

type Entry<T> = { value: T; expiresAt: number };
const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}
