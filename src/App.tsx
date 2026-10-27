import { useEffect, useState, type FormEvent } from 'react'
import {
  activitySearch,
  isValidLogin,
  readActivityState,
  type ActivityRequest,
} from '../shared/state.ts'
import type { ActivityResponse } from '../shared/types.ts'
import { ApiClientError, fetchActivity } from './api.ts'
import { Heatmap } from './components/Heatmap.tsx'
import { MonthlyBarChart } from './components/MonthlyBarChart.tsx'
import { StatCards } from './components/StatCards.tsx'
import { formatTime } from './format.ts'

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: ActivityResponse }
  | { status: 'error'; message: string; retryAt?: string }

const initialRequest = readActivityState(window.location.search)

function replaceUrl(request: ActivityRequest) {
  window.history.replaceState(null, '', activitySearch(request))
}

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
        <div className="skeleton skeleton-heatmap" />
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
      <Heatmap contributions={data.contributions} />
      <p className="updated">Atualizado às {formatTime(data.fetchedAt)}</p>
    </>
  )
}

export function App() {
  const [request, setRequest] = useState<ActivityRequest>(initialRequest)
  const [input, setInput] = useState(initialRequest.user)
  const [inputError, setInputError] = useState<string | null>(null)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    replaceUrl(request)
    setState({ status: 'loading' })

    fetchActivity(request)
      .then((data) => {
        if (cancelled) return
        setState({ status: 'ready', data })
        setInput(data.user)
        replaceUrl({ user: data.user, private: request.private })
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
  }, [request, attempt])

  const loading = state.status === 'loading'
  const data = state.status === 'ready' ? state.data : null
  const displayUser = data?.user ?? request.user
  const privateAllowed = data ? data.canIncludePrivate : true
  const privateChecked = privateAllowed && request.private === 1
  const showPrivateHint = data !== null && !data.canIncludePrivate

  function applyUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const user = input.trim()
    if (!isValidLogin(user)) {
      setInputError('Informe um login válido do GitHub.')
      return
    }
    setInputError(null)
    setRequest({ user, private: request.private })
  }

  function changePrivate(checked: boolean) {
    setRequest({ user: data?.user ?? request.user, private: checked ? 1 : 0 })
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Atividade no GitHub</h1>
          <p className="subtitle">PRs mergeados e contribuições de @{displayUser}</p>
        </div>
        <div className="controls">
          <form className="user-form" onSubmit={applyUser} noValidate>
            <label htmlFor="user-input">Usuário do GitHub</label>
            <div className="user-row">
              <input
                id="user-input"
                type="text"
                value={input}
                placeholder="usuario-dev"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                aria-invalid={inputError ? true : undefined}
                aria-describedby={inputError ? 'user-error' : undefined}
                onChange={(event) => {
                  setInput(event.target.value)
                  if (inputError) setInputError(null)
                }}
              />
              <button type="submit" disabled={loading}>
                Aplicar
              </button>
            </div>
            <p id="user-error" className="field-error" aria-live="polite">
              {inputError}
            </p>
          </form>
          <div className="switch-field">
            <input
              id="private-toggle"
              type="checkbox"
              checked={privateChecked}
              disabled={loading || !privateAllowed}
              aria-describedby={showPrivateHint ? 'private-hint' : undefined}
              onChange={(event) => changePrivate(event.target.checked)}
            />
            <label htmlFor="private-toggle">Incluir repositórios privados</label>
            {showPrivateHint && (
              <p id="private-hint" className="switch-hint">
                Disponível apenas para o dono do token.
              </p>
            )}
          </div>
        </div>
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
