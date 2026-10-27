import type { PublicProfile } from '../shared/types.ts'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAt?: string
  profiles?: PublicProfile[]

  constructor(status: number, code: string, message: string, retryAt?: string) {
    super(message)
    this.status = status
    this.code = code
    this.retryAt = retryAt
  }

  withProfiles(profiles: PublicProfile[]): this {
    this.profiles = profiles
    return this
  }
}

export function errorResponse(error: ApiError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.retryAt ? { retryAt: error.retryAt } : {}),
      ...(error.profiles ? { profiles: error.profiles } : {}),
    },
  }
}
