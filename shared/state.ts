import type { CalendarDate } from './months.ts'

export const DEFAULT_PRIVATE = 1

export type PrivateMode = 0 | 1

export interface ActivityRequest {
  profile?: string
  user?: string
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
  const profile = params.get('profile')?.trim()
  const user = params.get('user')?.trim()
  return {
    ...(profile ? { profile } : {}),
    ...(user ? { user } : {}),
    private: parsePrivate(params.get('private')) ?? DEFAULT_PRIVATE,
  }
}

export function activitySearch(request: ActivityRequest): string {
  const params = new URLSearchParams()
  if (request.profile) params.set('profile', request.profile)
  if (request.user) params.set('user', request.user)
  params.set('private', String(request.private))
  return `?${params.toString()}`
}

export function activityCacheKey(
  profile: string,
  user: string,
  privateMode: boolean,
  today: CalendarDate,
): string {
  return `${profile}|${user.toLowerCase()}|${privateMode ? 1 : 0}|${today.year}-${today.month}-${today.day}`
}
