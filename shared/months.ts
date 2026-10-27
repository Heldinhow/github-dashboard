export const TIME_ZONE = 'America/Sao_Paulo'

export interface CalendarDate {
  year: number
  month: number
  day: number
}

export interface MonthWindow {
  key: string
  label: string
  start: string
  end: string
  isPartial: boolean
}

const pad = (value: number) => String(value).padStart(2, '0')

export function formatDate({ year, month, day }: CalendarDate): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function parseDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`Data inválida: ${value}`)
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() }
}

export function weekday(date: CalendarDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
}

export function todayInTimeZone(now: Date, timeZone = TIME_ZONE): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

export function timeZoneOffset(date: CalendarDate, timeZone: string): string {
  const instant = new Date(Date.UTC(date.year, date.month - 1, date.day, 12))
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(instant)
  const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
  const match = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(name)
  if (!match) throw new Error(`Fuso inválido: ${timeZone}`)
  if (!match[1]) return '+00:00'
  return `${match[1]}${match[2]}:${match[3]}`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const monthNameFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  timeZone: 'UTC',
})

export function monthLabel(year: number, month: number): string {
  const name = monthNameFormatter.format(new Date(Date.UTC(year, month - 1, 1))).replace('.', '')
  return `${name}/${String(year).slice(-2)}`
}

export function buildMonthWindows(today: CalendarDate): MonthWindow[] {
  const current = today.year * 12 + (today.month - 1)
  const windows: MonthWindow[] = []
  for (let offset = 11; offset >= 0; offset -= 1) {
    const index = current - offset
    const year = Math.floor(index / 12)
    const month = (index % 12) + 1
    const key = `${year}-${pad(month)}`
    const endDay = offset === 0 ? today.day : daysInMonth(year, month)
    windows.push({
      key,
      label: monthLabel(year, month),
      start: `${key}-01`,
      end: `${key}-${pad(endDay)}`,
      isPartial: offset === 0,
    })
  }
  return windows
}
