import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#6366f1',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#4f46e5',
      lineColor: '#64748b',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      background: '#0a0e1a',
      mainBkg: '#1e293b',
      nodeBorder: '#475569',
      clusterBkg: '#1e293b',
      titleColor: '#e2e8f0',
      edgeLabelBackground: '#1e293b',
      actorBkg: '#1e293b',
      actorBorder: '#6366f1',
      actorTextColor: '#e2e8f0',
      actorLineColor: '#64748b',
      signalColor: '#94a3b8',
      signalTextColor: '#e2e8f0',
    },
    flowchart: { htmlLabels: true, curve: 'basis' },
    securityLevel: 'loose',
  })
  mermaidInitialized = true
}

let diagramCounter = 0

/**
 * MermaidView — renders a Mermaid diagram string into an SVG.
 *
 * Props:
 *   slide.diagram   string  — Mermaid diagram source
 *   slide.description string — optional caption
 */
export default function MermaidView({ slide }) {
  const { diagram, description } = slide
  const containerRef = useRef(null)
  const [error, setError] = useState(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!diagram || !containerRef.current) return

    initMermaid()
    setError(null)
    setRendered(false)

    const id = `mermaid-${++diagramCounter}`

    mermaid
      .render(id, diagram.trim())
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          setRendered(true)
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to render diagram')
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
      })
  }, [diagram])

  if (!diagram) {
    return (
      <div className="mermaid-view">
        <div className="mermaid-empty">No diagram content provided.</div>
      </div>
    )
  }

  return (
    <div className="mermaid-view">
      {description && <p className="slide-description">{description}</p>}

      {error && (
        <div className="mermaid-error">
          <strong>Diagram error:</strong>
          <pre>{error}</pre>
          <details>
            <summary>Source</summary>
            <pre>{diagram}</pre>
          </details>
        </div>
      )}

      <div
        ref={containerRef}
        className={`mermaid-container ${rendered ? 'rendered' : 'rendering'}`}
        aria-label="Mermaid diagram"
      />
    </div>
  )
}
