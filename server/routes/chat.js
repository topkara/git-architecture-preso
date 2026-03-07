import { Router } from 'express'

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:8081/v1'
const LLM_MODEL = process.env.LLM_MODEL || 'GLM-4.7-Flash-Q4_K_M.gguf'
const LLM_API_KEY = process.env.LLM_API_KEY || 'not-needed'

export function chatRouter() {
  const router = Router()

  router.post('/', async (req, res) => {
    try {
      const { messages = [], slide_context, slide_type } = req.body

      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages must be an array' })
      }

      const systemContent = buildSystemPrompt(slide_context, slide_type)
      const allMessages = [{ role: 'system', content: systemContent }, ...messages]

      const llmResponse = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: allMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      })

      if (!llmResponse.ok) {
        const errText = await llmResponse.text()
        return res.status(llmResponse.status).json({
          error: `LLM error: ${llmResponse.status} ${errText}`,
        })
      }

      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')

      // Pipe the SSE stream from the LLM to the client
      const reader = llmResponse.body.getReader()
      const decoder = new TextDecoder()

      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            res.write('data: [DONE]\n\n')
            res.end()
            break
          }
          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }
      }

      pump().catch((err) => {
        console.error('Chat stream error:', err)
        res.end()
      })

      req.on('close', () => {
        reader.cancel()
      })
    } catch (err) {
      console.error('Chat route error:', err)
      if (!res.headersSent) {
        res.status(500).json({ error: err.message })
      }
    }
  })

  return router
}

function buildSystemPrompt(slideContext, slideType) {
  const base = `You are an expert software architecture assistant integrated into a git-native presentation tool.
You help software architects understand, discuss, and improve system designs.
Keep responses concise and technical. Use markdown formatting for code and lists.`

  if (!slideContext) return base

  const contextParts = [`\nCurrent slide: "${slideContext}"`]
  if (slideType) {
    const typeHints = {
      mermaid: 'This is a diagram slide. You can discuss the architecture shown.',
      component: 'This is a code slide. You can analyze the implementation.',
      openapi: 'This is an API schema slide. You can discuss the API design.',
      cover: 'This is the title slide.',
      markdown: 'This is a text slide with design notes.',
      flow: 'This is an interactive dependency graph.',
    }
    if (typeHints[slideType]) contextParts.push(typeHints[slideType])
  }

  return base + '\n' + contextParts.join('\n')
}
