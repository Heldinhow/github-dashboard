import { describe, expect, it } from 'vitest'
import { computeStats } from '../shared/stats.ts'
import type { MonthStat } from '../shared/types.ts'

const month = (key: string, count: number, isPartial = false): MonthStat => ({
  key,
  label: key,
  count,
  isPartial,
})

const closedMonths = (counts: number[]) =>
  counts.map((count, index) => {
    const monthNumber = 11 + index
    const year = monthNumber > 12 ? 2026 : 2025
    const key = `${year}-${String(((monthNumber - 1) % 12) + 1).padStart(2, '0')}`
    return month(key, count)
  })

describe('computeStats', () => {
  it('soma o total incluindo o mês parcial', () => {
    const months = [...closedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), month('2026-10', 100, true)]

    const stats = computeStats(months)

    expect(stats.total).toBe(166)
  })

  it('divide a média pelos 11 meses fechados', () => {
    const months = [...closedMonths([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100]), month('2026-10', 100, true)]

    const stats = computeStats(months)

    expect(stats.average).toBe(9.1)
  })

  it('ignora o mês parcial no recorde', () => {
    const months = [...closedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), month('2026-10', 999, true)]

    const stats = computeStats(months)

    expect(stats.record).toEqual({ key: '2026-09', label: '2026-09', count: 11 })
  })

  it('empate no recorde fica com o mês mais recente', () => {
    const months = [...closedMonths([5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5]), month('2026-10', 0, true)]

    const stats = computeStats(months)

    expect(stats.record).toEqual({ key: '2026-09', label: '2026-09', count: 5 })
  })

  it('tudo zero resulta em média zero e recorde nulo', () => {
    const months = [...closedMonths([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), month('2026-10', 0, true)]

    const stats = computeStats(months)

    expect(stats.total).toBe(0)
    expect(stats.average).toBe(0)
    expect(stats.record).toBeNull()
  })
})
