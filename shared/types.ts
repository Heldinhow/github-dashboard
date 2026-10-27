export interface MonthStat {
  key: string
  label: string
  count: number
  isPartial: boolean
}

export interface ActivityStats {
  total: number
  average: number
  record: { key: string; label: string; count: number } | null
}

export interface PublicProfile {
  name: string
  user: string
}

export interface ProfileFilters {
  orgs: string[]
  repos: string[]
  timeZone: string
}

export interface ContributionDay {
  date: string
  count: number
}

export interface Contributions {
  total: number
  start: string
  end: string
  days: ContributionDay[]
}

export interface ActivityResponse {
  profile: string
  profiles: PublicProfile[]
  filters: ProfileFilters
  user: string
  viewer: string
  includePrivate: boolean
  canIncludePrivate: boolean
  months: MonthStat[]
  stats: ActivityStats
  contributions: Contributions
  fetchedAt: string
}
