import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseManifest, resolveSlideContent } from '../../server/manifest.js'

let tmpDir

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'preso-test-'))
  mkdirSync(join(tmpDir, '.preso'), { recursive: true })
  mkdirSync(join(tmpDir, 'src'), { recursive: true })
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function writeManifest(content) {
  writeFileSync(join(tmpDir, '.preso', 'manifest.yaml'), content)
}

describe('parseManifest', () => {
  it('parses a minimal valid manifest', () => {
    writeManifest(`
title: "Test Presentation"
slides:
  - id: slide1
    type: cover
    title: "Welcome"
`)
    const manifest = parseManifest(tmpDir)
    expect(manifest.title).toBe('Test Presentation')
    expect(manifest.slides).toHaveLength(1)
    expect(manifest.slides[0].id).toBe('slide1')
    expect(manifest.slides[0].type).toBe('cover')
  })

  it('includes optional fields with defaults', () => {
    writeManifest(`
title: "Full Preso"
author: "Jane Engineer"
theme: dark
slides:
  - id: s1
    type: mermaid
    title: "Diagram"
    diagram: "graph TD; A-->B"
`)
    const manifest = parseManifest(tmpDir)
    expect(manifest.author).toBe('Jane Engineer')
    expect(manifest.theme).toBe('dark')
  })

  it('defaults theme to "default" when not specified', () => {
    writeManifest(`
title: "No Theme"
slides:
  - id: s1
    type: cover
    title: "Cover"
`)
    const manifest = parseManifest(tmpDir)
    expect(manifest.theme).toBe('default')
  })

  it('throws if manifest file does not exist', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'preso-empty-'))
    expect(() => parseManifest(emptyDir)).toThrow('No manifest found')
    rmSync(emptyDir, { recursive: true, force: true })
  })

  it('throws if title is missing', () => {
    writeManifest(`
slides:
  - id: s1
    type: cover
    title: "x"
`)
    expect(() => parseManifest(tmpDir)).toThrow('title')
  })

  it('throws if slides array is empty', () => {
    writeManifest(`
title: "Empty"
slides: []
`)
    expect(() => parseManifest(tmpDir)).toThrow('at least one slide')
  })

  it('throws if slide is missing id', () => {
    writeManifest(`
title: "Test"
slides:
  - type: cover
    title: "No ID"
`)
    expect(() => parseManifest(tmpDir)).toThrow('missing required field: id')
  })

  it('throws if slide is missing type', () => {
    writeManifest(`
title: "Test"
slides:
  - id: s1
    title: "No Type"
`)
    expect(() => parseManifest(tmpDir)).toThrow('missing required field: type')
  })

  it('throws on invalid slide type', () => {
    writeManifest(`
title: "Test"
slides:
  - id: s1
    type: invalid-type
    title: "Bad Type"
`)
    expect(() => parseManifest(tmpDir)).toThrow('invalid type')
  })

  it('throws on duplicate slide ids', () => {
    writeManifest(`
title: "Test"
slides:
  - id: s1
    type: cover
    title: "First"
  - id: s1
    type: markdown
    title: "Duplicate"
    content: "hello"
`)
    expect(() => parseManifest(tmpDir)).toThrow('Duplicate slide id')
  })

  it('parses multiple slides correctly', () => {
    writeManifest(`
title: "Multi"
slides:
  - id: cover
    type: cover
    title: "Cover"
  - id: arch
    type: mermaid
    title: "Architecture"
    diagram: "graph TD; A-->B"
  - id: code
    type: component
    title: "Code"
    files: [src/App.js]
`)
    const manifest = parseManifest(tmpDir)
    expect(manifest.slides).toHaveLength(3)
    expect(manifest.slides.map((s) => s.id)).toEqual(['cover', 'arch', 'code'])
  })
})

describe('resolveSlideContent', () => {
  it('returns slide as-is when no source file', () => {
    const slide = { id: 's1', type: 'cover', title: 'Test', diagram: 'graph TD; A-->B' }
    const resolved = resolveSlideContent(slide, tmpDir)
    expect(resolved).toEqual(slide)
  })

  it('reads mermaid diagram from source file', () => {
    const mmdPath = join(tmpDir, 'arch.mmd')
    writeFileSync(mmdPath, 'graph TD; A-->B-->C')
    const slide = { id: 's1', type: 'mermaid', title: 'Arch', source: 'arch.mmd' }
    const resolved = resolveSlideContent(slide, tmpDir)
    expect(resolved.diagram).toBe('graph TD; A-->B-->C')
  })

  it('reads component file contents', () => {
    const jsPath = join(tmpDir, 'src', 'App.js')
    writeFileSync(jsPath, 'export default function App() {}')
    const slide = { id: 's1', type: 'component', title: 'App', files: ['src/App.js'] }
    const resolved = resolveSlideContent(slide, tmpDir)
    expect(resolved.fileContents['src/App.js']).toBe('export default function App() {}')
  })

  it('skips missing files gracefully', () => {
    const slide = { id: 's1', type: 'component', title: 'Missing', files: ['does/not/exist.js'] }
    const resolved = resolveSlideContent(slide, tmpDir)
    expect(resolved.fileContents['does/not/exist.js']).toBeUndefined()
  })
})
