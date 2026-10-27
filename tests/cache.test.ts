import { describe, expect, it } from 'vitest'
import { createCache } from '../shared/cache.ts'

describe('createCache', () => {
  it('reaproveita o valor dentro do TTL e recarrega depois', async () => {
    let now = 0
    let loads = 0
    const cache = createCache<string>(1000, () => now)
    const load = async () => {
      loads += 1
      return `valor-${loads}`
    }

    expect(await cache.getOrLoad('a', load)).toBe('valor-1')
    now = 999
    expect(await cache.getOrLoad('a', load)).toBe('valor-1')
    now = 1000
    expect(await cache.getOrLoad('a', load)).toBe('valor-2')
  })

  it('não cacheia erros', async () => {
    const cache = createCache<string>(1000)
    let loads = 0
    const failing = async () => {
      loads += 1
      throw new Error('falhou')
    }

    await expect(cache.getOrLoad('a', failing)).rejects.toThrow('falhou')
    await expect(cache.getOrLoad('a', failing)).rejects.toThrow('falhou')
    expect(loads).toBe(2)
  })

  it('compartilha a mesma promessa entre requisições concorrentes', async () => {
    const cache = createCache<string>(1000)
    let loads = 0
    let resolveLoad: ((value: string) => void) | undefined
    const gate = new Promise<string>((resolve) => {
      resolveLoad = resolve
    })
    const load = () => {
      loads += 1
      return gate
    }

    const first = cache.getOrLoad('a', load)
    const second = cache.getOrLoad('a', load)
    expect(loads).toBe(1)

    resolveLoad?.('compartilhado')
    await expect(first).resolves.toBe('compartilhado')
    await expect(second).resolves.toBe('compartilhado')
  })
})
