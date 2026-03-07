import { Router } from 'express'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, resolve, relative } from 'path'

export function filesRouter(repoPath) {
  const router = Router()

  router.get('/*', (req, res) => {
    try {
      // Sanitize path to prevent directory traversal
      const reqPath = req.params[0] || ''
      const absPath = resolve(join(repoPath, reqPath))

      // Ensure path stays within repoPath
      if (!absPath.startsWith(resolve(repoPath))) {
        return res.status(403).json({ error: 'Access denied' })
      }

      if (!existsSync(absPath)) {
        return res.status(404).json({ error: `File not found: ${reqPath}` })
      }

      const stat = statSync(absPath)
      if (stat.isDirectory()) {
        return res.status(400).json({ error: 'Path is a directory' })
      }

      const content = readFileSync(absPath, 'utf8')
      const ext = absPath.split('.').pop()
      res.json({
        path: relative(repoPath, absPath),
        content,
        extension: ext,
        size: stat.size,
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
