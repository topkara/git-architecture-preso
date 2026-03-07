import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CodeView from '../components/CodeView'

const mockSlide = {
  id: 'code',
  type: 'component',
  title: 'Code',
  fileContents: {
    'src/App.jsx': 'export default function App() { return <div /> }',
    'src/index.js': 'import App from "./App"',
  },
  files: ['src/App.jsx', 'src/index.js'],
  highlight: [{ file: 'src/App.jsx', lines: '1' }],
}

describe('CodeView', () => {
  it('renders file tabs for multiple files', async () => {
    render(<CodeView slide={mockSlide} />)
    expect(screen.getByText('App.jsx')).toBeInTheDocument()
    expect(screen.getByText('index.js')).toBeInTheDocument()
  })

  it('highlights the first tab as active by default', () => {
    render(<CodeView slide={mockSlide} />)
    const firstTab = screen.getByText('App.jsx').closest('button')
    expect(firstTab).toHaveClass('active')
  })

  it('switches active tab on click', async () => {
    const user = userEvent.setup()
    render(<CodeView slide={mockSlide} />)
    const secondTab = screen.getByText('index.js')
    await user.click(secondTab)
    expect(secondTab.closest('button')).toHaveClass('active')
  })

  it('renders single file view for one file', async () => {
    const singleSlide = {
      ...mockSlide,
      fileContents: { 'src/App.jsx': 'export default function App() {}' },
      files: ['src/App.jsx'],
    }
    render(<CodeView slide={singleSlide} />)
    // Should show the filename in the header (not tabs)
    expect(screen.getByText('src/App.jsx')).toBeInTheDocument()
  })

  it('renders inline code when no fileContents', async () => {
    const inlineSlide = {
      id: 'code',
      type: 'code',
      title: 'Inline Code',
      code: 'const x = 42',
      language: 'javascript',
      filename: 'example.js',
    }
    render(<CodeView slide={inlineSlide} />)
    await waitFor(() => {
      // Either the filename or the shiki-mocked output should appear
      expect(document.querySelector('.code-view')).toBeInTheDocument()
    })
  })

  it('shows description when provided', () => {
    const slideWithDesc = { ...mockSlide, description: 'This is the main entry point.' }
    render(<CodeView slide={slideWithDesc} />)
    expect(screen.getByText('This is the main entry point.')).toBeInTheDocument()
  })

  it('collapses single file panel on header click', async () => {
    const user = userEvent.setup()
    const singleSlide = {
      ...mockSlide,
      fileContents: { 'src/App.jsx': 'code here' },
      files: ['src/App.jsx'],
    }
    render(<CodeView slide={singleSlide} />)
    const header = screen.getByText('src/App.jsx').closest('.code-file-header')
    await user.click(header)
    // After collapse, the code body should not be visible
    expect(document.querySelector('.code-view-body')).not.toBeInTheDocument()
  })

  it('renders copy button', () => {
    render(<CodeView slide={mockSlide} />)
    const copyButtons = document.querySelectorAll('.code-copy-btn')
    expect(copyButtons.length).toBeGreaterThan(0)
  })
})
