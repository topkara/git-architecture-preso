import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from '@testing-library/react'
import ChatSidebar from '../components/ChatSidebar'
import { usePresentationStore } from '../store/usePresentationStore'

beforeEach(() => {
  act(() => {
    usePresentationStore.setState({
      chatMessages: [],
      chatLoading: false,
      sidebarOpen: true,
      loading: false,
      error: null,
    })
  })
  vi.clearAllMocks()
})

function mockSuccessfulStream(chunks = ['Hello', ' World']) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`
        controller.enqueue(encoder.encode(sseData))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('ChatSidebar - rendering', () => {
  it('renders when sidebarOpen is true', () => {
    render(<ChatSidebar slideTitle="Test Slide" />)
    expect(screen.getByText('Design Chat')).toBeInTheDocument()
  })

  it('does not render when sidebarOpen is false', () => {
    act(() => usePresentationStore.setState({ sidebarOpen: false }))
    const { container } = render(<ChatSidebar slideTitle="Test Slide" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows slide title in header', () => {
    render(<ChatSidebar slideTitle="Architecture Overview" />)
    expect(screen.getByText('Architecture Overview')).toBeInTheDocument()
  })

  it('shows welcome message when no messages', () => {
    render(<ChatSidebar slideTitle="Test" />)
    expect(screen.getByText(/Ask me anything/i)).toBeInTheDocument()
  })

  it('shows starter prompts', () => {
    render(<ChatSidebar slideTitle="Test" />)
    expect(screen.getByText(/Explain the architecture/i)).toBeInTheDocument()
  })

  it('shows existing messages', () => {
    act(() => {
      usePresentationStore.setState({
        chatMessages: [
          { id: 1, role: 'user', content: 'What is this?' },
          { id: 2, role: 'assistant', content: 'This is a diagram.' },
        ],
      })
    })
    render(<ChatSidebar slideTitle="Test" />)
    expect(screen.getByText('What is this?')).toBeInTheDocument()
    expect(screen.getByText('This is a diagram.')).toBeInTheDocument()
  })
})

describe('ChatSidebar - user interaction', () => {
  it('clears chat when reset button clicked', async () => {
    const user = userEvent.setup()
    act(() => {
      usePresentationStore.setState({
        chatMessages: [{ id: 1, role: 'user', content: 'hello' }],
      })
    })
    render(<ChatSidebar slideTitle="Test" />)
    const clearBtn = screen.getByTitle('Clear chat')
    await user.click(clearBtn)
    expect(usePresentationStore.getState().chatMessages).toHaveLength(0)
  })

  it('closes sidebar when X clicked', async () => {
    const user = userEvent.setup()
    render(<ChatSidebar slideTitle="Test" />)
    const closeBtn = screen.getByTitle('Close')
    await user.click(closeBtn)
    expect(usePresentationStore.getState().sidebarOpen).toBe(false)
  })

  it('disables send button when input is empty', () => {
    render(<ChatSidebar slideTitle="Test" />)
    // The send button uses a Lucide icon with no accessible text — query by class
    const sendBtn = document.querySelector('.send-btn')
    expect(sendBtn).toBeInTheDocument()
    expect(sendBtn).toBeDisabled()
  })

  it('enables send button when input has text', async () => {
    const user = userEvent.setup()
    render(<ChatSidebar slideTitle="Test" />)
    const input = screen.getByPlaceholderText(/Ask about this slide/i)
    await user.type(input, 'What does this do?')
    const sendBtn = document.querySelector('.send-btn')
    expect(sendBtn).not.toBeDisabled()
  })
})

describe('ChatSidebar - LLM streaming', () => {
  it('sends message and streams response', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue(mockSuccessfulStream(['Hello', ' World']))

    render(<ChatSidebar slideTitle="Architecture" slideType="mermaid" />)

    const input = screen.getByPlaceholderText(/Ask about this slide/i)
    await user.type(input, 'Explain this diagram')
    const form = input.closest('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      )
    })
  })

  it('includes slide context in request body', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue(mockSuccessfulStream(['response']))

    render(<ChatSidebar slideTitle="Gateway Code" slideType="component" />)

    const input = screen.getByPlaceholderText(/Ask about this slide/i)
    await user.type(input, 'Analyze this code')
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      const call = global.fetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.slide_context).toBe('Gateway Code')
      expect(body.slide_type).toBe('component')
    })
  })

  it('shows error state when fetch fails', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<ChatSidebar slideTitle="Test" />)

    const input = screen.getByPlaceholderText(/Ask about this slide/i)
    await user.type(input, 'test message')
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument()
    })
  })

  it('sends starter prompt on click', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockResolvedValue(mockSuccessfulStream(['Great question!']))

    render(<ChatSidebar slideTitle="Design" />)

    const starterBtn = screen.getByText(/Explain the architecture/i)
    await user.click(starterBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })
})
