import { Router } from 'express'
import simpleGit from 'simple-git'
import { existsSync } from 'fs'

export function gitRouter(repoPath) {
  const router = Router()

  router.get('/', async (req, res) => {
    try {
      if (!existsSync(repoPath)) {
        return res.status(404).json({ error: `Repo path not found: ${repoPath}` })
      }

      const git = simpleGit(repoPath)
      const isRepo = await git.checkIsRepo()

      if (!isRepo) {
        return res.json({
          branch: 'unknown',
          lastCommit: null,
          recentCommits: [],
          dirty: false,
          repoPath,
        })
      }

      // Use simple-git's structured log API (no custom format)
      const [branch, log, status] = await Promise.all([
        git.revparse(['--abbrev-ref', 'HEAD']).catch(() => 'unknown'),
        git.log({ maxCount: 10 }).catch(() => ({ all: [] })),
        git.status().catch(() => ({ isClean: () => true, files: [] })),
      ])

      const recentCommits = (log.all || []).map((c) => ({
        hash: c.hash?.slice(0, 8),
        fullHash: c.hash,
        author: c.author_name,
        email: c.author_email,
        date: c.date,
        message: c.message,
      }))

      const lastCommit = recentCommits[0] || null

      res.json({
        branch: branch.trim(),
        lastCommit,
        recentCommits,
        dirty: !status.isClean(),
        changedFiles: status.files?.length || 0,
        repoPath,
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
