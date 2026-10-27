import type { MonthWindow } from './months.ts'

export function monthAlias(key: string): string {
  return `m${key.replace('-', '_')}`
}

export function buildActivityQuery(user: string, windows: MonthWindow[]): string {
  const searches = windows.map((window) => {
    const alias = monthAlias(window.key)
    const search = `is:pr is:merged author:${user} merged:${window.start}..${window.end}`
    return `  ${alias}: search(query: "${search}", type: ISSUE, first: 1) { issueCount }`
  })
  return ['query Activity($user: String!) {', '  user(login: $user) { login }', ...searches, '}'].join('\n')
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
