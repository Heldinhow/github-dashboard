import type { ActivityResponse } from '../shared/types.ts'

interface ErrorBody {
  error: {
    code: string
    message: string
    retryAt?: string
  }
}

export class ApiClientError extends Error {
  readonly code: string
  readonly retryAt?: string

  constructor(body: ErrorBody['error']) {
    super(body.message)
    this.code = body.code
    this.retryAt = body.retryAt
  }
}

const FALLBACK = { code: 'GITHUB_ERROR', message: 'Falha ao carregar a atividade. Tente novamente.' }

export async function fetchActivity(): Promise<ActivityResponse> {
  let response: Response
  try {
    response = await fetch('/api/activity')
  } catch {
    throw new ApiClientError(FALLBACK)
  }

  const body = (await response.json().catch(() => null)) as ActivityResponse | ErrorBody | null
  if (!response.ok) {
    throw new ApiClientError(body && 'error' in body ? body.error : FALLBACK)
  }
  if (!body || !('months' in body)) throw new ApiClientError(FALLBACK)
  return body
}
