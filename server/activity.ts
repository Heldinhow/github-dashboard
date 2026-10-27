import { createCache } from '../shared/cache.ts'
import {
  buildContributionWindow,
  readContributions,
  type ContributionWindow,
} from '../shared/contributions.ts'
import { buildMonthWindows, todayInTimeZone, type CalendarDate } from '../shared/months.ts'
import { buildActivityQuery, readMonthlyCounts } from '../shared/query.ts'
import {
  activityCacheKey,
  canIncludePrivate,
  includePrivate,
  isValidLogin,
  type PrivateMode,
} from '../shared/state.ts'
import { computeStats } from '../shared/stats.ts'
import type {
  ActivityResponse,
  Contributions,
  MonthStat,
  ProfileFilters,
} from '../shared/types.ts'
import {
  effectiveFilters,
  publicProfiles,
  type AppConfig,
  type ProfileConfig,
} from './config.ts'
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
// Sem TTL: o dono do token de cada perfil não muda enquanto o processo viver.
const viewerCache = createCache<string>(Number.POSITIVE_INFINITY)

function resolveProfile(config: AppConfig, requested: string | undefined): ProfileConfig {
  const name = requested?.trim() || config.defaultProfile
  const profile = config.profiles.find((candidate) => candidate.name === name)
  if (!profile) {
    throw new ApiError(
      400,
      'UNKNOWN_PROFILE',
      `Perfil "${name}" não encontrado. Escolha um perfil configurado ou ajuste GITHUB_PROFILES_FILE e reinicie o servidor.`,
    )
  }
  return profile
}

async function resolveViewer(profile: ProfileConfig, token: string): Promise<string> {
  return viewerCache.getOrLoad(profile.name, async () => {
    const data = await graphqlRequest<{ viewer?: { login?: unknown } }>(
      profile.graphqlUrl,
      token,
      VIEWER_QUERY,
      {},
    )
    if (typeof data.viewer?.login !== 'string' || data.viewer.login.length === 0) {
      throw new ApiError(502, 'GITHUB_ERROR', 'Resposta incompleta do GitHub. Tente novamente.')
    }
    return data.viewer.login
  })
}

async function loadActivity(
  profile: ProfileConfig,
  config: AppConfig,
  user: string,
  viewer: string,
  requestedPrivate: PrivateMode,
  allowedPrivate: boolean,
  token: string,
  today: CalendarDate,
): Promise<ActivityResponse> {
  const windows = buildMonthWindows(today)
  const contributionWindow: ContributionWindow = buildContributionWindow(today, profile.timeZone)
  const withPrivate = includePrivate(requestedPrivate, allowedPrivate)
  const context = effectiveFilters(profile)
  const filters: ProfileFilters = { ...context, timeZone: profile.timeZone }
  const data = await graphqlRequest<ActivityData>(
    profile.graphqlUrl,
    token,
    buildActivityQuery(user, windows, contributionWindow, !withPrivate, context),
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
    profile: profile.name,
    profiles: publicProfiles(config),
    filters,
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
  config: AppConfig,
  requestedProfile: string | undefined,
  rawUser: string | undefined,
  requestedPrivate: PrivateMode,
  now: Date = new Date(),
  env: Record<string, string | undefined> = process.env,
): Promise<ActivityResponse> {
  const profile = resolveProfile(config, requestedProfile)
  const user = rawUser?.trim() || profile.user
  if (!isValidLogin(user)) throw new ApiError(400, 'INVALID_USER', 'Login do GitHub inválido.')

  const token = env[profile.tokenEnv]?.trim()
  if (!token) {
    throw new ApiError(
      503,
      'TOKEN_MISSING',
      `${profile.tokenEnv} não configurado para o perfil "${profile.name}". Defina a variável no .env e reinicie o servidor.`,
    )
  }

  const viewer = await resolveViewer(profile, token)
  const allowedPrivate = canIncludePrivate(user, viewer)
  const withPrivate = includePrivate(requestedPrivate, allowedPrivate)
  const today = todayInTimeZone(now, profile.timeZone)
  const cacheKey = activityCacheKey(profile.name, user, withPrivate, today)

  return cache.getOrLoad(cacheKey, () =>
    loadActivity(profile, config, user, viewer, requestedPrivate, allowedPrivate, token, today),
  )
}
