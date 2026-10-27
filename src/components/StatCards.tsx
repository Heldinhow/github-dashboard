import type { ActivityStats } from '../../shared/types.ts'
import { formatAverage, formatInteger } from '../format.ts'

export function StatCards({ stats }: { stats: ActivityStats }) {
  return (
    <>
      <section className="stats" aria-label="Resumo do período">
        <article className="card stat">
          <h2>Total no período</h2>
          <p className="stat-value">{formatInteger(stats.total)}</p>
          <p className="stat-note">12 meses</p>
        </article>
        <article className="card stat">
          <h2>Média por mês</h2>
          <p className="stat-value">{formatAverage(stats.average)}</p>
          <p className="stat-note">11 meses fechados</p>
        </article>
        <article className="card stat">
          <h2>Recorde mensal</h2>
          <p className="stat-value">{stats.record ? formatInteger(stats.record.count) : '—'}</p>
          <p className="stat-note">{stats.record?.label ?? 'Sem recorde'}</p>
        </article>
      </section>
      <p className="legend">Média e recorde usam os 11 meses fechados; o total inclui o mês parcial.</p>
    </>
  )
}
