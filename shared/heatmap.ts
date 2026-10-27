import { addDays, formatDate, parseDate, weekday, type CalendarDate } from './months.ts'
import type { ContributionDay } from './types.ts'

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4

export interface HeatmapDay extends ContributionDay {
  level: HeatmapLevel
}

export interface HeatmapLabel {
  index: number
  label: string
}

export interface HeatmapLayout {
  weeks: Array<Array<HeatmapDay | null>>
  monthLabels: HeatmapLabel[]
}

const DAY_MS = 86_400_000
const MIN_LABEL_GAP = 2
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })

const monthName = (year: number, month: number) =>
  monthFormatter.format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '')

const utcDay = ({ year, month, day }: CalendarDate) => Date.UTC(year, month - 1, day)

export function contributionLevels(days: ContributionDay[]): HeatmapLevel[] {
  const nonZero = days
    .map((day) => day.count)
    .filter((count) => count > 0)
    .sort((a, b) => a - b)

  if (nonZero.length === 0) return days.map((): HeatmapLevel => 0)
  if (nonZero[0] === nonZero.at(-1)) return days.map((day): HeatmapLevel => (day.count > 0 ? 1 : 0))

  const max = nonZero.at(-1)!
  const q1 = nonZero[Math.floor(nonZero.length * 0.25)]!
  const q2 = nonZero[Math.floor(nonZero.length * 0.5)]!
  const q3 = nonZero[Math.floor(nonZero.length * 0.75)]!

  if (q1 === q3 || q3 === max) {
    return days.map((day): HeatmapLevel => {
      if (day.count === 0) return 0
      if (day.count <= max * 0.25) return 1
      if (day.count <= max * 0.5) return 2
      if (day.count <= max * 0.75) return 3
      return 4
    })
  }

  return days.map((day): HeatmapLevel => {
    if (day.count === 0) return 0
    if (day.count <= q1) return 1
    if (day.count <= q2) return 2
    if (day.count <= q3) return 3
    return 4
  })
}

export function buildHeatmap(days: ContributionDay[]): HeatmapLayout {
  if (days.length === 0) return { weeks: [], monthLabels: [] }

  const levels = contributionLevels(days)
  const levelByDate = new Map(days.map((day, index) => [day.date, levels[index]!]))
  const countByDate = new Map(days.map((day) => [day.date, day.count]))
  const dates = days.map((day) => day.date).sort()
  const firstDate = parseDate(dates[0]!)
  const lastDate = parseDate(dates.at(-1)!)
  const gridStart = addDays(firstDate, -weekday(firstDate))
  const gridEnd = addDays(lastDate, 6 - weekday(lastDate))
  const weekCount = Math.round((utcDay(gridEnd) - utcDay(gridStart)) / (7 * DAY_MS))
  const start = dates[0]!
  const end = dates.at(-1)!

  const weeks: Array<Array<HeatmapDay | null>> = []
  for (let week = 0; week < weekCount; week += 1) {
    const cells: Array<HeatmapDay | null> = []
    for (let row = 0; row < 7; row += 1) {
      const date = formatDate(addDays(gridStart, week * 7 + row))
      if (date < start || date > end) {
        cells.push(null)
        continue
      }
      cells.push({ date, count: countByDate.get(date) ?? 0, level: levelByDate.get(date) ?? 0 })
    }
    weeks.push(cells)
  }

  const monthLabels: HeatmapLabel[] = [{ index: 0, label: monthName(firstDate.year, firstDate.month) }]
  let lastLabelIndex = 0
  const firstMonthIndex = firstDate.year * 12 + (firstDate.month - 1)
  const lastMonthIndex = lastDate.year * 12 + (lastDate.month - 1)

  for (let monthIndex = firstMonthIndex + 1; monthIndex <= lastMonthIndex; monthIndex += 1) {
    const year = Math.floor(monthIndex / 12)
    const month = (monthIndex % 12) + 1
    const firstOfMonth = { year, month, day: 1 }
    if (formatDate(firstOfMonth) > end) break

    const index = Math.floor((utcDay(firstOfMonth) - utcDay(gridStart)) / (7 * DAY_MS))
    if (index - lastLabelIndex >= MIN_LABEL_GAP) {
      monthLabels.push({ index, label: monthName(year, month) })
      lastLabelIndex = index
    }
  }

  return { weeks, monthLabels }
}
