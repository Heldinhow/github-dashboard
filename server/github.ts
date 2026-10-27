import { ApiError } from './errors.ts'

const TIMEOUT_MS = 10_000
const GENERIC_MESSAGE = 'Falha ao consultar o GitHub. Tente novamente.'

interface GraphqlError {
  type?: string
  message?: string
}

interface GraphqlPayload<T> {
  data?: T
  errors?: GraphqlError[]
}

function parseReset(value: string | null): string | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined
  const seconds = Number(value)
  if (!Number.isSafeInteger(seconds)) return undefined
  const reset = new Date(seconds * 1000)
  return Number.isNaN(reset.getTime()) ? undefined : reset.toISOString()
}

function rateLimitedError(headers: Headers): ApiError {
  const retryAt = parseReset(headers.get('x-ratelimit-reset'))
  return new ApiError(429, 'RATE_LIMITED', 'Limite da API do GitHub atingido.', retryAt)
}

export async function graphqlRequest<T>(
  endpoint: string,
  token: string,
  query: string,
  variables: Record<string, string>,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'github-activity-dashboard',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new ApiError(502, 'GITHUB_ERROR', GENERIC_MESSAGE)
  }

  const rateLimited =
    response.status === 403 &&
    (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.get('retry-after') !== null)
  if (response.status === 429 || rateLimited) throw rateLimitedError(response.headers)
  if (response.status === 401 || response.status === 403) {
    throw new ApiError(502, 'TOKEN_INVALID', 'Token do GitHub recusado ou sem permissão.')
  }
  if (!response.ok) throw new ApiError(502, 'GITHUB_ERROR', GENERIC_MESSAGE)

  let payload: GraphqlPayload<T>
  try {
    payload = (await response.json()) as GraphqlPayload<T>
  } catch {
    throw new ApiError(502, 'GITHUB_ERROR', GENERIC_MESSAGE)
  }

  if (payload.errors?.length) {
    if (payload.errors.some((error) => error.type === 'RATE_LIMITED')) throw rateLimitedError(response.headers)
    if (payload.errors.some((error) => error.type === 'NOT_FOUND')) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'Usuário não encontrado no GitHub.')
    }
    throw new ApiError(502, 'GITHUB_ERROR', GENERIC_MESSAGE)
  }
  if (!payload.data) throw new ApiError(502, 'GITHUB_ERROR', GENERIC_MESSAGE)

  return payload.data
}
