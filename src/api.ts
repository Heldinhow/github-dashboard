import { activitySearch, type ActivityRequest } from '../shared/state.ts'
import type { ActivityResponse, PublicProfile } from '../shared/types.ts'

interface ErrorBody {
  error: {
    code: string
    message: string
    retryAt?: string
    profiles?: PublicProfile[]
  }
}

export class ApiClientError extends Error {
  readonly code: string
  readonly retryAt?: string
  readonly profiles?: PublicProfile[]

  constructor(body: ErrorBody['error']) {
    super(body.message)
    this.code = body.code
    this.retryAt = body.retryAt
    this.profiles = body.profiles
  }
}

const FALLBACK = { code: 'GITHUB_ERROR', message: 'Falha ao carregar a atividade. Tente novamente.' }

export async function fetchActivity(request: ActivityRequest): Promise<ActivityResponse> {
  let response: Response
  try {
    response = await fetch(`/api/activity${activitySearch(request)}`)
  } catch {
    throw new ApiClientError(FALLBACK)
  }

  const body = (await response.json().catch(() => null)) as ActivityResponse | ErrorBody | null
  if (!response.ok) {
    throw new ApiClientError(body && 'error' in body ? body.error : FALLBACK)
  }
  if (!body || !('months' in body) || !('contributions' in body)) throw new ApiClientError(FALLBACK)
  return body
}
