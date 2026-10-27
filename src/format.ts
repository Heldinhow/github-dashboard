import { parseDate } from '../shared/months.ts'

const integerFormatter = new Intl.NumberFormat('pt-BR')
const averageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export const formatInteger = (value: number) => integerFormatter.format(value)
export const formatAverage = (value: number) => averageFormatter.format(value)

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatLongDate(date: string): string {
  const { year, month, day } = parseDate(date)
  return longDateFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatContributionLabel(count: number): string {
  if (count === 0) return 'Nenhuma contribuição'
  return `${formatInteger(count)} ${count === 1 ? 'contribuição' : 'contribuições'}`
}
