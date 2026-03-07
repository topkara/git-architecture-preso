import express from 'express'
import cors from 'cors'
import { resolve } from 'path'
import { slidesRouter } from './routes/slides.js'
import { filesRouter } from './routes/files.js'
import { gitRouter } from './routes/git.js'
import { chatRouter } from './routes/chat.js'

export function createServer(repoPath, options = {}) {
  const app = express()
  const absRepoPath = resolve(repoPath)

  app.use(cors())
  app.use(express.json())

  // Request logging in dev
  if (options.verbose) {
    app.use((req, _res, next) => {
      console.log(`  ${req.method} ${req.path}`)
      next()
    })
  }

  app.use('/api/slides', slidesRouter(absRepoPath))
  app.use('/api/files', filesRouter(absRepoPath))
  app.use('/api/git', gitRouter(absRepoPath))
  app.use('/api/chat', chatRouter())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, repoPath: absRepoPath })
  })

  return app
}

export function startServer(repoPath, port = 3001, options = {}) {
  const app = createServer(repoPath, options)
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`  API server: http://127.0.0.1:${port}/api`)
      resolve(server)
    })
    server.on('error', reject)
  })
}
