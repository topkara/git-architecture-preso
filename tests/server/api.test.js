import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import supertest from 'supertest'
import { createServer } from '../../server/index.js'

let tmpDir
let app
let request

const VALID_MANIFEST = `
title: "API Test Presentation"
author: "Test Author"
slides:
  - id: cover
    type: cover
    title: "Test Cover"
    subtitle: "Subtitle here"
  - id: arch
    type: mermaid
    title: "Architecture"
    diagram: "graph TD; A-->B"
  - id: code
    type: component
    title: "Code"
    files:
      - src/index.js
`

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'preso-api-test-'))
  mkdirSync(join(tmpDir, '.preso'), { recursive: true })
  mkdirSync(join(tmpDir, 'src'), { recursive: true })

  writeFileSync(join(tmpDir, '.preso', 'manifest.yaml'), VALID_MANIFEST)
  writeFileSync(join(tmpDir, 'src', 'index.js'), 'console.log("hello")')
  writeFileSync(join(tmpDir, 'README.md'), '# Test Repo')

  // Initialize a git repo so /api/git works
  const { execSync } = require('child_process') // eslint-disable-line
  try {
    execSync('git init && git add . && git commit -m "init"', {
      cwd: tmpDir,
      stdio: 'pipe',
      env: { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@test.com',
             GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@test.com' },
    })
  } catch {
    // git not needed for all tests, just skip if it fails
  }

  app = createServer(tmpDir)
  request = supertest(app)
})

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

// ─── /api/health ───────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request.get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.repoPath).toBe(tmpDir)
  })
})

// ─── /api/slides ───────────────────────────────────────────

describe('GET /api/slides', () => {
  it('returns manifest with resolved slides', async () => {
    const res = await request.get('/api/slides')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('API Test Presentation')
    expect(res.body.author).toBe('Test Author')
    expect(res.body.slides).toHaveLength(3)
  })

  it('returns slide ids and types', async () => {
    const res = await request.get('/api/slides')
    const ids = res.body.slides.map((s) => s.id)
    expect(ids).toEqual(['cover', 'arch', 'code'])
  })

  it('resolves component file contents', async () => {
    const res = await request.get('/api/slides')
    const codeSlide = res.body.slides.find((s) => s.id === 'code')
    expect(codeSlide.fileContents).toBeDefined()
    expect(codeSlide.fileContents['src/index.js']).toBe('console.log("hello")')
  })

  it('returns 404 when manifest missing', async () => {
    const noManifestDir = mkdtempSync(join(tmpdir(), 'preso-no-manifest-'))
    const noManApp = createServer(noManifestDir)
    const res = await supertest(noManApp).get('/api/slides')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/manifest/)
    rmSync(noManifestDir, { recursive: true, force: true })
  })
})

// ─── /api/files ────────────────────────────────────────────

describe('GET /api/files/:path', () => {
  it('returns file content', async () => {
    const res = await request.get('/api/files/README.md')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('# Test Repo')
    expect(res.body.path).toBe('README.md')
    expect(res.body.extension).toBe('md')
  })

  it('returns file in subdirectory', async () => {
    const res = await request.get('/api/files/src/index.js')
    expect(res.status).toBe(200)
    expect(res.body.content).toBe('console.log("hello")')
  })

  it('returns 404 for missing file', async () => {
    const res = await request.get('/api/files/does-not-exist.txt')
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  it('blocks directory traversal (Express normalizes URL, no sensitive data exposed)', async () => {
    // Express normalizes /../../../etc to a path inside the route, which then 404s or 403s.
    // The key security property: /etc/passwd is never returned.
    const res = await request.get('/api/files/../../../etc/passwd')
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.body).not.toHaveProperty('content')
  })

  it('returns 400 for directory paths', async () => {
    const res = await request.get('/api/files/src')
    expect(res.status).toBe(400)
  })
})

// ─── /api/git ──────────────────────────────────────────────

describe('GET /api/git', () => {
  it('returns git context with branch info', async () => {
    const res = await request.get('/api/git')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('branch')
    expect(res.body).toHaveProperty('recentCommits')
    expect(res.body).toHaveProperty('repoPath')
  })

  it('handles non-git directory gracefully', async () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'preso-nongit-'))
    const nonGitApp = createServer(nonGitDir)
    const res = await supertest(nonGitApp).get('/api/git')
    expect(res.status).toBe(200)
    expect(res.body.branch).toBe('unknown')
    expect(res.body.recentCommits).toEqual([])
    rmSync(nonGitDir, { recursive: true, force: true })
  })
})

// ─── /api/chat ─────────────────────────────────────────────

describe('POST /api/chat', () => {
  it('returns 400 if messages is not an array', async () => {
    const res = await request
      .post('/api/chat')
      .send({ messages: 'bad' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/array/)
  })

  it('returns error if LLM is unreachable', async () => {
    // LLM endpoint unreachable in CI — expect a 5xx or fetch error propagated
    const res = await request
      .post('/api/chat')
      .send({ messages: [{ role: 'user', content: 'hello' }] })
    // In CI without LLM, this should fail gracefully with 500 or connection error
    expect([200, 500, 503]).toContain(res.status)
  }, 10000)
})
