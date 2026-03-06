import { useState, useRef, useEffect } from 'react';
import { usePresentationStore } from '../store/usePresentationStore';
import { Send, Bot, User, Loader, X, RotateCcw } from 'lucide-react';

// Simulated Claude responses keyed by topic keywords
const CANNED_RESPONSES = {
  streaming: `Good question! For streaming endpoints, bypassing the cache entirely is usually the right call. Here's why:

1. **Streaming responses are ephemeral** — they're designed for real-time delivery, not storage.
2. **Cache keys would need to be invalidated mid-stream**, which is complex.
3. For repeated identical prompts, consider a \`non-streaming\` cache layer upstream.

**Recommendation**: Add a \`?cache=false\` flag that streaming clients set automatically, and skip cache lookup for those requests.`,

  rate: `For per-tenant rate limiting with model-specific caps, I'd suggest a **token bucket algorithm** per (tenant_id, model) composite key:

\`\`\`python
key = f"ratelimit:{tenant_id}:{model}"
tokens = redis.get(key) or LIMIT
if tokens < request.estimated_tokens:
    raise RateLimitError(retry_after=bucket.refill_in)
redis.decrby(key, request.estimated_tokens)
\`\`\`

Store limits in a config table so they can be updated without redeploys.`,

  auth: `JWT validation at the gateway edge is a solid choice. A few things to watch:

- **Rotation**: rotate signing keys on a schedule. Store them in a KV with version tags.
- **Claims caching**: parse and cache the decoded payload for the token's lifetime (sub, exp, tenant_id) to avoid repeated signature verification.
- **Downstream trust**: use mTLS between services in the same cluster rather than token forwarding.`,

  cache: `For the request-level cache design:

- **Key**: \`sha256(model + sorted(messages))\` — sort message roles to catch equivalent orderings.
- **TTL**: 5 min is fine for most completions, but consider a **semantic similarity** threshold cache for longer-lived content.
- **Invalidation**: Tag responses with model version. When you upgrade a model, flush by tag rather than globally.`,

  default: `That's an interesting design consideration. Based on the current architecture I can see in your repo:

The gateway is well-positioned to handle cross-cutting concerns like auth, caching, and routing. For iteration 2, I'd focus on making the routing table **data-driven** — moving it out of code and into a config store (etcd or Consul work well here).

This way, adding a new model backend is a config change, not a deploy. Want me to sketch out what that config schema might look like?`,
};

function getResponse(message) {
  const lower = message.toLowerCase();
  if (lower.includes('stream')) return CANNED_RESPONSES.streaming;
  if (lower.includes('rate') || lower.includes('limit')) return CANNED_RESPONSES.rate;
  if (lower.includes('auth') || lower.includes('jwt') || lower.includes('token')) return CANNED_RESPONSES.auth;
  if (lower.includes('cache') || lower.includes('cach')) return CANNED_RESPONSES.cache;
  return CANNED_RESPONSES.default;
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="chat-avatar">
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="chat-bubble">
        {msg.role === 'assistant' ? (
          <pre className="chat-text markdown-pre">{msg.content}</pre>
        ) : (
          <p className="chat-text">{msg.content}</p>
        )}
      </div>
    </div>
  );
}

const STARTER_PROMPTS = [
  'Should streaming bypass the cache?',
  'How to handle per-tenant rate limits?',
  'Best practices for JWT at the gateway?',
  'Explain the cache key design.',
];

export default function ChatSidebar({ slideTitle }) {
  const { chatMessages, chatLoading, sidebarOpen, addMessage, setChatLoading, clearChat, toggleSidebar } = usePresentationStore();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || chatLoading) return;
    setInput('');
    addMessage('user', msg);
    setChatLoading(true);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
    addMessage('assistant', getResponse(msg));
    setChatLoading(false);
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="chat-sidebar">
      <div className="chat-header">
        <Bot size={18} />
        <span>Design Chat</span>
        <span className="chat-context-label">{slideTitle}</span>
        <button className="icon-btn" onClick={clearChat} title="Clear chat"><RotateCcw size={14} /></button>
        <button className="icon-btn" onClick={toggleSidebar} title="Close"><X size={14} /></button>
      </div>

      <div className="chat-messages">
        {chatMessages.length === 0 && (
          <div className="chat-welcome">
            <Bot size={32} />
            <p>Ask me anything about the architecture shown on this slide.</p>
            <div className="starter-prompts">
              {STARTER_PROMPTS.map((p) => (
                <button key={p} className="starter-btn" onClick={() => send(p)}>{p}</button>
              ))}
            </div>
          </div>
        )}
        {chatMessages.map((m) => <MessageBubble key={m.id} msg={m} />)}
        {chatLoading && (
          <div className="chat-message assistant">
            <div className="chat-avatar"><Bot size={14} /></div>
            <div className="chat-bubble loading">
              <Loader size={14} className="spin" />
              <span>Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this slide…"
          disabled={chatLoading}
        />
        <button type="submit" className="send-btn" disabled={!input.trim() || chatLoading}>
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
