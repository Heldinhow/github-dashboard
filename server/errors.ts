export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAt?: string

  constructor(status: number, code: string, message: string, retryAt?: string) {
    super(message)
    this.status = status
    this.code = code
    this.retryAt = retryAt
  }
}
