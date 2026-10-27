import { describe, expect, it } from 'vitest'
import { buildContributionWindow } from '../shared/contributions.ts'
import { buildMonthWindows, todayInTimeZone } from '../shared/months.ts'

const today = { year: 2026, month: 10, day: 26 }

describe('fuso do perfil nas janelas', () => {
  it('monta a janela de 365 dias em UTC', () => {
    const window = buildContributionWindow(today, 'UTC')

    expect(window.from).toBe('2025-10-27T00:00:00+00:00')
    expect(window.to).toBe('2026-10-26T23:59:59+00:00')
  })

  it('monta a janela de 365 dias em America/Sao_Paulo', () => {
    const window = buildContributionWindow(today, 'America/Sao_Paulo')

    expect(window.from).toBe('2025-10-27T00:00:00-03:00')
    expect(window.to).toBe('2026-10-26T23:59:59-03:00')
  })

  it('monta a janela de 365 dias em Asia/Tokyo', () => {
    const window = buildContributionWindow(today, 'Asia/Tokyo')

    expect(window.from).toBe('2025-10-27T00:00:00+09:00')
    expect(window.to).toBe('2026-10-26T23:59:59+09:00')
  })

  it('acompanha o horário de verão do fuso', () => {
    expect(buildContributionWindow({ year: 2026, month: 1, day: 15 }, 'America/New_York').from).toBe(
      '2025-01-16T00:00:00-05:00',
    )
    expect(buildContributionWindow({ year: 2026, month: 7, day: 15 }, 'America/New_York').to).toBe(
      '2026-07-15T23:59:59-04:00',
    )
  })

  it('a virada do mês depende do fuso do perfil', () => {
    const instant = new Date('2026-11-01T02:30:00Z')

    expect(todayInTimeZone(instant, 'America/Sao_Paulo')).toEqual({ year: 2026, month: 10, day: 31 })
    expect(todayInTimeZone(instant, 'UTC')).toEqual({ year: 2026, month: 11, day: 1 })
    expect(buildMonthWindows(todayInTimeZone(instant, 'America/Sao_Paulo')).at(-1)?.key).toBe('2026-10')
    expect(buildMonthWindows(todayInTimeZone(instant, 'UTC')).at(-1)?.key).toBe('2026-11')
  })
})
