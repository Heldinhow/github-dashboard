import { existsSync } from 'node:fs'
import path from 'node:path'
import express from 'express'
import { DEFAULT_PRIVATE, parsePrivate } from '../shared/state.ts'
import { getActivity } from './activity.ts'
import { ConfigError, loadConfig, type AppConfig } from './config.ts'
import { ApiError, errorResponse } from './errors.ts'

try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // Sem .env local: o servidor sobe e a API responde CONFIG_MISSING ou TOKEN_MISSING.
}

let config: AppConfig | undefined
let configError: ConfigError | undefined
try {
  config = loadConfig()
} catch (error) {
  if (error instanceof ConfigError) {
    configError = error
  } else {
    throw error
  }
}

const app = express()
app.disable('x-powered-by')

function queryString(value: unknown, code: string, message: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new ApiError(400, code, message)
  return value
}

app.get('/api/activity', async (req, res) => {
  try {
    if (!config) {
      throw new ApiError(
        503,
        configError?.code ?? 'CONFIG_INVALID',
        configError?.message ?? 'Configuração de perfis inválida. Reinicie após corrigir.',
      )
    }

    const requestedProfile = queryString(
      req.query.profile,
      'UNKNOWN_PROFILE',
      'Parâmetro profile inválido.',
    )
    const requestedUser = queryString(req.query.user, 'INVALID_USER', 'Parâmetro user inválido.')
    const requestedPrivate =
      req.query.private === undefined ? DEFAULT_PRIVATE : parsePrivate(req.query.private)
    if (requestedPrivate === null) {
      throw new ApiError(400, 'INVALID_PRIVATE', 'Parâmetro private inválido; use 0 ou 1.')
    }

    const activity = await getActivity(config, requestedProfile, requestedUser, requestedPrivate)
    res.set('Cache-Control', 'no-store').json(activity)
  } catch (error) {
    res.set('Cache-Control', 'no-store')
    if (error instanceof ApiError) {
      res.status(error.status).json(errorResponse(error))
      return
    }
    res.status(502).json({
      error: { code: 'GITHUB_ERROR', message: 'Falha ao consultar o GitHub. Tente novamente.' },
    })
  }
})

const dist = path.join(import.meta.dirname, '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(dist, 'index.html'))
      return
    }
    next()
  })
}

const port = Number(process.env.PORT ?? 3001)
app.listen(port, '127.0.0.1', () => {
  console.log(`Dashboard em http://127.0.0.1:${port}`)
})
