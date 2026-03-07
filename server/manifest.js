import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'

const VALID_TYPES = ['cover', 'mermaid', 'flow', 'component', 'openapi', 'markdown', 'code', 'schema', 'commits']

export function parseManifest(repoPath) {
  const manifestPath = join(repoPath, '.preso', 'manifest.yaml')
  if (!existsSync(manifestPath)) {
    throw new Error(`No manifest found at ${manifestPath}. Initialize with: mkdir -p .preso && touch .preso/manifest.yaml`)
  }
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = yaml.load(raw)
  return validateManifest(manifest)
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Manifest must be a YAML object')
  }
  if (!manifest.title) throw new Error('Manifest missing required field: title')
  if (!Array.isArray(manifest.slides) || manifest.slides.length === 0) {
    throw new Error('Manifest must have at least one slide')
  }

  const ids = new Set()
  manifest.slides = manifest.slides.map((slide, i) => {
    if (!slide.id) throw new Error(`Slide at index ${i} missing required field: id`)
    if (!slide.type) throw new Error(`Slide "${slide.id}" missing required field: type`)
    if (!VALID_TYPES.includes(slide.type)) {
      throw new Error(`Slide "${slide.id}" has invalid type "${slide.type}". Valid types: ${VALID_TYPES.join(', ')}`)
    }
    if (!slide.title) throw new Error(`Slide "${slide.id}" missing required field: title`)
    if (ids.has(slide.id)) throw new Error(`Duplicate slide id: "${slide.id}"`)
    ids.add(slide.id)
    return slide
  })

  return {
    title: manifest.title,
    author: manifest.author || '',
    theme: manifest.theme || 'default',
    slides: manifest.slides,
  }
}

export function resolveSlideContent(slide, repoPath) {
  const resolved = { ...slide }

  // Load inline mermaid/openapi from source file
  if (slide.source && !slide.diagram && !slide.content) {
    const srcPath = join(repoPath, slide.source)
    if (existsSync(srcPath)) {
      const content = readFileSync(srcPath, 'utf8')
      if (slide.type === 'mermaid') resolved.diagram = content
      else if (slide.type === 'openapi') resolved.specContent = content
      else resolved.content = content
    }
  }

  // Load component files
  if (slide.files && Array.isArray(slide.files)) {
    resolved.fileContents = {}
    for (const filePath of slide.files) {
      const absPath = join(repoPath, filePath)
      if (existsSync(absPath)) {
        resolved.fileContents[filePath] = readFileSync(absPath, 'utf8')
      }
    }
  }

  return resolved
}
