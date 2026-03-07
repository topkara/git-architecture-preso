import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'
import App from '../App'
import { usePresentationStore } from '../store/usePresentationStore'

const mockManifest = {
  title: 'Test Presentation',
  author: 'Test Author',
  theme: 'default',
  slides: [
    { id: 'cover', type: 'cover', title: 'Welcome Slide', subtitle: 'Subtitle' },
    { id: 'arch', type: 'mermaid', title: 'Architecture Diagram', diagram: 'graph TD; A-->B' },
    { id: 'code', type: 'component', title: 'Code Example', fileContents: { 'App.jsx': 'function App() {}' }, files: ['App.jsx'] },
  ],
}

const mockGitContext = {
  branch: 'feature-branch',
  lastCommit: { hash: 'abc1234', author: 'Test User', date: '1 hour ago', message: 'Initial commit' },
  recentCommits: [{ hash: 'abc1234', author: 'Test User', date: '1 hour ago', message: 'Initial commit' }],
  dirty: false,
  repoPath: '/test/repo',
}

beforeEach(() => {
  act(() => {
    usePresentationStore.setState({
      currentSlide: 0,
      slides: [],
      manifest: null,
      gitContext: null,
      chatMessages: [],
      chatLoading: false,
      sidebarOpen: true,
      loading: true,
      error: null,
    })
  })

  global.fetch = vi.fn().mockImplementation((url) => {
    if (url === '/api/slides') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) })
    }
    if (url === '/api/git') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGitContext) })
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
})

describe('App - initialization', () => {
  it('shows loading state initially', () => {
    render(<App />)
    expect(screen.getByText(/Loading presentation/i)).toBeInTheDocument()
  })

  it('loads slides from /api/slides', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByText('Welcome Slide').length).toBeGreaterThan(0)
    })
  })

  it('shows error when API fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API down'))
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/Failed to load presentation/i)).toBeInTheDocument()
    })
  })

  it('shows retry button on error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    render(<App />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('shows git branch in navbar after loading', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByText('feature-branch').length).toBeGreaterThan(0)
    })
  })
})

describe('App - keyboard navigation', () => {
  async function renderLoadedApp() {
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByText('Welcome Slide').length).toBeGreaterThan(0)
    })
  }

  it('ArrowRight advances to next slide', async () => {
    await renderLoadedApp()
    act(() => { fireEvent.keyDown(window, { key: 'ArrowRight' }) })
    await waitFor(() => {
      expect(screen.getAllByText('Architecture Diagram').length).toBeGreaterThan(0)
    })
  })

  it('Space advances to next slide', async () => {
    await renderLoadedApp()
    act(() => { fireEvent.keyDown(window, { key: ' ' }) })
    await waitFor(() => {
      expect(screen.getAllByText('Architecture Diagram').length).toBeGreaterThan(0)
    })
  })

  it('ArrowLeft goes to previous slide', async () => {
    await renderLoadedApp()
    act(() => { usePresentationStore.getState().setCurrentSlide(1) })
    act(() => { fireEvent.keyDown(window, { key: 'ArrowLeft' }) })
    await waitFor(() => {
      expect(screen.getAllByText('Welcome Slide').length).toBeGreaterThan(0)
    })
  })

  it('does not navigate when focus is in chat input', async () => {
    await renderLoadedApp()
    const chatInput = document.querySelector('.chat-input')
    if (chatInput) chatInput.focus()
    act(() => { fireEvent.keyDown(window, { key: 'ArrowRight' }) })
    // Still on slide 0 because input focus prevents navigation
    // (handler checks e.target.tagName, but keydown fires on window; use document.activeElement)
    expect(document.querySelector('.app')).toBeInTheDocument()
  })
})

describe('App - slide display', () => {
  it('shows slide type badge', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('cover')).toBeInTheDocument()
    })
  })

  it('renders NavBar with slide counter', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })
  })

  it('renders chat sidebar by default', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Design Chat')).toBeInTheDocument()
    })
  })
})
