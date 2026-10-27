import { existsSync } from 'node:fs'
import path from 'node:path'
import express from 'express'
import { DEFAULT_USER, getActivity } from './activity.ts'
import { ApiError } from './errors.ts'

try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // Sem .env local: o servidor sobe e a API responde TOKEN_MISSING.
}

const app = express()
app.disable('x-powered-by')

app.get('/api/activity', async (req, res) => {
  const requestedUser = req.query.user
  const user = requestedUser === undefined ? DEFAULT_USER : typeof requestedUser === 'string' ? requestedUser : ''
  const token = process.env.GITHUB_TOKEN?.trim() || undefined

  try {
    const activity = await getActivity(user, token)
    res.set('Cache-Control', 'no-store').json(activity)
  } catch (error) {
    res.set('Cache-Control', 'no-store')
    if (error instanceof ApiError) {
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.retryAt ? { retryAt: error.retryAt } : {}),
        },
      })
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
