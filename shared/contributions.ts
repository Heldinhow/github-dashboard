import { TIME_ZONE, addDays, formatDate, timeZoneOffset, type CalendarDate } from './months.ts'
import type { ContributionDay, Contributions } from './types.ts'

export interface ContributionWindow {
  start: string
  end: string
  from: string
  to: string
  dates: string[]
}

export interface ContributionsSource {
  user?: {
    login?: unknown
    contributionsCollection?: {
      contributionCalendar?: {
        weeks?: Array<{ contributionDays?: Array<{ date?: unknown; contributionCount?: unknown }> }>
      } | null
    } | null
  } | null
}

export function buildContributionWindow(today: CalendarDate, timeZone = TIME_ZONE): ContributionWindow {
  const startDate = addDays(today, -364)
  const start = formatDate(startDate)
  const end = formatDate(today)
  const dates: string[] = []

  for (let offset = 0; offset < 365; offset += 1) {
    dates.push(formatDate(addDays(startDate, offset)))
  }

  return {
    start,
    end,
    from: `${start}T00:00:00${timeZoneOffset(startDate, timeZone)}`,
    to: `${end}T23:59:59${timeZoneOffset(today, timeZone)}`,
    dates,
  }
}

export function readContributions(data: ContributionsSource, window: ContributionWindow): Contributions {
  const calendar = data.user?.contributionsCollection?.contributionCalendar
  if (!calendar || !Array.isArray(calendar.weeks) || calendar.weeks.length === 0) {
    throw new Error('Calendário de contribuições ausente na resposta do GitHub.')
  }

  const counts = new Map<string, number>()
  for (const week of calendar.weeks) {
    if (!Array.isArray(week?.contributionDays)) {
      throw new Error('Dia de contribuição ausente na resposta do GitHub.')
    }
    for (const entry of week.contributionDays) {
      if (
        typeof entry?.date !== 'string' ||
        typeof entry.contributionCount !== 'number' ||
        !Number.isInteger(entry.contributionCount) ||
        entry.contributionCount < 0
      ) {
        throw new Error('Dia de contribuição inválido na resposta do GitHub.')
      }
      counts.set(entry.date, entry.contributionCount)
    }
  }

  const days: ContributionDay[] = window.dates.map((date) => ({
    date,
    count: counts.get(date) ?? 0,
  }))

  return {
    total: days.reduce((sum, day) => sum + day.count, 0),
    start: window.start,
    end: window.end,
    days,
  }
}
