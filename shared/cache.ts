export interface Cache<T> {
  getOrLoad(key: string, load: () => Promise<T>): Promise<T>
}

export function createCache<T>(ttlMs: number, now: () => number = Date.now): Cache<T> {
  const entries = new Map<string, { value: T; expiresAt: number }>()
  const pending = new Map<string, Promise<T>>()

  return {
    getOrLoad(key, load) {
      const cached = entries.get(key)
      if (cached && cached.expiresAt > now()) return Promise.resolve(cached.value)

      const inFlight = pending.get(key)
      if (inFlight) return inFlight

      const promise = load()
        .then((value) => {
          entries.set(key, { value, expiresAt: now() + ttlMs })
          return value
        })
        .finally(() => {
          pending.delete(key)
        })

      pending.set(key, promise)
      return promise
    },
  }
}
