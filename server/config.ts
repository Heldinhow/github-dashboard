import { readFileSync } from 'node:fs'
import { isValidLogin } from '../shared/state.ts'
import type { ProfileFilters, PublicProfile } from '../shared/types.ts'

export type ConfigErrorCode = 'CONFIG_MISSING' | 'CONFIG_INVALID'

export class ConfigError extends Error {
  readonly code: ConfigErrorCode

  constructor(code: ConfigErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export interface ProfileConfig {
  name: string
  user: string
  tokenEnv: string
  apiUrl: string
  graphqlUrl: string
  orgs: string[]
  repos: string[]
  timeZone: string
}

export interface AppConfig {
  defaultProfile: string
  profiles: ProfileConfig[]
}

const DEFAULT_API_URL = 'https://api.github.com'
const DEFAULT_TIME_ZONE = 'UTC'
const DEFAULT_PROFILES_FILE = './profiles.local.json'
const TOKEN_ENV_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/
const PROFILE_NAME_PATTERN = /^[^\u0000-\u001f|]{1,60}$/
const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

type Env = Record<string, string | undefined>
type ReadFile = (path: string) => string

const invalid = (message: string) => new ConfigError('CONFIG_INVALID', message)

const optionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw invalid('Campo deve ser texto.')
  return value.trim() || undefined
}

function normalizeName(value: unknown, source: string): string {
  const name = optionalString(value)
  if (!name || !PROFILE_NAME_PATTERN.test(name)) {
    throw invalid(`${source}: nome do perfil inválido. Use de 1 a 60 caracteres, sem "|".`)
  }
  return name
}

function normalizeUser(value: unknown, source: string): string {
  const user = optionalString(value)
  if (!user || !isValidLogin(user)) {
    throw invalid(`${source}: usuário do GitHub inválido.`)
  }
  return user
}

function normalizeTokenEnv(value: unknown, source: string): string {
  const tokenEnv = optionalString(value)
  if (!tokenEnv || !TOKEN_ENV_PATTERN.test(tokenEnv)) {
    throw invalid(`${source}: tokenEnv inválido. Informe o nome de uma variável de ambiente.`)
  }
  return tokenEnv
}

export function normalizeUrl(value: string, field: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw invalid(`${field} inválida. Informe uma URL absoluta e reinicie o servidor.`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw invalid(`${field} inválida. Use http ou https.`)
  }
  if (url.username || url.password || url.search || url.hash) {
    throw invalid(`${field} inválida. Remova credenciais, query e fragmento.`)
  }
  const path = url.pathname.replace(/\/+$/, '')
  return `${url.origin}${path}`
}

export function deriveGraphqlUrl(apiUrl: string): string {
  const normalized = normalizeUrl(apiUrl, 'URL da API do GitHub')
  const url = new URL(normalized)
  const path = url.pathname.replace(/\/+$/, '')

  if (url.hostname.toLowerCase() === 'api.github.com' && path === '') {
    return `${url.origin}/graphql`
  }
  if (path === '' || path === '/api/v3') {
    return `${url.origin}/api/graphql`
  }
  throw invalid(
    'URL da API do GitHub não reconhecida. Informe GITHUB_GRAPHQL_URL ou graphqlUrl do perfil.',
  )
}

function normalizeTimeZone(value: unknown, source: string): string {
  const timeZone = optionalString(value) ?? DEFAULT_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0)
  } catch {
    throw invalid(`${source}: fuso inválido. Use um fuso IANA, como America/Sao_Paulo.`)
  }
  return timeZone
}

function validateOrgs(items: string[], source: string): string[] {
  for (const org of items) {
    if (!isValidLogin(org)) throw invalid(`${source}: organização inválida "${org}".`)
  }
  return items
}

function validateRepos(items: string[], source: string): string[] {
  for (const repo of items) {
    const parts = repo.split('/')
    const [owner, name] = parts
    if (
      parts.length !== 2 ||
      !owner ||
      !name ||
      !isValidLogin(owner) ||
      name === '.' ||
      name === '..' ||
      !REPO_NAME_PATTERN.test(name)
    ) {
      throw invalid(`${source}: repositório inválido "${repo}". Use owner/repo.`)
    }
  }
  return items
}

function envList(value: string | undefined, source: string): string[] {
  if (value === undefined || value.trim() === '') return []
  const items = value.split(',').map((item) => item.trim())
  if (items.some((item) => item === '')) throw invalid(`${source}: lista com item vazio.`)
  return items
}

function fileList(value: unknown, source: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw invalid(`${source}: use uma lista de textos.`)
  }
  const items = value.map((item) => (item as string).trim())
  if (items.some((item) => item === '')) throw invalid(`${source}: lista com item vazio.`)
  return items
}

function readProfilesFile(file: string, readFile: ReadFile): string | undefined {
  try {
    return readFile(file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw invalid(`Não foi possível ler o arquivo de perfis "${file}". Reinicie após corrigir.`)
  }
}

function parseProfile(raw: unknown, file: string, names: Set<string>): ProfileConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw invalid(`Arquivo de perfis "${file}" inválido: cada perfil deve ser um objeto.`)
  }
  const record = raw as Record<string, unknown>
  const name = normalizeName(record.name, `Arquivo de perfis "${file}"`)
  const source = `Perfil "${name}"`
  if (names.has(name)) throw invalid(`${source}: nome duplicado.`)
  if ('token' in record) {
    throw invalid(`${source}: o arquivo não pode conter token; use tokenEnv.`)
  }

  const user = normalizeUser(record.user, source)
  const tokenEnv = normalizeTokenEnv(record.tokenEnv, source)
  const apiUrl = normalizeUrl(optionalString(record.apiUrl) ?? DEFAULT_API_URL, `${source}: apiUrl`)
  const explicitGraphql = optionalString(record.graphqlUrl)
  const graphqlUrl = explicitGraphql
    ? normalizeUrl(explicitGraphql, `${source}: graphqlUrl`)
    : deriveGraphqlUrl(apiUrl)
  const orgs = validateOrgs(fileList(record.orgs, `${source}: orgs`), `${source}: orgs`)
  const repos = validateRepos(fileList(record.repos, `${source}: repos`), `${source}: repos`)
  const timeZone = normalizeTimeZone(record.timeZone, source)

  names.add(name)
  return { name, user, tokenEnv, apiUrl, graphqlUrl, orgs, repos, timeZone }
}

function parseProfilesFile(content: string, file: string, names: Set<string>): ProfileConfig[] {
  let root: unknown
  try {
    root = JSON.parse(content)
  } catch {
    throw invalid(`Arquivo de perfis "${file}" inválido: JSON malformado. Reinicie após corrigir.`)
  }
  if (typeof root !== 'object' || root === null || !Array.isArray((root as { profiles?: unknown }).profiles)) {
    throw invalid(`Arquivo de perfis "${file}" inválido: esperava { "profiles": [...] }.`)
  }
  return (root as { profiles: unknown[] }).profiles.map((profile) => parseProfile(profile, file, names))
}

export function loadConfig(env: Env = process.env, readFile: ReadFile = (path) => readFileSync(path, 'utf8')): AppConfig {
  const user = optionalString(env.GITHUB_USER)
  if (!user) {
    throw new ConfigError(
      'CONFIG_MISSING',
      'GITHUB_USER não configurado. Defina o usuário no .env (ou no ambiente) e reinicie o servidor.',
    )
  }
  const name = normalizeName(env.GITHUB_PROFILE_NAME ?? 'default', 'GITHUB_PROFILE_NAME')
  const defaultProfile: ProfileConfig = {
    name,
    user: normalizeUser(user, 'GITHUB_USER'),
    tokenEnv: 'GITHUB_TOKEN',
    apiUrl: normalizeUrl(optionalString(env.GITHUB_API_URL) ?? DEFAULT_API_URL, 'GITHUB_API_URL'),
    graphqlUrl: '',
    orgs: validateOrgs(envList(env.GITHUB_ORGS, 'GITHUB_ORGS'), 'GITHUB_ORGS'),
    repos: validateRepos(envList(env.GITHUB_REPOS, 'GITHUB_REPOS'), 'GITHUB_REPOS'),
    timeZone: normalizeTimeZone(env.GITHUB_TIME_ZONE, 'GITHUB_TIME_ZONE'),
  }
  const explicitGraphql = optionalString(env.GITHUB_GRAPHQL_URL)
  defaultProfile.graphqlUrl = explicitGraphql
    ? normalizeUrl(explicitGraphql, 'GITHUB_GRAPHQL_URL')
    : deriveGraphqlUrl(defaultProfile.apiUrl)

  const file = optionalString(env.GITHUB_PROFILES_FILE) ?? DEFAULT_PROFILES_FILE
  const content = readProfilesFile(file, readFile)
  const names = new Set([defaultProfile.name])
  const profiles = content === undefined ? [defaultProfile] : [defaultProfile, ...parseProfilesFile(content, file, names)]

  return { defaultProfile: defaultProfile.name, profiles }
}

export function publicProfiles(config: AppConfig): PublicProfile[] {
  return config.profiles.map(({ name, user }) => ({ name, user }))
}

export function effectiveFilters(profile: ProfileConfig): Pick<ProfileFilters, 'orgs' | 'repos'> {
  return profile.repos.length > 0
    ? { orgs: [], repos: profile.repos }
    : { orgs: profile.orgs, repos: [] }
}
