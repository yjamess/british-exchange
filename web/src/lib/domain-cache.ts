/**
 * Per-process cache for a sector's domain payload (Housing / Energy / Economy).
 *
 * One entry per domain id, never per query string. Stale-while-revalidate: a stale
 * entry is served at once and rebuilt in the background, so a reader never waits on a
 * cold build once the process has one good payload. Concurrent builds share one job.
 * A failed rebuild keeps the last good payload.
 *
 * `instrumentation.ts` warms every domain on boot and keeps them fresh.
 */

export type DomainCache<K extends string, T> = {
  get(key: K): Promise<T>;
  /** Rebuild now (used by the warmer); resolves when the build settles. */
  refresh(key: K): Promise<void>;
  peek(key: K): T | undefined;
};

export function createDomainCache<K extends string, T>(
  build: (key: K) => Promise<{ data: T; complete: boolean }>,
  { freshMs = 10 * 60 * 1000 }: { freshMs?: number } = {},
): DomainCache<K, T> {
  const entries = new Map<K, { at: number; data: T }>();
  const inflight = new Map<K, Promise<T>>();

  const run = (key: K): Promise<T> => {
    const current = inflight.get(key);
    if (current) return current;
    const prev = entries.get(key);
    const job = build(key)
      .then(({ data, complete }) => {
        if (complete) entries.set(key, { at: Date.now(), data });
        return complete ? data : (prev?.data ?? data);
      })
      .catch((err: unknown) => {
        if (prev) return prev.data;
        throw err;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  };

  return {
    get(key) {
      const hit = entries.get(key);
      if (hit) {
        if (Date.now() - hit.at > freshMs) void run(key).catch(() => undefined);
        return Promise.resolve(hit.data);
      }
      return run(key);
    },
    refresh(key) {
      return run(key).then(() => undefined, () => undefined);
    },
    peek(key) {
      return entries.get(key)?.data;
    },
  };
}
