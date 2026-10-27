const integerFormatter = new Intl.NumberFormat('pt-BR')
const averageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export const formatInteger = (value: number) => integerFormatter.format(value)
export const formatAverage = (value: number) => averageFormatter.format(value)

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
