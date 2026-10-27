import { niceAxis } from '../../shared/axis.ts'
import type { MonthStat } from '../../shared/types.ts'
import { formatInteger } from '../format.ts'

const WIDTH = 860
const HEIGHT = 300
const PAD = { top: 28, right: 16, bottom: 56, left: 64 }

function roundedTopBar(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height)
  return [
    `M${x},${y + height}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${y + height}`,
    'Z',
  ].join(' ')
}

export function MonthlyBarChart({ months }: { months: MonthStat[] }) {
  const max = Math.max(...months.map((month) => month.count))
  const { top, ticks } = niceAxis(max)
  const plotWidth = WIDTH - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const slot = plotWidth / months.length
  const barWidth = Math.min(34, slot * 0.55)
  const baseline = PAD.top + plotHeight
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight
  const summary = months.map((month) => `${month.label}: ${month.count}`).join('; ')

  return (
    <div className="chart-scroll">
      <svg
        className="bar-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`PRs mergeados por mês. ${summary}.`}
      >
        <title>PRs mergeados por mês</title>
        <desc>
          Gráfico de barras com {months.length} meses. {summary}.
        </desc>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="grid-line"
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="axis-text" x={PAD.left - 10} y={y(tick) + 4} textAnchor="end">
              {formatInteger(tick)}
            </text>
          </g>
        ))}

        <text
          className="axis-title"
          transform={`rotate(-90 18 ${PAD.top + plotHeight / 2})`}
          x={18}
          y={PAD.top + plotHeight / 2}
          textAnchor="middle"
        >
          PRs mergeados
        </text>

        {months.map((month, index) => {
          const center = PAD.left + slot * index + slot / 2
          const barHeight = Math.max((month.count / top) * plotHeight, 2)
          const barTop = baseline - barHeight
          const labelY = month.count === 0 ? baseline - 8 : barTop - 8
          return (
            <g key={month.key}>
              <path
                className="bar"
                d={roundedTopBar(center - barWidth / 2, barTop, barWidth, barHeight, 4)}
              >
                <title>{`${month.label}: ${formatInteger(month.count)} PRs mergeados`}</title>
              </path>
              <text className="bar-value" x={center} y={labelY} textAnchor="middle">
                {formatInteger(month.count)}
              </text>
              <text className="axis-text" x={center} y={baseline + 20} textAnchor="middle">
                {month.label}
              </text>
              {month.isPartial && (
                <text className="axis-text partial-note" x={center} y={baseline + 36} textAnchor="middle">
                  (até agora)
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
