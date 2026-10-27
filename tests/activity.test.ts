import { describe, expect, it } from 'vitest'
import { getActivity } from '../server/activity.ts'
import { loadConfig } from '../server/config.ts'
import { ApiError } from '../server/errors.ts'

const config = loadConfig({ GITHUB_USER: 'octocat' }, () => {
  throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
})

async function expectApiError(promise: Promise<unknown>, code: string) {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe(code)
    return
  }
  throw new Error(`Esperava ApiError ${code}`)
}

describe('getActivity', () => {
  it('rejeita perfil desconhecido antes de consultar o GitHub', async () => {
    await expectApiError(getActivity(config, 'Inexistente', undefined, 1, new Date(), {}), 'UNKNOWN_PROFILE')
  })

  it('responde TOKEN_MISSING quando a variável do perfil não existe', async () => {
    await expectApiError(getActivity(config, undefined, undefined, 1, new Date(), {}), 'TOKEN_MISSING')
  })

  it('rejeita login inválido antes de consultar o GitHub', async () => {
    await expectApiError(
      getActivity(config, undefined, 'login inválido', 1, new Date(), { GITHUB_TOKEN: 'x' }),
      'INVALID_USER',
    )
  })
})
