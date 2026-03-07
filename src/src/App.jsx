import { useEffect, useCallback } from 'react'
import { usePresentationStore } from './store/usePresentationStore'
import NavBar from './components/NavBar'
import SlideRenderer from './components/SlideRenderer'
import ChatSidebar from './components/ChatSidebar'
import './App.css'

async function fetchManifest() {
  const res = await fetch('/api/slides')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error: ${res.status}`)
  }
  return res.json()
}

async function fetchGitContext() {
  const res = await fetch('/api/git')
  if (!res.ok) return null
  return res.json()
}

export default function App() {
  const {
    currentSlide,
    slides,
    manifest,
    setSlides,
    setManifest,
    setGitContext,
    gitContext,
    nextSlide,
    prevSlide,
    sidebarOpen,
    loading,
    error,
    setLoading,
    setError,
  } = usePresentationStore()

  // Load slides from manifest API + git context in parallel
  useEffect(() => {
    setLoading(true)
    Promise.all([fetchManifest(), fetchGitContext()])
      .then(([manifestData, gitData]) => {
        setManifest(manifestData)
        setSlides(manifestData.slides)
        if (gitData) setGitContext(gitData)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Keyboard navigation
  const handleKey = useCallback(
    (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        nextSlide()
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        prevSlide()
      }
    },
    [nextSlide, prevSlide]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const slide = slides[currentSlide]

  if (loading) {
    return (
      <div className="app">
        <div className="app-loading">
          <div className="loading-spinner" />
          <p>Loading presentation…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="app-error">
          <h2>Failed to load presentation</h2>
          <p>{error}</p>
          <p className="error-hint">
            Make sure <code>preso serve</code> is running and a{' '}
            <code>.preso/manifest.yaml</code> file exists in the repo.
          </p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <NavBar manifest={manifest} />
      <div className={`main-area ${sidebarOpen ? 'with-sidebar' : ''}`}>
        <main className="slide-stage">
          {slide && (
            <div className="slide-content" key={slide.id}>
              <div className="slide-header">
                <h2 className="slide-title">{slide.title}</h2>
                <span className="slide-type-badge">{slide.type}</span>
              </div>
              <SlideRenderer slide={slide} gitContext={gitContext} />
              {slide.notes && (
                <div className="slide-notes">
                  <span className="notes-label">Notes:</span> {slide.notes}
                </div>
              )}
            </div>
          )}
        </main>
        {sidebarOpen && (
          <ChatSidebar slideTitle={slide?.title} slideType={slide?.type} />
        )}
      </div>
    </div>
  )
}
