import { Router } from 'express'
import { parseManifest, resolveSlideContent } from '../manifest.js'

export function slidesRouter(repoPath) {
  const router = Router()

  router.get('/', (req, res) => {
    try {
      const manifest = parseManifest(repoPath)
      const resolvedSlides = manifest.slides.map((slide) =>
        resolveSlideContent(slide, repoPath)
      )
      res.json({ ...manifest, slides: resolvedSlides })
    } catch (err) {
      res.status(404).json({ error: err.message })
    }
  })

  return router
}
