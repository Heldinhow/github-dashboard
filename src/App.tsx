import { useEffect, useState } from 'react'
import type { ActivityResponse } from '../shared/types.ts'
import { ApiClientError, fetchActivity } from './api.ts'
import { MonthlyBarChart } from './components/MonthlyBarChart.tsx'
import { StatCards } from './components/StatCards.tsx'
import { formatTime } from './format.ts'

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: ActivityResponse }
  | { status: 'error'; message: string; retryAt?: string }

function LoadingView() {
  return (
    <>
      <div role="status" className="sr-only">
        Carregando atividade…
      </div>
      <div aria-hidden="true">
        <div className="stats">
          {[0, 1, 2].map((index) => (
            <div className="skeleton skeleton-stat" key={index} />
          ))}
        </div>
        <div className="skeleton skeleton-chart" />
      </div>
    </>
  )
}

function ErrorView({
  message,
  retryAt,
  onRetry,
}: {
  message: string
  retryAt?: string
  onRetry: () => void
}) {
  return (
    <div className="card error" role="alert">
      <p>
        {message}
        {retryAt ? ` Tente novamente depois de ${formatTime(retryAt)}.` : ''}
      </p>
      <button type="button" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  )
}

function ActivityView({ data }: { data: ActivityResponse }) {
  return (
    <>
      <StatCards stats={data.stats} />
      <div className="card chart-card">
        <MonthlyBarChart months={data.months} />
      </div>
      <p className="updated">Atualizado às {formatTime(data.fetchedAt)}</p>
    </>
  )
}

export function App() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    fetchActivity()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiClientError) {
          setState({ status: 'error', message: error.message, retryAt: error.retryAt })
          return
        }
        setState({
          status: 'error',
          message: 'Falha ao carregar a atividade. Tente novamente.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const user = state.status === 'ready' ? state.data.user : 'usuario-dev'

  return (
    <div className="page">
      <header className="header">
        <h1>Atividade no GitHub</h1>
        <p className="subtitle">PRs mergeados de @{user}</p>
      </header>
      <main>
        {state.status === 'loading' && <LoadingView />}
        {state.status === 'error' && (
          <ErrorView
            message={state.message}
            retryAt={state.retryAt}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        )}
        {state.status === 'ready' && <ActivityView data={state.data} />}
      </main>
    </div>
  )
}
