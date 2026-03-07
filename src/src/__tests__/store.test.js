import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { usePresentationStore } from '../store/usePresentationStore'

// Reset store state before each test
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
})

const mockSlides = [
  { id: 's1', type: 'cover', title: 'Slide 1' },
  { id: 's2', type: 'mermaid', title: 'Slide 2' },
  { id: 's3', type: 'markdown', title: 'Slide 3', content: 'hello' },
]

describe('usePresentationStore - navigation', () => {
  it('starts at slide 0', () => {
    expect(usePresentationStore.getState().currentSlide).toBe(0)
  })

  it('nextSlide advances currentSlide', () => {
    act(() => {
      usePresentationStore.getState().setSlides(mockSlides)
      usePresentationStore.getState().nextSlide()
    })
    expect(usePresentationStore.getState().currentSlide).toBe(1)
  })

  it('nextSlide does not exceed slide count', () => {
    act(() => {
      usePresentationStore.getState().setSlides(mockSlides)
      usePresentationStore.setState({ currentSlide: 2 })
      usePresentationStore.getState().nextSlide()
    })
    expect(usePresentationStore.getState().currentSlide).toBe(2)
  })

  it('prevSlide decrements currentSlide', () => {
    act(() => {
      usePresentationStore.getState().setSlides(mockSlides)
      usePresentationStore.setState({ currentSlide: 2 })
      usePresentationStore.getState().prevSlide()
    })
    expect(usePresentationStore.getState().currentSlide).toBe(1)
  })

  it('prevSlide does not go below 0', () => {
    act(() => {
      usePresentationStore.getState().setSlides(mockSlides)
      usePresentationStore.getState().prevSlide()
    })
    expect(usePresentationStore.getState().currentSlide).toBe(0)
  })

  it('setCurrentSlide jumps to specific slide', () => {
    act(() => {
      usePresentationStore.getState().setSlides(mockSlides)
      usePresentationStore.getState().setCurrentSlide(2)
    })
    expect(usePresentationStore.getState().currentSlide).toBe(2)
  })
})

describe('usePresentationStore - sidebar', () => {
  it('toggleSidebar flips sidebarOpen', () => {
    const { sidebarOpen, toggleSidebar } = usePresentationStore.getState()
    expect(sidebarOpen).toBe(true)
    act(() => toggleSidebar())
    expect(usePresentationStore.getState().sidebarOpen).toBe(false)
    act(() => toggleSidebar())
    expect(usePresentationStore.getState().sidebarOpen).toBe(true)
  })
})

describe('usePresentationStore - chat', () => {
  it('addMessage adds user message', () => {
    act(() => usePresentationStore.getState().addMessage('user', 'hello'))
    const msgs = usePresentationStore.getState().chatMessages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].content).toBe('hello')
    expect(msgs[0].id).toBeDefined()
  })

  it('addMessage adds assistant message', () => {
    act(() => {
      usePresentationStore.getState().addMessage('user', 'question')
      usePresentationStore.getState().addMessage('assistant', 'answer')
    })
    const msgs = usePresentationStore.getState().chatMessages
    expect(msgs).toHaveLength(2)
    expect(msgs[1].role).toBe('assistant')
    expect(msgs[1].content).toBe('answer')
  })

  it('updateLastMessage appends to last message', () => {
    act(() => {
      usePresentationStore.getState().addMessage('assistant', 'Hello')
      usePresentationStore.getState().updateLastMessage(', world')
    })
    const msgs = usePresentationStore.getState().chatMessages
    expect(msgs[0].content).toBe('Hello, world')
  })

  it('updateLastMessage handles streaming chunks', () => {
    act(() => {
      usePresentationStore.getState().addMessage('assistant', '')
      usePresentationStore.getState().updateLastMessage('chunk1')
      usePresentationStore.getState().updateLastMessage(' chunk2')
      usePresentationStore.getState().updateLastMessage(' chunk3')
    })
    const msgs = usePresentationStore.getState().chatMessages
    expect(msgs[0].content).toBe('chunk1 chunk2 chunk3')
  })

  it('clearChat empties messages', () => {
    act(() => {
      usePresentationStore.getState().addMessage('user', 'hi')
      usePresentationStore.getState().clearChat()
    })
    expect(usePresentationStore.getState().chatMessages).toHaveLength(0)
  })

  it('setChatLoading sets loading state', () => {
    act(() => usePresentationStore.getState().setChatLoading(true))
    expect(usePresentationStore.getState().chatLoading).toBe(true)
    act(() => usePresentationStore.getState().setChatLoading(false))
    expect(usePresentationStore.getState().chatLoading).toBe(false)
  })
})
