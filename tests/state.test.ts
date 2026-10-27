import { describe, expect, it } from 'vitest'
import {
  activityCacheKey,
  activitySearch,
  canIncludePrivate,
  includePrivate,
  isValidLogin,
  parsePrivate,
  readActivityState,
} from '../shared/state.ts'

describe('parsePrivate', () => {
  it('aceita apenas 0 e 1', () => {
    expect(parsePrivate('0')).toBe(0)
    expect(parsePrivate('1')).toBe(1)
    expect(parsePrivate('2')).toBeNull()
    expect(parsePrivate('')).toBeNull()
    expect(parsePrivate(undefined)).toBeNull()
    expect(parsePrivate(['1'])).toBeNull()
  })
})

describe('readActivityState', () => {
  it('usa usuario-dev e privado ligado por padrão', () => {
    expect(readActivityState('')).toEqual({ user: 'usuario-dev', private: 1 })
    expect(readActivityState('?')).toEqual({ user: 'usuario-dev', private: 1 })
  })

  it('lê user e private da URL', () => {
    expect(readActivityState('?user=octocat&private=0')).toEqual({ user: 'octocat', private: 0 })
  })

  it('ignora private fora de 0/1 e user vazio', () => {
    expect(readActivityState('?user=&private=2')).toEqual({ user: 'usuario-dev', private: 1 })
  })

  it('serializa o estado para a URL', () => {
    expect(activitySearch({ user: 'usuario-dev', private: 1 })).toBe('?user=usuario-dev&private=1')
    expect(activitySearch({ user: 'octo cat', private: 0 })).toBe('?user=octo+cat&private=0')
  })
})

describe('canIncludePrivate', () => {
  it('é verdadeiro para o viewer, sem diferenciar maiúsculas', () => {
    expect(canIncludePrivate('usuario-dev', 'usuario-dev')).toBe(true)
  })

  it('é falso para outro usuário', () => {
    expect(canIncludePrivate('octocat', 'usuario-dev')).toBe(false)
  })
})

describe('includePrivate', () => {
  it('só é efetivo com private=1 e permissão', () => {
    expect(includePrivate(1, true)).toBe(true)
    expect(includePrivate(0, true)).toBe(false)
    expect(includePrivate(1, false)).toBe(false)
  })
})

describe('activityCacheKey', () => {
  it('separa usuário canônico, modo efetivo e dia local', () => {
    const today = { year: 2026, month: 10, day: 26 }

    expect(activityCacheKey('usuario-dev', true, today)).toBe('usuario-dev|1|2026-10-26')
    expect(activityCacheKey('usuario-dev', false, today)).toBe('usuario-dev|0|2026-10-26')
  })
})

describe('isValidLogin', () => {
  it('aceita o formato de login do GitHub', () => {
    expect(isValidLogin('usuario-dev')).toBe(true)
    expect(isValidLogin('a')).toBe(true)
    expect(isValidLogin('a'.repeat(39))).toBe(true)
  })

  it('rejeita vazio e formatos fora do padrão', () => {
    expect(isValidLogin('')).toBe(false)
    expect(isValidLogin('-usuario-dev')).toBe(false)
    expect(isValidLogin('usuario-dev-')).toBe(false)
    expect(isValidLogin('held_inhow')).toBe(false)
    expect(isValidLogin('a'.repeat(40))).toBe(false)
  })
})
