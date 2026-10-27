import { useState, type FocusEvent, type MouseEvent } from 'react'
import { buildHeatmap } from '../../shared/heatmap.ts'
import type { Contributions } from '../../shared/types.ts'
import { formatContributionLabel, formatInteger, formatLongDate } from '../format.ts'

const CELL = 11
const GAP = 3
const PITCH = CELL + GAP
const LEFT = 30
const TOP = 20
const LEVELS = [0, 1, 2, 3, 4] as const
const ROW_LABELS = [
  { row: 1, label: 'seg' },
  { row: 3, label: 'qua' },
  { row: 5, label: 'sex' },
]

interface TooltipState {
  left: number
  top: number
  above: boolean
  text: string
}

export function Heatmap({ contributions }: { contributions: Contributions }) {
  const { weeks, monthLabels } = buildHeatmap(contributions.days)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const width = LEFT + Math.max(weeks.length, 1) * PITCH + 2
  const height = TOP + 7 * PITCH
  const summary = `${formatInteger(contributions.total)} contribuições de ${formatLongDate(contributions.start)} a ${formatLongDate(contributions.end)}`

  function showTooltip(text: string, element: SVGRectElement) {
    const rect = element.getBoundingClientRect()
    const above = rect.top > 80
    setTooltip({
      left: Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130),
      top: above ? rect.top - 8 : rect.bottom + 8,
      above,
      text,
    })
  }

  const handleShow = (
    event: MouseEvent<SVGRectElement> | FocusEvent<SVGRectElement>,
    text: string,
  ) => showTooltip(text, event.currentTarget)

  return (
    <section className="card heatmap-card" aria-labelledby="heatmap-title">
      <h2 className="heatmap-title" id="heatmap-title">
        {formatInteger(contributions.total)} contribuições no último ano
      </h2>
      <div className="heatmap-scroll">
        <svg
          className="heatmap"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label={summary}
        >
          <title>{summary}</title>
          {monthLabels.map((label) => (
            <text
              key={`${label.index}-${label.label}`}
              className="heatmap-month"
              x={LEFT + label.index * PITCH}
              y={12}
              aria-hidden="true"
            >
              {label.label}
            </text>
          ))}
          {ROW_LABELS.map(({ row, label }) => (
            <text
              key={label}
              className="heatmap-day"
              x={LEFT - 6}
              y={TOP + row * PITCH + 9}
              textAnchor="end"
              aria-hidden="true"
            >
              {label}
            </text>
          ))}
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              if (!day) return null
              const label = `${formatLongDate(day.date)}: ${formatContributionLabel(day.count)}`
              return (
                <rect
                  key={day.date}
                  className={`heat-cell level-${day.level}`}
                  x={LEFT + weekIndex * PITCH}
                  y={TOP + dayIndex * PITCH}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  onMouseEnter={(event) => handleShow(event, label)}
                  onMouseLeave={() => setTooltip(null)}
                  onFocus={(event) => handleShow(event, label)}
                  onBlur={() => setTooltip(null)}
                />
              )
            }),
          )}
        </svg>
      </div>
      {tooltip && (
        <div
          className={`heatmap-tooltip ${tooltip.above ? 'above' : 'below'}`}
          style={{ left: tooltip.left, top: tooltip.top }}
          role="tooltip"
          aria-hidden="true"
        >
          {tooltip.text}
        </div>
      )}
      <div className="heatmap-footer">
        <p className="heatmap-note">Inclui contribuições privadas que o perfil exibe no GitHub.</p>
        <div className="heatmap-legend" role="group" aria-label="Intensidade de contribuições">
          <span>Menos</span>
          {LEVELS.map((level) => (
            <span key={level} className={`heat-swatch level-${level}`} aria-hidden="true" />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </section>
  )
}
