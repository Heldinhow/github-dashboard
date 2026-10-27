import { describe, expect, it } from 'vitest'
import {
  ConfigError,
  effectiveFilters,
  loadConfig,
  publicProfiles,
  type AppConfig,
} from '../server/config.ts'

const baseEnv = {
  GITHUB_USER: 'octocat',
  GITHUB_TOKEN: 'token-de-teste',
}

const missingFile = () => {
  throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
}

function configFrom(file: string | undefined, env: Record<string, string | undefined> = baseEnv): AppConfig {
  return loadConfig(env, () => {
    if (file === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
    return file
  })
}

function expectCode(run: () => unknown, code: 'CONFIG_MISSING' | 'CONFIG_INVALID') {
  try {
    run()
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError)
    expect((error as ConfigError).code).toBe(code)
    return
  }
  throw new Error(`Esperava ConfigError ${code}`)
}

describe('loadConfig', () => {
  it('monta o perfil padrão a partir do ambiente', () => {
    const config = configFrom(undefined, {
      ...baseEnv,
      GITHUB_PROFILE_NAME: 'Pessoal',
      GITHUB_API_URL: 'https://api.github.com/',
      GITHUB_ORGS: 'acme, outra-org',
      GITHUB_TIME_ZONE: 'America/Sao_Paulo',
    })

    expect(config.defaultProfile).toBe('Pessoal')
    expect(config.profiles).toEqual([
      {
        name: 'Pessoal',
        user: 'octocat',
        tokenEnv: 'GITHUB_TOKEN',
        apiUrl: 'https://api.github.com',
        graphqlUrl: 'https://api.github.com/graphql',
        orgs: ['acme', 'outra-org'],
        repos: [],
        timeZone: 'America/Sao_Paulo',
      },
    ])
  })

  it('usa os padrões da spec quando o ambiente não informa os opcionais', () => {
    const profile = configFrom(undefined).profiles[0]!

    expect(profile).toMatchObject({
      name: 'default',
      apiUrl: 'https://api.github.com',
      graphqlUrl: 'https://api.github.com/graphql',
      orgs: [],
      repos: [],
      timeZone: 'UTC',
    })
  })

  it('aceita GITHUB_GRAPHQL_URL explícita e normaliza barras finais', () => {
    const profile = configFrom(undefined, {
      ...baseEnv,
      GITHUB_API_URL: 'https://ghe.exemplo/api/v3',
      GITHUB_GRAPHQL_URL: 'https://ghe.exemplo/api/graphql/',
    }).profiles[0]!

    expect(profile.graphqlUrl).toBe('https://ghe.exemplo/api/graphql')
  })

  it('falha com CONFIG_MISSING sem GITHUB_USER', () => {
    expectCode(() => configFrom(undefined, {}), 'CONFIG_MISSING')
    expectCode(() => configFrom(undefined, { GITHUB_USER: '   ' }), 'CONFIG_MISSING')
  })

  it('carrega perfis adicionais do arquivo local', () => {
    const file = JSON.stringify({
      profiles: [
        {
          name: 'Trabalho',
          user: 'octo-work',
          tokenEnv: 'WORK_GITHUB_TOKEN',
          apiUrl: 'https://ghe.exemplo/api/v3/',
          orgs: ['minha-org'],
          repos: [],
          timeZone: 'America/Sao_Paulo',
        },
      ],
    })
    let requestedPath = ''
    const config = loadConfig({ ...baseEnv, GITHUB_PROFILES_FILE: '/tmp/perfis.json' }, (path) => {
      requestedPath = path
      return file
    })

    expect(requestedPath).toBe('/tmp/perfis.json')
    expect(config.profiles).toHaveLength(2)
    expect(config.profiles[1]).toMatchObject({
      name: 'Trabalho',
      user: 'octo-work',
      tokenEnv: 'WORK_GITHUB_TOKEN',
      apiUrl: 'https://ghe.exemplo/api/v3',
      graphqlUrl: 'https://ghe.exemplo/api/graphql',
      orgs: ['minha-org'],
      repos: [],
      timeZone: 'America/Sao_Paulo',
    })
  })

  it('rejeita JSON inválido', () => {
    expectCode(() => configFrom('{'), 'CONFIG_INVALID')
    expectCode(() => configFrom('{"profiles": {}}'), 'CONFIG_INVALID')
  })

  it('rejeita nome duplicado entre padrão e adicionais', () => {
    const file = JSON.stringify({
      profiles: [{ name: 'default', user: 'outro', tokenEnv: 'OUTRO_TOKEN' }],
    })

    expectCode(() => configFrom(file), 'CONFIG_INVALID')
  })

  it('rejeita campos obrigatórios ausentes ou inválidos no perfil adicional', () => {
    const cases = [
      { name: 'SemUser', tokenEnv: 'WORK_TOKEN' },
      { name: 'SemTokenEnv', user: 'octo-work' },
      { name: '', user: 'octo-work', tokenEnv: 'WORK_TOKEN' },
      { name: 'UserInvalido', user: '-octo', tokenEnv: 'WORK_TOKEN' },
      { name: 'TokenEnvInvalido', user: 'octo-work', tokenEnv: 'WORK-TOKEN' },
    ]

    for (const profile of cases) {
      const file = JSON.stringify({ profiles: [profile] })
      expectCode(() => configFrom(file), 'CONFIG_INVALID')
    }
  })

  it('rejeita valor de token no arquivo de perfis', () => {
    const file = JSON.stringify({
      profiles: [
        { name: 'Trabalho', user: 'octo-work', tokenEnv: 'WORK_TOKEN', token: 'segredo' },
      ],
    })

    expectCode(() => configFrom(file), 'CONFIG_INVALID')
  })

  it('rejeita fuso, filtro e URL inválidos', () => {
    expectCode(() => configFrom(undefined, { ...baseEnv, GITHUB_TIME_ZONE: 'Marte/Base' }), 'CONFIG_INVALID')
    expectCode(() => configFrom(undefined, { ...baseEnv, GITHUB_ORGS: 'acme,' }), 'CONFIG_INVALID')
    expectCode(() => configFrom(undefined, { ...baseEnv, GITHUB_REPOS: 'repo-sem-owner' }), 'CONFIG_INVALID')
    expectCode(() => configFrom(undefined, { ...baseEnv, GITHUB_API_URL: 'nao-e-url' }), 'CONFIG_INVALID')
    expectCode(() => configFrom(undefined, { ...baseEnv, GITHUB_API_URL: 'ftp://ghe.exemplo' }), 'CONFIG_INVALID')
  })

  it('aceita lista de repositórios no arquivo de perfis', () => {
    const file = JSON.stringify({
      profiles: [
        {
          name: 'Projetos',
          user: 'octo-work',
          tokenEnv: 'WORK_TOKEN',
          repos: ['acme/app', 'acme/lib.js'],
        },
      ],
    })

    expect(configFrom(file).profiles[1]!.repos).toEqual(['acme/app', 'acme/lib.js'])
  })

  it('aceita arquivo ausente e mantém só o perfil padrão', () => {
    expect(configFrom(undefined).profiles).toHaveLength(1)
  })
})

describe('publicProfiles', () => {
  it('devolve só nome e usuário, sem tokens ou URLs', () => {
    const file = JSON.stringify({
      profiles: [{ name: 'Trabalho', user: 'octo-work', tokenEnv: 'WORK_TOKEN' }],
    })
    const config = configFrom(file)

    expect(publicProfiles(config)).toEqual([
      { name: 'default', user: 'octocat' },
      { name: 'Trabalho', user: 'octo-work' },
    ])
  })
})

describe('effectiveFilters', () => {
  it('usa orgs quando não há repos', () => {
    expect(
      effectiveFilters({
        name: 'a',
        user: 'octocat',
        tokenEnv: 'T',
        apiUrl: 'https://api.github.com',
        graphqlUrl: 'https://api.github.com/graphql',
        orgs: ['acme'],
        repos: [],
        timeZone: 'UTC',
      }),
    ).toEqual({ orgs: ['acme'], repos: [] })
  })

  it('faz repos vencerem orgs', () => {
    expect(
      effectiveFilters({
        name: 'a',
        user: 'octocat',
        tokenEnv: 'T',
        apiUrl: 'https://api.github.com',
        graphqlUrl: 'https://api.github.com/graphql',
        orgs: ['acme'],
        repos: ['acme/app'],
        timeZone: 'UTC',
      }),
    ).toEqual({ orgs: [], repos: ['acme/app'] })
  })
})
