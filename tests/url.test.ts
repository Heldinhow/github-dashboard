import { describe, expect, it } from 'vitest'
import { deriveGraphqlUrl } from '../server/config.ts'

describe('deriveGraphqlUrl', () => {
  it('deriva /graphql do GitHub público', () => {
    expect(deriveGraphqlUrl('https://api.github.com')).toBe('https://api.github.com/graphql')
    expect(deriveGraphqlUrl('https://api.github.com/')).toBe('https://api.github.com/graphql')
  })

  it('troca /api/v3 por /api/graphql no GitHub Enterprise', () => {
    expect(deriveGraphqlUrl('https://ghe.exemplo/api/v3')).toBe('https://ghe.exemplo/api/graphql')
    expect(deriveGraphqlUrl('https://ghe.exemplo/api/v3/')).toBe('https://ghe.exemplo/api/graphql')
  })

  it('deriva /api/graphql da raiz do GitHub Enterprise', () => {
    expect(deriveGraphqlUrl('https://ghe.exemplo')).toBe('https://ghe.exemplo/api/graphql')
    expect(deriveGraphqlUrl('https://ghe.exemplo/')).toBe('https://ghe.exemplo/api/graphql')
    expect(deriveGraphqlUrl('http://ghe.local:8080/')).toBe('http://ghe.local:8080/api/graphql')
  })

  it('rejeita URL inválida ou caminho não reconhecido sem GraphQL explícito', () => {
    expect(() => deriveGraphqlUrl('nao-e-url')).toThrow(/inválida/i)
    expect(() => deriveGraphqlUrl('ftp://ghe.exemplo')).toThrow(/inválida/i)
    expect(() => deriveGraphqlUrl('https://ghe.exemplo/instancia')).toThrow(/GraphQL/i)
  })
})
