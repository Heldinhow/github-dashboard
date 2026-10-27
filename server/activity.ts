import { createCache } from '../shared/cache.ts'
import {
  buildContributionWindow,
  readContributions,
} from '../shared/contributions.ts'
import { buildMonthWindows, todayInTimeZone } from '../shared/months.ts'
import { buildActivityQuery, readMonthlyCounts } from '../shared/query.ts'
import { computeStats } from '../shared/stats.ts'
import type { ActivityResponse, Contributions, MonthStat } from '../shared/types.ts'
import { ApiError } from './errors.ts'
import { graphqlRequest } from './github.ts'

export const DEFAULT_USER = 'usuario-dev'
const CACHE_TTL_MS = 60 * 60 * 1000
const LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/

type ActivityData = {
  user: {
    login: string
    contributionsCollection: {
      contributionCalendar: {
        weeks: Array<{
          contributionDays: Array<{ date: string; contributionCount: number }>
        }>
      }
    }
  } | null
} & Record<string, unknown>

export function isValidLogin(value: string): boolean {
  return LOGIN_PATTERN.test(value)
}

const cache = createCache<ActivityResponse>(CACHE_TTL_MS)

async function loadActivity(user: string, token: string, now: Date): Promise<ActivityResponse> {
  const today = todayInTimeZone(now)
  const windows = buildMonthWindows(today)
  const contributionWindow = buildContributionWindow(today)
  const data = await graphqlRequest<ActivityData>(
    token,
    buildActivityQuery(user, windows, contributionWindow),
    { user, from: contributionWindow.from, to: contributionWindow.to },
  )

  if (!data.user) throw new ApiError(404, 'USER_NOT_FOUND', 'Usuário não encontrado no GitHub.')

  let counts: number[]
  let contributions: Contributions
  try {
    counts = readMonthlyCounts(data, windows)
    contributions = readContributions(data, contributionWindow)
  } catch {
    throw new ApiError(502, 'GITHUB_ERROR', 'Resposta incompleta do GitHub. Tente novamente.')
  }

  const months: MonthStat[] = windows.map((window, index) => ({
    key: window.key,
    label: window.label,
    count: counts[index] ?? 0,
    isPartial: window.isPartial,
  }))

  return {
    user: data.user.login,
    months,
    stats: computeStats(months),
    contributions,
    fetchedAt: new Date().toISOString(),
  }
}

export async function getActivity(
  rawUser: string,
  token: string | undefined,
  now: Date = new Date(),
): Promise<ActivityResponse> {
  if (!isValidLogin(rawUser)) throw new ApiError(400, 'INVALID_USER', 'Login do GitHub inválido.')

  const today = todayInTimeZone(now)
  const cacheKey = `${rawUser.toLowerCase()}|${today.year}-${today.month}-${today.day}`

  return cache.getOrLoad(cacheKey, () => {
    if (!token) {
      throw new ApiError(
        503,
        'TOKEN_MISSING',
        'GITHUB_TOKEN não configurado. Defina o token no .env e reinicie o servidor.',
      )
    }
    return loadActivity(rawUser, token, now)
  })
}
