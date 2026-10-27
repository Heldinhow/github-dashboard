import { afterEach, describe, expect, it, vi } from 'vitest'
import { graphqlRequest } from '../server/github.ts'

const request = () => graphqlRequest('https://api.github.com/graphql', 'token', 'query { viewer { login } }', {})

const respond = (status: number, headers: Record<string, string> = {}) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status, headers })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('graphqlRequest', () => {
  it('mantém RATE_LIMITED sem retryAt quando x-ratelimit-reset é inválido', async () => {
    for (const reset of ['abc', '', '999999999999999999999']) {
      respond(429, reset ? { 'x-ratelimit-reset': reset } : {})

      await expect(request()).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        status: 429,
        retryAt: undefined,
      })
    }
  })

  it('mantém RATE_LIMITED sem retryAt em 403 limitado com reset inválido', async () => {
    respond(403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': 'não-é-número' })

    await expect(request()).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retryAt: undefined,
    })
  })

  it('converte x-ratelimit-reset válido em retryAt ISO', async () => {
    respond(429, { 'x-ratelimit-reset': '1730000000' })

    await expect(request()).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAt: '2024-10-27T03:33:20.000Z',
    })
  })
})
