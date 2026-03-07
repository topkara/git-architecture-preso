import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom doesn't implement scrollIntoView — provide a no-op
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Mock fetch globally for tests that don't use MSW
global.fetch = vi.fn()

// Mock mermaid to avoid DOM/canvas issues in jsdom
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg><text>diagram</text></svg>' }),
  },
}))

// Mock shiki to avoid ESM/WASM loading issues in jsdom
vi.mock('shiki', () => ({
  codeToHtml: vi.fn().mockResolvedValue('<pre class="shiki"><code>mocked</code></pre>'),
}))

// Suppress specific console noise during tests
const originalError = console.error
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('act(...)') ||
        args[0].includes('punycode'))
    )
      return
    originalError(...args)
  }
})
afterEach(() => {
  console.error = originalError
  vi.clearAllMocks()
})
