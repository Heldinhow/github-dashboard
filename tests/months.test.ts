import { describe, expect, it } from 'vitest'
import { buildMonthWindows, daysInMonth, todayInTimeZone } from '../shared/months.ts'

const keys = (windows: ReturnType<typeof buildMonthWindows>) => windows.map((window) => window.key)

describe('buildMonthWindows', () => {
  it('gera 12 meses terminando no mês corrente', () => {
    const windows = buildMonthWindows({ year: 2026, month: 10, day: 26 })

    expect(windows).toHaveLength(12)
    expect(keys(windows)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ])
    expect(windows.map((window) => window.label)).toEqual([
      'nov/25',
      'dez/25',
      'jan/26',
      'fev/26',
      'mar/26',
      'abr/26',
      'mai/26',
      'jun/26',
      'jul/26',
      'ago/26',
      'set/26',
      'out/26',
    ])
  })

  it('marca só o mês corrente como parcial, terminando hoje', () => {
    const windows = buildMonthWindows({ year: 2026, month: 10, day: 26 })
    const partial = windows.filter((window) => window.isPartial)

    expect(partial).toHaveLength(1)
    expect(partial[0]).toMatchObject({ key: '2026-10', start: '2026-10-01', end: '2026-10-26' })
    expect(windows[0]).toMatchObject({ start: '2025-11-01', end: '2025-11-30', isPartial: false })
  })

  it('respeita ano bissexto no mês fechado', () => {
    const windows = buildMonthWindows({ year: 2024, month: 3, day: 10 })
    const february = windows.find((window) => window.key === '2024-02')

    expect(february).toMatchObject({ start: '2024-02-01', end: '2024-02-29', isPartial: false })
  })

  it('atravessa a virada do ano', () => {
    const windows = buildMonthWindows({ year: 2026, month: 1, day: 1 })

    expect(windows[0]?.key).toBe('2025-02')
    expect(windows[10]).toMatchObject({ key: '2025-12', end: '2025-12-31' })
    expect(windows[11]).toMatchObject({ key: '2026-01', start: '2026-01-01', end: '2026-01-01', isPartial: true })
  })

  it('no primeiro dia do mês o parcial tem início igual ao fim', () => {
    const partial = buildMonthWindows({ year: 2026, month: 10, day: 1 })[11]

    expect(partial).toMatchObject({ start: '2026-10-01', end: '2026-10-01' })
  })

  it('calcula os dias do mês', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2025, 2)).toBe(28)
    expect(daysInMonth(2026, 10)).toBe(31)
  })
})

describe('todayInTimeZone', () => {
  it('usa o calendário de America/Sao_Paulo', () => {
    expect(todayInTimeZone(new Date('2026-10-26T02:59:59Z'))).toEqual({ year: 2026, month: 10, day: 25 })
    expect(todayInTimeZone(new Date('2026-10-26T03:00:00Z'))).toEqual({ year: 2026, month: 10, day: 26 })
  })
})
