/**
 * Simulated git context loader.
 * In a real deployment this would call a local server endpoint
 * (e.g. `GET /api/git-context`) that shells out to git commands.
 * Here we return a rich mock so the prototype works standalone.
 */
export async function loadGitContext(repoPath = '.') {
  // Simulate a small delay as if fetching from a local API
  await new Promise((r) => setTimeout(r, 400));

  return {
    repoPath,
    branch: 'main',
    lastCommit: {
      hash: 'a3f9c12',
      author: 'Alice Dev',
      date: '2026-03-06',
      message: 'feat: add streaming endpoint for chat completions',
    },
    recentCommits: [
      { hash: 'a3f9c12', message: 'feat: add streaming endpoint for chat completions' },
      { hash: 'b72e4d8', message: 'refactor: split gateway into read/write services' },
      { hash: 'c19a3f1', message: 'docs: update OpenAPI spec to v0.4' },
      { hash: 'd04b7a9', message: 'chore: upgrade dependencies' },
    ],
    openApiSpec: {
      openapi: '3.0.3',
      info: { title: 'Architecture Demo API', version: '0.4.0', description: 'Core service endpoints' },
      paths: {
        '/chat/completions': {
          post: {
            summary: 'Create a chat completion',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['model', 'messages'],
                    properties: {
                      model: { type: 'string', example: 'gpt-4o' },
                      messages: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                            content: { type: 'string' },
                          },
                        },
                      },
                      stream: { type: 'boolean', default: false },
                      temperature: { type: 'number', minimum: 0, maximum: 2 },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Success', content: { 'application/json': { schema: { type: 'object' } } } },
            },
          },
        },
        '/health': {
          get: {
            summary: 'Health check',
            responses: { 200: { description: 'OK' } },
          },
        },
      },
    },
    sampleCode: {
      language: 'python',
      filename: 'gateway.py',
      content: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx, asyncio

app = FastAPI(title="Architecture Demo Gateway")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[Message]
    stream: bool = False
    temperature: Optional[float] = 1.0

@app.post("/chat/completions")
async def chat_completions(req: ChatRequest):
    """Route requests to the appropriate backend model service."""
    backend = select_backend(req.model)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(backend.url, json=req.model_dump())
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()

def select_backend(model: str):
    routing_table = {
        "gpt-4o":  Backend("http://openai-proxy:8080"),
        "claude-3": Backend("http://claude-proxy:8080"),
        "glm-4":    Backend("http://glm-service:8081"),
    }
    return routing_table.get(model, routing_table["gpt-4o"])
`,
    },
  };
}
