/**
 * Slide definitions for the Git-Architecture presentation.
 * Each slide has: id, title, type, and type-specific content.
 *
 * Types: 'cover' | 'mermaid' | 'flow' | 'code' | 'schema' | 'commits' | 'markdown'
 */
export const slideData = [
  {
    id: 'cover',
    type: 'cover',
    title: 'Git-Integrated Architecture',
    subtitle: 'Interactive Design Review — Iteration 1',
    meta: 'Powered by live git context',
  },
  {
    id: 'overview',
    type: 'mermaid',
    title: 'System Overview',
    description: 'High-level component topology pulled from the repository.',
    diagram: `graph TD
  subgraph Client["Client Layer"]
    WEB[Web App]
    CLI[CLI Tool]
  end

  subgraph Gateway["Gateway / Orchestration"]
    GW[API Gateway]
    AUTH[Auth Service]
    ROUTER[Request Router]
  end

  subgraph Models["Model Services"]
    OAI[OpenAI Proxy]
    CLD[Claude Proxy]
    GLM[GLM Service]
  end

  subgraph Infra["Infrastructure"]
    CACHE[(Redis Cache)]
    DB[(PostgreSQL)]
    QUEUE[Task Queue]
  end

  WEB --> GW
  CLI --> GW
  GW --> AUTH
  GW --> ROUTER
  ROUTER --> OAI
  ROUTER --> CLD
  ROUTER --> GLM
  GW --> CACHE
  GW --> DB
  OAI --> QUEUE
`,
  },
  {
    id: 'sequence',
    type: 'mermaid',
    title: 'Chat Completion Flow',
    description: 'Sequence diagram: client → gateway → model service.',
    diagram: `sequenceDiagram
  participant C as Client
  participant G as Gateway
  participant A as Auth
  participant R as Router
  participant M as Model Service
  participant CA as Cache

  C->>G: POST /chat/completions
  G->>A: validate token
  A-->>G: ok (user_id)
  G->>CA: check cache key
  CA-->>G: miss
  G->>R: route(model)
  R->>M: forward request
  M-->>R: completion response
  R-->>G: response
  G->>CA: store(key, response, ttl=300)
  G-->>C: 200 OK + completion
`,
  },
  {
    id: 'reactflow',
    type: 'flow',
    title: 'Service Dependency Graph',
    description: 'Drag nodes to explore the live dependency map.',
  },
  {
    id: 'api-schema',
    type: 'schema',
    title: 'OpenAPI Schema',
    description: 'Auto-rendered from the repo\'s OpenAPI spec (v0.4.0).',
  },
  {
    id: 'source-code',
    type: 'code',
    title: 'Gateway Implementation',
    description: 'Source code extracted from the current branch.',
  },
  {
    id: 'git-log',
    type: 'commits',
    title: 'Recent Commits',
    description: 'Last 4 commits on main — driving these design decisions.',
  },
  {
    id: 'discussion',
    type: 'markdown',
    title: 'Design Decisions',
    content: `## Key Decisions in Iteration 1

### 1. Stateless Gateway
The gateway holds no model-specific state; all routing is table-driven.
This lets us add new model backends with zero downtime deploys.

### 2. Request-Level Caching
Cache keys are \`sha256(model + messages)\`. Short TTL (5 min) keeps
responses fresh while absorbing burst traffic.

### 3. Auth via JWT
Tokens are validated at the gateway edge. Downstream services are
in a trusted network and skip re-validation.

### Open Questions
- Should streaming responses bypass cache entirely?
- How do we handle model-specific rate limits per tenant?
- Token accounting: per-message or per-session?

> Use the **Design Chat** sidebar to explore these questions with Claude.
`,
  },
  {
    id: 'next-steps',
    type: 'markdown',
    title: 'Iteration 2 Roadmap',
    content: `## Next Steps

| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Streaming pass-through via SSE | Backend | Planned |
| 2 | Tenant-level rate limiting | Platform | Planned |
| 3 | Token usage dashboard | Frontend | Backlog |
| 4 | Multi-region failover | Infra | Research |
| 5 | Fine-tuning pipeline integration | ML | Backlog |

### Acceptance Criteria for Iteration 2
- [ ] All streaming endpoints tested under 1000 concurrent connections
- [ ] Rate limiting enforced at < 5ms overhead
- [ ] Dashboard shows real-time token burn rate
`,
  },
];
