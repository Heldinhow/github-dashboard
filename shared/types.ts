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

export interface ActivityResponse {
  user: string
  months: MonthStat[]
  stats: ActivityStats
  fetchedAt: string
}
