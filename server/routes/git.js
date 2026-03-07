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

      const [branch, log, status] = await Promise.all([
        git.revparse(['--abbrev-ref', 'HEAD']).catch(() => 'unknown'),
        git.log(['--max-count=10', '--format=%H|%an|%ae|%ar|%s']).catch(() => ({ all: [] })),
        git.status().catch(() => ({ isClean: () => true, files: [] })),
      ])

      const recentCommits = (log.all || []).map((c) => {
        const [hash, author, email, date, ...msgParts] = c.hash.split('|')
        return {
          hash: hash?.slice(0, 8),
          fullHash: hash,
          author,
          email,
          date,
          message: msgParts.join('|'),
        }
      })

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
