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
  user: string
  viewer: string
  includePrivate: boolean
  canIncludePrivate: boolean
  months: MonthStat[]
  stats: ActivityStats
  contributions: Contributions
  fetchedAt: string
}
