import { useState, useRef, useEffect, useCallback } from 'react'
import { usePresentationStore } from '../store/usePresentationStore'
import { Send, Bot, User, Loader, X, RotateCcw, AlertCircle } from 'lucide-react'

const STARTER_PROMPTS = [
  'Explain the architecture on this slide.',
  'What are the trade-offs in this design?',
  'How could this be improved?',
  'What are potential failure points?',
]

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="chat-avatar">
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="chat-bubble">
        {isUser ? (
          <p className="chat-text">{msg.content}</p>
        ) : (
          <pre className="chat-text markdown-pre">{msg.content || ' '}</pre>
        )}
      </div>
    </div>
  )
}

async function streamChat({ messages, slideTitle, slideType, onChunk, onDone, onError, signal }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      slide_context: slideTitle,
      slide_type: slideType,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE lines from buffer
    const lines = buffer.split('\n')
    buffer = lines.pop() // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        onDone()
        return
      }
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) onChunk(delta)
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
  onDone()
}

export default function ChatSidebar({ slideTitle, slideType }) {
  const {
    chatMessages,
    chatLoading,
    sidebarOpen,
    addMessage,
    updateLastMessage,
    setChatLoading,
    clearChat,
    toggleSidebar,
  } = usePresentationStore()

  const [input, setInput] = useState('')
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  // Cancel in-flight request on unmount
  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(async (text) => {
    const msg = (text || input).trim()
    if (!msg || chatLoading) return

    setInput('')
    setError(null)
    addMessage('user', msg)
    setChatLoading(true)

    // Start an empty assistant message that we'll stream into
    addMessage('assistant', '')

    const controller = new AbortController()
    abortRef.current = controller

    const conversationMessages = [
      ...chatMessages,
      { role: 'user', content: msg },
    ].map(({ role, content }) => ({ role, content }))

    try {
      await streamChat({
        messages: conversationMessages,
        slideTitle,
        slideType,
        onChunk: (chunk) => updateLastMessage(chunk),
        onDone: () => setChatLoading(false),
        onError: (err) => {
          setError(err.message)
          setChatLoading(false)
        },
        signal: controller.signal,
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setChatLoading(false)
    }
  }, [input, chatLoading, chatMessages, slideTitle, slideType, addMessage, updateLastMessage, setChatLoading])

  const handleSubmit = (e) => {
    e.preventDefault()
    send()
  }

  if (!sidebarOpen) return null

  return (
    <aside className="chat-sidebar">
      <div className="chat-header">
        <Bot size={18} />
        <span>Design Chat</span>
        {slideTitle && <span className="chat-context-label">{slideTitle}</span>}
        <button className="icon-btn" onClick={clearChat} title="Clear chat">
          <RotateCcw size={14} />
        </button>
        <button className="icon-btn" onClick={toggleSidebar} title="Close">
          <X size={14} />
        </button>
      </div>

      <div className="chat-messages">
        {chatMessages.length === 0 && !chatLoading && (
          <div className="chat-welcome">
            <Bot size={32} />
            <p>Ask me anything about the architecture shown on this slide.</p>
            <div className="starter-prompts">
              {STARTER_PROMPTS.map((p) => (
                <button key={p} className="starter-btn" onClick={() => send(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}

        {chatLoading && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
          <div className="chat-message assistant">
            <div className="chat-avatar"><Bot size={14} /></div>
            <div className="chat-bubble loading">
              <Loader size={14} className="spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this slide…"
          disabled={chatLoading}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!input.trim() || chatLoading}
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  )
}
