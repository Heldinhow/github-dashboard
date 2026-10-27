export interface AxisScale {
  top: number
  ticks: number[]
}

export function niceAxis(max: number): AxisScale {
  if (max <= 4) return { top: 4, ticks: [0, 1, 2, 3, 4] }

  const magnitude = 10 ** Math.floor(Math.log10(max / 4))
  const candidates = [1, 2, 3, 5, 10].map((factor) => factor * magnitude)

  let step = candidates[candidates.length - 1] ?? 1
  let bestDistance = Infinity
  for (const candidate of candidates) {
    const tickCount = Math.ceil(max / candidate) + 1
    const distance = tickCount >= 4 && tickCount <= 5 ? 0 : Math.abs(tickCount - 4.5)
    if (distance < bestDistance) {
      step = candidate
      bestDistance = distance
    }
  }

  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step)
  return { top, ticks }
}
