import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MermaidView from '../components/MermaidView'

describe('MermaidView', () => {
  it('renders the mermaid container', async () => {
    const slide = {
      id: 'arch',
      type: 'mermaid',
      title: 'Architecture',
      diagram: 'graph TD; A-->B',
    }
    render(<MermaidView slide={slide} />)
    const container = document.querySelector('.mermaid-container')
    expect(container).toBeInTheDocument()
  })

  it('renders SVG from mocked mermaid', async () => {
    const slide = {
      id: 'seq',
      type: 'mermaid',
      title: 'Sequence',
      diagram: 'sequenceDiagram; A->>B: hello',
    }
    render(<MermaidView slide={slide} />)
    await waitFor(() => {
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  it('shows description when provided', () => {
    const slide = {
      id: 'arch',
      type: 'mermaid',
      title: 'Arch',
      diagram: 'graph TD; A-->B',
      description: 'This is the system architecture.',
    }
    render(<MermaidView slide={slide} />)
    expect(screen.getByText('This is the system architecture.')).toBeInTheDocument()
  })

  it('shows empty message when no diagram', () => {
    const slide = { id: 'empty', type: 'mermaid', title: 'Empty' }
    render(<MermaidView slide={slide} />)
    expect(screen.getByText(/No diagram content/i)).toBeInTheDocument()
  })

  it('calls mermaid.render with diagram content', async () => {
    const { default: mermaid } = await import('mermaid')
    const slide = {
      id: 'test',
      type: 'mermaid',
      title: 'Test',
      diagram: 'graph LR; X-->Y',
    }
    render(<MermaidView slide={slide} />)
    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledWith(
        expect.stringContaining('mermaid-'),
        'graph LR; X-->Y'
      )
    })
  })
})
