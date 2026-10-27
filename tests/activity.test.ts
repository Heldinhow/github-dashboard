import { afterEach, describe, expect, it, vi } from 'vitest'
import { getActivity } from '../server/activity.ts'
import { loadConfig } from '../server/config.ts'
import { ApiError, errorResponse } from '../server/errors.ts'

const config = loadConfig({ GITHUB_USER: 'octocat' }, () => {
  throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
})

const now = new Date('2026-10-26T12:00:00Z')

async function apiError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }
  throw new Error('Esperava ApiError')
}

function stubGraphql(data: unknown, viewer = { login: 'octocat' }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string }
      const payload = body.query.includes('viewer') ? { data: { viewer } } : { data }
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getActivity', () => {
  it('rejeita perfil desconhecido antes de consultar o GitHub', async () => {
    expect((await apiError(getActivity(config, 'Inexistente', undefined, 1, now, {}))).code).toBe(
      'UNKNOWN_PROFILE',
    )
  })

  it('responde TOKEN_MISSING quando a variável do perfil não existe', async () => {
    expect((await apiError(getActivity(config, undefined, undefined, 1, now, {}))).code).toBe(
      'TOKEN_MISSING',
    )
  })

  it('rejeita login inválido antes de consultar o GitHub', async () => {
    expect(
      (await apiError(getActivity(config, undefined, 'login inválido', 1, now, { GITHUB_TOKEN: 'x' })))
        .code,
    ).toBe('INVALID_USER')
  })

  it('distingue user: null (USER_NOT_FOUND) de user ausente ou incompleto (GITHUB_ERROR)', async () => {
    const env = { GITHUB_TOKEN: 'x' }

    stubGraphql({ user: null })
    expect((await apiError(getActivity(config, undefined, undefined, 1, now, env))).code).toBe(
      'USER_NOT_FOUND',
    )

    stubGraphql({})
    expect((await apiError(getActivity(config, undefined, undefined, 1, now, env))).code).toBe(
      'GITHUB_ERROR',
    )

    stubGraphql({ user: {} })
    expect((await apiError(getActivity(config, undefined, undefined, 1, now, env))).code).toBe(
      'GITHUB_ERROR',
    )
  })

  it('inclui os perfis no erro quando a configuração é conhecida', async () => {
    for (const [profile, env] of [
      ['Inexistente', { GITHUB_TOKEN: 'x' }],
      [undefined, {}],
    ] as const) {
      const error = await apiError(getActivity(config, profile, undefined, 1, now, env))

      expect(errorResponse(error)).toEqual({
        error: {
          code: error.code,
          message: error.message,
          profiles: [{ name: 'default', user: 'octocat' }],
        },
      })
    }
  })

  it('não inclui perfis no erro de configuração sem perfis conhecidos', () => {
    expect(errorResponse(new ApiError(503, 'CONFIG_MISSING', 'GITHUB_USER não configurado.'))).toEqual({
      error: { code: 'CONFIG_MISSING', message: 'GITHUB_USER não configurado.' },
    })
  })
})
