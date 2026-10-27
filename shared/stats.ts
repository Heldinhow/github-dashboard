import type { ActivityStats, MonthStat } from './types.ts'

const round1 = (value: number) => Math.round(value * 10) / 10

export function computeStats(months: MonthStat[]): ActivityStats {
  const total = months.reduce((sum, month) => sum + month.count, 0)
  const closed = months.filter((month) => !month.isPartial)
  const closedTotal = closed.reduce((sum, month) => sum + month.count, 0)
  const average = closed.length === 0 ? 0 : round1(closedTotal / closed.length)

  let record: ActivityStats['record'] = null
  for (const month of closed) {
    if (month.count > 0 && (record === null || month.count >= record.count)) {
      record = { key: month.key, label: month.label, count: month.count }
    }
  }

  return { total, average, record }
}
