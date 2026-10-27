import { describe, expect, it } from 'vitest'
import { buildContributionWindow } from '../shared/contributions.ts'
import { buildMonthWindows } from '../shared/months.ts'
import { buildActivityQuery, monthAlias, readMonthlyCounts } from '../shared/query.ts'

const windows = buildMonthWindows({ year: 2026, month: 10, day: 26 })
const contributions = buildContributionWindow({ year: 2026, month: 10, day: 26 })

describe('buildActivityQuery', () => {
  it('cria um alias de busca por mês', () => {
    const query = buildActivityQuery('octocat', windows, contributions)

    expect(query.match(/search\(/g)).toHaveLength(12)
    expect(query.match(/first: 1/g)).toHaveLength(12)
    expect(query).toContain('user(login: $user)')
    for (const window of windows) {
      expect(query).toContain(`${monthAlias(window.key)}: search(`)
    }
  })

  it('inclui a coleção de contribuições com from/to', () => {
    const query = buildActivityQuery('octocat', windows, contributions)

    expect(query).toContain('query Activity($user: String!, $from: DateTime!, $to: DateTime!)')
    expect(query).toContain('contributionsCollection(from: $from, to: $to)')
    expect(query).toContain('weeks { contributionDays { date contributionCount } }')
  })

  it('monta a busca com autor e intervalo do mês', () => {
    const query = buildActivityQuery('octocat', windows, contributions)

    expect(query).toContain(
      'm2025_11: search(query: "is:pr is:merged author:octocat merged:2025-11-01..2025-11-30", type: ISSUE, first: 1) { issueCount }',
    )
    expect(query).toContain(
      'm2026_10: search(query: "is:pr is:merged author:octocat merged:2026-10-01..2026-10-26", type: ISSUE, first: 1) { issueCount }',
    )
    expect(query.match(/is:pr is:merged/g)).toHaveLength(12)
  })

  it('sem o filtro público, inclui PRs privados', () => {
    expect(buildActivityQuery('octocat', windows, contributions)).not.toContain('is:public')
  })

  it('com o filtro público, restringe as buscas a repositórios públicos', () => {
    const query = buildActivityQuery('octocat', windows, contributions, true)

    expect(query.match(/is:public/g)).toHaveLength(12)
    expect(query).toContain(
      'm2025_11: search(query: "is:pr is:merged is:public author:octocat merged:2025-11-01..2025-11-30", type: ISSUE, first: 1) { issueCount }',
    )
  })
})

describe('readMonthlyCounts', () => {
  it('lê as contagens pelo nome do alias, fora de ordem', () => {
    const data: Record<string, unknown> = {
      m2026_10: { issueCount: 26 },
      rateLimit: { remaining: 10 },
      m2025_11: { issueCount: 7 },
    }
    for (const window of windows.slice(1, 11)) {
      data[monthAlias(window.key)] = { issueCount: window.key.endsWith('-03') ? 117 : 20 }
    }

    const counts = readMonthlyCounts(data, windows)

    expect(counts).toHaveLength(12)
    expect(counts[0]).toBe(7)
    expect(counts[4]).toBe(117)
    expect(counts[11]).toBe(26)
  })

  it('falha quando um alias está ausente', () => {
    expect(() => readMonthlyCounts({}, windows)).toThrow(/m2025_11/)
  })
})

describe('filtros de contexto nas buscas de PR', () => {
  it('adiciona org: a todas as buscas', () => {
    const query = buildActivityQuery('octocat', windows, contributions, false, {
      orgs: ['acme'],
      repos: [],
    })

    expect(query.match(/author:octocat org:acme merged:/g)).toHaveLength(12)
    expect(query).not.toContain('repo:')
  })

  it('adiciona repo: a todas as buscas e não altera a coleção de contribuições', () => {
    const query = buildActivityQuery('octocat', windows, contributions, false, {
      orgs: [],
      repos: ['acme/app', 'acme/lib'],
    })

    expect(query.match(/author:octocat repo:acme\/app repo:acme\/lib merged:/g)).toHaveLength(12)
    expect(query.match(/contributionsCollection/g)).toHaveLength(1)
    expect(query).not.toContain('org:')
  })

  it('quando ambos existem, só repos entram na busca', () => {
    const query = buildActivityQuery('octocat', windows, contributions, true, {
      orgs: ['acme'],
      repos: ['acme/app'],
    })

    expect(query.match(/is:public author:octocat repo:acme\/app merged:/g)).toHaveLength(12)
    expect(query).not.toContain('org:acme')
  })
})
