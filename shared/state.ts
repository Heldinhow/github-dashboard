import type { CalendarDate } from './months.ts'

export const DEFAULT_USER = 'usuario-dev'
export const DEFAULT_PRIVATE = 1

export type PrivateMode = 0 | 1

export interface ActivityRequest {
  user: string
  private: PrivateMode
}

const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/

export function isValidLogin(value: string): boolean {
  return LOGIN_PATTERN.test(value)
}

export function parsePrivate(value: unknown): PrivateMode | null {
  if (value === '0') return 0
  if (value === '1') return 1
  return null
}

export function canIncludePrivate(user: string, viewer: string): boolean {
  return user.toLowerCase() === viewer.toLowerCase()
}

export function includePrivate(requested: PrivateMode, allowed: boolean): boolean {
  return requested === 1 && allowed
}

export function readActivityState(search: string): ActivityRequest {
  const params = new URLSearchParams(search)
  return {
    user: params.get('user')?.trim() || DEFAULT_USER,
    private: parsePrivate(params.get('private')) ?? DEFAULT_PRIVATE,
  }
}

export function activitySearch(request: ActivityRequest): string {
  return `?${new URLSearchParams({ user: request.user, private: String(request.private) }).toString()}`
}

export function activityCacheKey(user: string, privateMode: boolean, today: CalendarDate): string {
  return `${user.toLowerCase()}|${privateMode ? 1 : 0}|${today.year}-${today.month}-${today.day}`
}
