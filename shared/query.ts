import type { ContributionWindow } from './contributions.ts'
import type { MonthWindow } from './months.ts'
import type { ProfileFilters } from './types.ts'

export function monthAlias(key: string): string {
  return `m${key.replace('-', '_')}`
}

export function buildActivityQuery(
  user: string,
  windows: MonthWindow[],
  contributions: ContributionWindow,
  publicOnly = false,
  filters: Pick<ProfileFilters, 'orgs' | 'repos'> = { orgs: [], repos: [] },
): string {
  const context =
    filters.repos.length > 0
      ? filters.repos.map((repo) => ` repo:${repo}`).join('')
      : filters.orgs.map((org) => ` org:${org}`).join('')
  const searches = windows.map((window) => {
    const alias = monthAlias(window.key)
    const privacy = publicOnly ? ' is:public' : ''
    const search = `is:pr is:merged${privacy} author:${user}${context} merged:${window.start}..${window.end}`
    return `  ${alias}: search(query: "${search}", type: ISSUE, first: 1) { issueCount }`
  })
  return [
    'query Activity($user: String!, $from: DateTime!, $to: DateTime!) {',
    '  user(login: $user) {',
    '    login',
    '    contributionsCollection(from: $from, to: $to) {',
    '      contributionCalendar {',
    '        totalContributions',
    '        weeks { contributionDays { date contributionCount } }',
    '      }',
    '    }',
    '  }',
    ...searches,
    '}',
  ].join('\n')
}

export function readMonthlyCounts(data: Record<string, unknown>, windows: MonthWindow[]): number[] {
  return windows.map((window) => {
    const alias = monthAlias(window.key)
    const node = data[alias] as { issueCount?: unknown } | null | undefined
    if (typeof node?.issueCount !== 'number' || !Number.isInteger(node.issueCount)) {
      throw new Error(`Alias ${alias} ausente na resposta do GitHub.`)
    }
    return node.issueCount
  })
}
