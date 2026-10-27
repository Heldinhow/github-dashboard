import { describe, expect, it } from 'vitest'
import { buildContributionWindow } from '../shared/contributions.ts'
import { buildHeatmap, contributionLevels } from '../shared/heatmap.ts'

const day = (date: string, count: number) => ({ date, count })

const window = buildContributionWindow({ year: 2026, month: 10, day: 26 })
const windowDays = window.dates.map((date) => day(date, 0))

describe('contributionLevels', () => {
  it('devolve zero para todos os dias quando não há contribuição', () => {
    expect(contributionLevels(windowDays)).toEqual(windowDays.map(() => 0))
    expect(contributionLevels([])).toEqual([])
  })

  it('devolve nível 1 quando todos os dias não-zero são iguais', () => {
    const days = [day('a', 0), day('b', 3), day('c', 3), day('d', 3)]

    expect(contributionLevels(days)).toEqual([0, 1, 1, 1])
  })

  it('devolve nível 1 para um único dia não-zero', () => {
    expect(contributionLevels([day('a', 0), day('b', 9)])).toEqual([0, 1])
  })

  it('usa faixas relativas ao máximo quando q1 === q3', () => {
    const days = [
      ...Array.from({ length: 80 }, (_, index) => day(`low-${index}`, 1)),
      ...Array.from({ length: 5 }, (_, index) => day(`half-${index}`, 50)),
      ...Array.from({ length: 5 }, (_, index) => day(`three-${index}`, 75)),
      ...Array.from({ length: 10 }, (_, index) => day(`max-${index}`, 100)),
      day('zero', 0),
    ]

    expect(contributionLevels(days)).toEqual([
      ...Array.from({ length: 80 }, () => 1),
      ...Array.from({ length: 5 }, () => 2),
      ...Array.from({ length: 5 }, () => 3),
      ...Array.from({ length: 10 }, () => 4),
      0,
    ])
  })

  it('usa faixas relativas ao máximo quando q3 === max, e o pico isolado chega ao nível 4', () => {
    const days = [
      ...Array.from({ length: 70 }, (_, index) => day(`low-${index}`, 1)),
      ...Array.from({ length: 30 }, (_, index) => day(`peak-${index}`, 100)),
    ]

    const levels = contributionLevels(days)

    expect(levels.slice(0, 70)).toEqual(Array.from({ length: 70 }, () => 1))
    expect(levels.slice(70)).toEqual(Array.from({ length: 30 }, () => 4))
  })

  it('usa os quartis quando q1 !== q3 e q3 !== max, com zero sempre nível 0', () => {
    const counts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    const days = [day('zero', 0), ...counts.map((count, index) => day(`d-${index}`, count))]

    // n = 11; q1 = índice 2 (3), q2 = índice 5 (6), q3 = índice 8 (9).
    expect(contributionLevels(days)).toEqual([
      0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4,
    ])
  })

  it('mantém zero no nível 0 na mistura com dias não-zero', () => {
    const days = [day('a', 0), day('b', 0), day('c', 2), day('d', 4), day('e', 8), day('f', 16)]

    expect(contributionLevels(days)[0]).toBe(0)
    expect(contributionLevels(days)[1]).toBe(0)
    expect(contributionLevels(days).slice(2).every((level) => level >= 1)).toBe(true)
  })
})

describe('buildHeatmap', () => {
  it('coloca domingo na primeira coluna e preenche as bordas com células vazias', () => {
    const layout = buildHeatmap(windowDays)

    expect(layout.weeks).toHaveLength(53)
    expect(layout.weeks[0]).toHaveLength(7)
    expect(layout.weeks[0]?.[0]).toBeNull()
    expect(layout.weeks[0]?.[1]?.date).toBe('2025-10-27')
    expect(layout.weeks[0]?.[6]?.date).toBe('2025-11-01')
    expect(layout.weeks.at(-1)?.[0]?.date).toBe('2026-10-25')
    expect(layout.weeks.at(-1)?.[1]?.date).toBe('2026-10-26')
    expect(layout.weeks.at(-1)?.[2]).toBeNull()
  })

  it('gera 54 colunas quando o alinhamento da grade exige', () => {
    const start = new Date(Date.UTC(2025, 9, 25))
    const days = Array.from({ length: 366 }, (_, index) => {
      const date = new Date(start.getTime() + index * 86_400_000)
      return day(date.toISOString().slice(0, 10), 0)
    })

    expect(buildHeatmap(days).weeks).toHaveLength(54)
  })

  it('rotula o primeiro mês mesmo com o dia 1 fora e omite rótulos que colidiriam', () => {
    const labels = buildHeatmap(windowDays).monthLabels

    expect(labels[0]).toEqual({ index: 0, label: 'out' })
    expect(labels.some((label) => label.label === 'nov')).toBe(false)
    expect(labels).toContainEqual({ index: 5, label: 'dez' })
    expect(labels).toContainEqual({ index: 9, label: 'jan' })
    expect(labels.map((label) => label.label)).toContain('out')
    expect(labels.at(-1)).toEqual({ index: 48, label: 'out' })
  })

  it('interpreta YYYY-MM-DD como data de calendário local, sem deslocar o dia', () => {
    const layout = buildHeatmap([day('2026-10-25', 1)])

    expect(layout.weeks[0]?.[0]?.date).toBe('2026-10-25')
    expect(layout.weeks[0]?.[0]?.level).toBe(1)
    expect(layout.weeks).toHaveLength(1)
  })

  it('não cria célula para dias fora do intervalo', () => {
    const layout = buildHeatmap([day('2026-10-25', 0), day('2026-10-26', 4)])

    expect(layout.weeks[0]?.[0]?.date).toBe('2026-10-25')
    expect(layout.weeks[0]?.[1]?.date).toBe('2026-10-26')
    expect(layout.weeks[0]?.[2]).toBeNull()
  })
})
