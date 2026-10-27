import { createCache } from '../shared/cache.ts'
import {
  buildContributionWindow,
  readContributions,
} from '../shared/contributions.ts'
import { buildMonthWindows, todayInTimeZone } from '../shared/months.ts'
import { buildActivityQuery, readMonthlyCounts } from '../shared/query.ts'
import {
  activityCacheKey,
  canIncludePrivate,
  includePrivate,
  isValidLogin,
  type PrivateMode,
} from '../shared/state.ts'
import { computeStats } from '../shared/stats.ts'
import type { ActivityResponse, Contributions, MonthStat } from '../shared/types.ts'
import { ApiError } from './errors.ts'
import { graphqlRequest } from './github.ts'

const CACHE_TTL_MS = 60 * 60 * 1000
const VIEWER_QUERY = 'query { viewer { login } }'

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

const cache = createCache<ActivityResponse>(CACHE_TTL_MS)
// Sem TTL: o dono do token não muda enquanto o processo viver.
const viewerCache = createCache<string>(Number.POSITIVE_INFINITY)

async function resolveViewer(token: string): Promise<string> {
  return viewerCache.getOrLoad('viewer', async () => {
    const data = await graphqlRequest<{ viewer?: { login?: unknown } }>(token, VIEWER_QUERY, {})
    if (typeof data.viewer?.login !== 'string' || data.viewer.login.length === 0) {
      throw new ApiError(502, 'GITHUB_ERROR', 'Resposta incompleta do GitHub. Tente novamente.')
    }
    return data.viewer.login
  })
}

async function loadActivity(
  user: string,
  viewer: string,
  requestedPrivate: PrivateMode,
  allowedPrivate: boolean,
  token: string,
  now: Date,
): Promise<ActivityResponse> {
  const today = todayInTimeZone(now)
  const windows = buildMonthWindows(today)
  const contributionWindow = buildContributionWindow(today)
  const withPrivate = includePrivate(requestedPrivate, allowedPrivate)
  const data = await graphqlRequest<ActivityData>(
    token,
    buildActivityQuery(user, windows, contributionWindow, !withPrivate),
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
    viewer,
    includePrivate: withPrivate,
    canIncludePrivate: allowedPrivate,
    months,
    stats: computeStats(months),
    contributions,
    fetchedAt: new Date().toISOString(),
  }
}

export async function getActivity(
  rawUser: string,
  requestedPrivate: PrivateMode,
  token: string | undefined,
  now: Date = new Date(),
): Promise<ActivityResponse> {
  if (!isValidLogin(rawUser)) throw new ApiError(400, 'INVALID_USER', 'Login do GitHub inválido.')
  if (!token) {
    throw new ApiError(
      503,
      'TOKEN_MISSING',
      'GITHUB_TOKEN não configurado. Defina o token no .env e reinicie o servidor.',
    )
  }

  const viewer = await resolveViewer(token)
  const allowedPrivate = canIncludePrivate(rawUser, viewer)
  const withPrivate = includePrivate(requestedPrivate, allowedPrivate)
  const today = todayInTimeZone(now)
  const cacheKey = activityCacheKey(rawUser, withPrivate, today)

  return cache.getOrLoad(cacheKey, () =>
    loadActivity(rawUser, viewer, requestedPrivate, allowedPrivate, token, now),
  )
}
