import { describe, expect, it } from 'vitest'
import { buildContributionWindow, readContributions } from '../shared/contributions.ts'
import type { ContributionDay } from '../shared/types.ts'

const window = buildContributionWindow({ year: 2026, month: 10, day: 26 })

describe('buildContributionWindow', () => {
  it('gera 365 dias inclusivos terminando hoje, com início e fim locais', () => {
    expect(window.start).toBe('2025-10-27')
    expect(window.end).toBe('2026-10-26')
    expect(window.dates).toHaveLength(365)
    expect(window.dates[0]).toBe('2025-10-27')
    expect(window.dates.at(-1)).toBe('2026-10-26')
    expect(window.from).toBe('2025-10-27T00:00:00-03:00')
    expect(window.to).toBe('2026-10-26T23:59:59-03:00')
  })

  it('atravessa ano bissexto', () => {
    const leap = buildContributionWindow({ year: 2024, month: 3, day: 1 })

    expect(leap.dates).toHaveLength(365)
    expect(leap.dates).toContain('2024-02-29')
  })
})

describe('readContributions', () => {
  function weeksFor(days: ContributionDay[]) {
    const weeks: { contributionDays: { date: string; contributionCount: number }[] }[] = []
    for (let index = 0; index < days.length; index += 7) {
      weeks.push({
        contributionDays: days.slice(index, index + 7).map((day) => ({
          date: day.date,
          contributionCount: day.count,
        })),
      })
    }
    return weeks
  }

  it('filtra para a janela, inclui zeros, mantém a ordem e soma os dias', () => {
    const inRange = window.dates.map((date, index) => ({
      date,
      count: index === 10 ? 3 : index === 364 ? 5 : 0,
    }))
    const paddingBefore = Array.from({ length: 7 }, (_, index) => ({
      date: `2025-10-${String(19 + index).padStart(2, '0')}`,
      count: 100,
    }))
    const paddingAfter = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-10-${String(27 + index).padStart(2, '0')}`,
      count: 100,
    }))
    const data = {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: weeksFor([...paddingBefore, ...inRange, ...paddingAfter]),
          },
        },
      },
    }

    const contributions = readContributions(data, window)

    expect(contributions.total).toBe(8)
    expect(contributions.start).toBe('2025-10-27')
    expect(contributions.end).toBe('2026-10-26')
    expect(contributions.days).toHaveLength(365)
    expect(contributions.days[0]).toEqual({ date: '2025-10-27', count: 0 })
    expect(contributions.days[10]).toEqual({ date: '2025-11-06', count: 3 })
    expect(contributions.days.at(-1)).toEqual({ date: '2026-10-26', count: 5 })
  })

  it('falha quando o calendário está ausente', () => {
    expect(() => readContributions({ user: { contributionsCollection: null } }, window)).toThrow(
      /calendário/i,
    )
  })

  it('falha quando um dia vem malformado', () => {
    const data = {
      user: {
        contributionsCollection: {
          contributionCalendar: { weeks: [{ contributionDays: [{ date: '2025-10-27' }] }] },
        },
      },
    }

    expect(() => readContributions(data, window)).toThrow(/dia/i)
  })
})
