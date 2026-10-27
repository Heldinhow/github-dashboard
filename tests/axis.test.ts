import { describe, expect, it } from 'vitest'
import { niceAxis } from '../shared/axis.ts'

describe('niceAxis', () => {
  it('usa topo 4 quando todos os meses são zero', () => {
    expect(niceAxis(0)).toEqual({ top: 4, ticks: [0, 1, 2, 3, 4] })
  })

  it('arredonda o topo para um valor legível com 4 ou 5 ticks', () => {
    for (const max of [1, 4, 5, 7, 9, 26, 50, 117, 293]) {
      const scale = niceAxis(max)
      expect(scale.top).toBeGreaterThanOrEqual(max)
      expect(scale.ticks.length).toBeGreaterThanOrEqual(4)
      expect(scale.ticks.length).toBeLessThanOrEqual(5)
      expect(scale.ticks[0]).toBe(0)
      expect(scale.ticks.at(-1)).toBe(scale.top)
    }
  })
})
