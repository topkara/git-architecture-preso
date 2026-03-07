# git-architecture-preso — Design Specification

> **Status**: DESIGN PHASE — Do not begin implementation until this document is reviewed and approved.

---

## 1. Overview

**git-architecture-preso** is a lightweight, git-integrated interactive presentation tool for software engineers. It surfaces the architecture of a codebase — components, API schemas, and architectural diagrams — as navigable slides, with an embedded Claude AI sidebar for real-time design conversations. The entire presentation is driven by the git repository itself: no external CMS, no separate data store.

### Design Goals

| Goal | Rationale |
|------|-----------|
| Git-native | Slides, context, and metadata live alongside source code |
| Zero-config to start | `npx git-arch-preso serve` in any repo produces a presentation |
| Interactive with AI | Embedded Claude sidebar understands the current slide's code/schema context |
| Live repo context | The app reads actual source files — not copies — via MCP filesystem integration |
| Presenter-friendly | Keyboard navigation, speaker notes, full-screen mode |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                       │
│                                                                   │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │     Slide Canvas         │  │     Claude Chat Sidebar      │  │
│  │  ┌───────────────────┐  │  │  ┌──────────────────────────┐│  │
│  │  │ SlideRenderer      │  │  │  │ Conversation Thread      ││  │
│  │  │  - MermaidView     │  │  │  │ Context Injection Panel  ││  │
│  │  │  - ReactFlowView   │  │  │  │ Suggested Questions      ││  │
│  │  │  - OpenAPIView     │  │  │  └──────────────────────────┘│  │
│  │  │  - CodeView        │  │  └──────────────────────────────┘  │
│  │  └───────────────────┘  │                                     │
│  │  ┌───────────────────┐  │                                     │
│  │  │ NavigationBar      │  │                                     │
│  │  │ SlideOutline       │  │                                     │
│  │  └───────────────────┘  │                                     │
│  └─────────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────┐        ┌─────────────────────────────┐
│   Local Dev Server  │        │   Claude API (Anthropic)    │
│  (Vite + Express)   │        │   claude-sonnet-4-6         │
│  - /api/slides      │        │   with MCP tool calls       │
│  - /api/files       │        └─────────────────────────────┘
│  - /api/chat (proxy)│
│  - Static assets    │
└─────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Git Repository (source of truth)              │
│  .preso/                                                         │
│  ├── manifest.yaml        # slide deck definition                │
│  ├── slides/              # optional .md slide overrides         │
│  └── theme.css            # optional custom theme                │
│  src/                     # actual source code (read-only)       │
│  openapi/                 # OpenAPI spec files                   │
│  architecture/            # Mermaid / draw.io diagrams           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure (the tool's own source)

```
git-architecture-preso/
├── src/
│   ├── client/                    # React frontend
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── slide/
│   │   │   │   ├── SlideCanvas.tsx
│   │   │   │   ├── SlideRenderer.tsx
│   │   │   │   ├── views/
│   │   │   │   │   ├── MermaidView.tsx
│   │   │   │   │   ├── ReactFlowView.tsx
│   │   │   │   │   ├── OpenAPIView.tsx
│   │   │   │   │   ├── CodeView.tsx
│   │   │   │   │   └── MarkdownView.tsx
│   │   │   │   └── SpeakerNotes.tsx
│   │   │   ├── nav/
│   │   │   │   ├── NavigationBar.tsx
│   │   │   │   ├── SlideOutline.tsx
│   │   │   │   └── KeyboardShortcuts.tsx
│   │   │   └── sidebar/
│   │   │       ├── ChatSidebar.tsx
│   │   │       ├── MessageThread.tsx
│   │   │       ├── ContextPanel.tsx
│   │   │       └── SuggestedQuestions.tsx
│   │   ├── hooks/
│   │   │   ├── useSlides.ts
│   │   │   ├── useChat.ts
│   │   │   ├── useKeyboardNav.ts
│   │   │   └── useRepoContext.ts
│   │   ├── store/
│   │   │   ├── slideStore.ts      # Zustand
│   │   │   └── chatStore.ts
│   │   └── types/
│   │       ├── slide.ts
│   │       └── chat.ts
│   └── server/                    # Express dev server + API
│       ├── index.ts
│       ├── routes/
│       │   ├── slides.ts          # GET /api/slides — loads manifest
│       │   ├── files.ts           # GET /api/files/:path — serves repo files
│       │   └── chat.ts            # POST /api/chat — Claude proxy
│       ├── lib/
│       │   ├── manifestParser.ts  # parses .preso/manifest.yaml
│       │   ├── gitContext.ts      # git log, blame, branch info
│       │   └── mcpBridge.ts       # MCP filesystem tool adapter
│       └── mcp/
│           ├── server.ts          # MCP server exposing repo filesystem
│           └── tools/
│               ├── readFile.ts
│               ├── listDirectory.ts
│               ├── searchCode.ts
│               └── getGitContext.ts
├── .preso/                        # Example presentation config
│   ├── manifest.yaml
│   └── slides/
├── tests/
├── docs/
└── DESIGN.md
```

---

## 4. Presentation Manifest Format

Each target repository adds a `.preso/manifest.yaml` that defines the slide deck. The tool can also auto-generate a starter manifest via `npx git-arch-preso init`.

```yaml
# .preso/manifest.yaml
title: "My Service Architecture"
author: "Jane Engineer"
theme: default              # default | dark | solarized | custom

slides:
  - id: overview
    title: "System Overview"
    type: architecture
    source: architecture/system.mmd    # Mermaid file
    notes: "High-level context. Press S for speaker notes."

  - id: api-auth
    title: "Authentication API"
    type: openapi
    source: openapi/auth.yaml
    filter:
      tags: [authentication]          # show only these tags
    notes: "Walk through OAuth2 flow."

  - id: user-service
    title: "UserService Component"
    type: component
    files:
      - src/services/UserService.ts
      - src/models/User.ts
    highlight:
      - { file: src/services/UserService.ts, lines: "45-89" }
    layout: split                     # split | full | tabs
    notes: "Focus on the validation logic."

  - id: data-flow
    title: "Data Flow"
    type: flow
    source: architecture/data-flow.json   # React Flow graph JSON
    notes: "Explain the event-driven pipeline."

  - id: component-map
    title: "Component Dependencies"
    type: dependency-graph
    auto: true                        # auto-generated from source imports
    root: src/
    depth: 3

  - id: custom-slide
    title: "Deployment Notes"
    type: markdown
    source: .preso/slides/deployment.md
```

### Slide Types

| Type | Renderer | Source |
|------|----------|--------|
| `architecture` | MermaidView | `.mmd` file |
| `flow` | ReactFlowView | React Flow JSON |
| `openapi` | OpenAPIView (Swagger UI React) | `.yaml`/`.json` OpenAPI spec |
| `component` | CodeView (Shiki) | One or more source files |
| `dependency-graph` | ReactFlowView (auto-built) | Scanned from imports |
| `markdown` | MarkdownView | `.md` file |
| `split` | Any two views side-by-side | Combined config |

---

## 5. Frontend Component Design

### 5.1 SlideCanvas & SlideRenderer

```
SlideCanvas
  ├── NavigationBar (top)           keyboard: ←/→, space
  ├── SlideRenderer (center)        switches on slide.type
  │     ├── MermaidView
  │     ├── ReactFlowView
  │     ├── OpenAPIView
  │     ├── CodeView
  │     └── MarkdownView
  ├── SlideOutline (left drawer)    toggle: O
  ├── SpeakerNotes (bottom drawer)  toggle: S
  └── ChatSidebar (right panel)     toggle: C
```

**SlideRenderer** receives a `Slide` object and switches on `slide.type` to mount the appropriate view. Each view is lazy-loaded.

### 5.2 MermaidView

- Library: `mermaid` (v11+)
- Renders `.mmd` content fetched from `/api/files/:path`
- Pan/zoom via `@svgdotjs/svg.js` or CSS transforms
- Diagram types supported: flowchart, sequenceDiagram, classDiagram, erDiagram, gitgraph
- Click-to-highlight: clicking a node sends its label as context to the chat sidebar

### 5.3 ReactFlowView

- Library: `@xyflow/react` (React Flow v12)
- Loads pre-authored JSON graphs OR auto-generates from dependency scan
- **Auto-dependency graph**: server-side `ts-morph` or `madge` parses imports → emits React Flow node/edge JSON
- Node types: `serviceNode`, `databaseNode`, `queueNode`, `externalNode`, `componentNode`
- Custom minimap, controls, and animated edges for data flow slides
- Click-to-select sends node metadata to chat context

### 5.4 OpenAPIView

- Library: `swagger-ui-react` for rich rendering, `@stoplight/elements` as alternative
- Loads OpenAPI 3.x spec from `/api/files/:path`
- `filter.tags` config reduces noise for focused slides
- "Try it out" disabled in presentation mode (enabled in interactive mode via toggle)
- Schema explorer: click a schema type → opens definition in a popover + sends to chat

### 5.5 CodeView

- Library: `shiki` (v1+) with VS Code themes
- Supports all languages via WASM grammar loading
- Features:
  - Line range highlighting (`highlight` config)
  - File tabs for multi-file slides
  - Git blame inline (fetched from `/api/git/blame`)
  - Search/jump to symbol
  - "Explain this code" button → injects selection into chat
- Diff mode: shows `git diff HEAD~1` for the file

### 5.6 ChatSidebar

See Section 7 for full design.

---

## 6. Navigation Design

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` / `Space` | Next slide |
| `←` | Previous slide |
| `O` | Toggle slide outline |
| `S` | Toggle speaker notes |
| `C` | Toggle chat sidebar |
| `F` | Toggle fullscreen |
| `G` | Go to slide number (opens prompt) |
| `?` | Show shortcut help overlay |
| `E` | Open current file in `$EDITOR` |

### Slide Outline

Left drawer listing all slides with:
- Thumbnail preview (rendered at 20% scale)
- Slide title
- Current slide indicator
- Click-to-jump

### URL State

Slide position is reflected in the URL hash: `/#/slides/3` — enables sharing specific slides and browser back/forward navigation.

---

## 7. Claude Chat Sidebar Design

### 7.1 Architecture

```
ChatSidebar
  ├── ContextPanel (collapsible)
  │     Shows what context is currently injected:
  │     - Current slide title/type
  │     - File(s) being displayed
  │     - Git branch, last commit
  │     - Selected code or diagram node (if any)
  ├── MessageThread
  │     - User messages (right-aligned)
  │     - Claude responses (left-aligned, markdown rendered)
  │     - Code blocks with copy button
  │     - "Insert into notes" action on Claude responses
  └── InputArea
        - Textarea with Shift+Enter for newlines
        - Send button
        - SuggestedQuestions chips (context-aware)
        - Attach context toggle (file picker from repo)
```

### 7.2 Context Injection Strategy

Each message to Claude is prepended with a **system context block** built from the current slide state:

```
[SYSTEM CONTEXT]
Presenting: "Authentication API" (slide 3 of 12)
Type: openapi
Spec file: openapi/auth.yaml
Repo: git@github.com:org/my-service.git (branch: main, commit: a3f9c12)
Filtered tags: authentication

Current OpenAPI excerpt:
<file content of openapi/auth.yaml — first 2000 tokens>

[END CONTEXT]
User: ...
```

For code slides, the highlighted file content is included. For architecture slides, the Mermaid source is included. The context panel shows a summary of what is injected so the user understands what Claude "sees."

### 7.3 Suggested Questions

Context-aware chips shown above the input. Generated lazily when slide changes:

- For `openapi` slides: "Explain the authentication flow", "What are the error responses?", "Suggest improvements to this schema"
- For `component` slides: "What does this class do?", "Are there any code smells?", "Write a unit test for line 67"
- For `architecture` slides: "What are the failure modes?", "How does data flow between these services?", "Suggest improvements"

Suggestions are pre-templated (no API call needed) — substituting slide title and file names.

### 7.4 Claude API Integration

**Endpoint**: `POST /api/chat`

The backend proxy:
1. Receives `{ messages, slideContext, mcpEnabled }` from frontend
2. Injects system prompt with slide context
3. If `mcpEnabled`, attaches MCP tool definitions (filesystem tools)
4. Streams response via SSE back to frontend
5. Frontend renders streamed markdown incrementally

**Model**: `claude-sonnet-4-6` (configurable via env `CLAUDE_MODEL`)

**MCP tool use**: When Claude needs to read additional files beyond what was injected, it calls `read_file` or `search_code` tools → server executes against local filesystem → result returned to Claude → Claude continues response. This allows Claude to self-navigate the repo during conversation.

---

## 8. MCP / Filesystem Integration Strategy

### 8.1 MCP Server (Local)

The dev server runs a local MCP server (stdio or HTTP) exposing the target repo's filesystem:

```typescript
// src/server/mcp/server.ts
const server = new McpServer({ name: "repo-context", version: "1.0.0" });

server.tool("read_file", { path: z.string() }, async ({ path }) => {
  // reads from repoRoot, sandboxed
  const content = await fs.readFile(resolve(repoRoot, path), "utf-8");
  return { content };
});

server.tool("list_directory", { path: z.string() }, async ({ path }) => {
  const entries = await fs.readdir(resolve(repoRoot, path), { withFileTypes: true });
  return { entries: entries.map(e => ({ name: e.name, type: e.isDirectory() ? "dir" : "file" })) };
});

server.tool("search_code", { query: z.string(), glob: z.string().optional() }, async ({ query, glob }) => {
  // ripgrep via execa
  const results = await ripgrep(repoRoot, query, glob);
  return { results };
});

server.tool("get_git_context", { file: z.string().optional() }, async ({ file }) => {
  const log = await git.log({ file, maxCount: 10 });
  const branch = await git.branch();
  return { branch: branch.current, recentCommits: log.all };
});
```

### 8.2 Security Sandboxing

- All file paths are resolved relative to `repoRoot` and validated to prevent directory traversal
- `.gitignore` entries are respected — files excluded from git are excluded from MCP reads
- Secrets pattern filter: files matching `**/.env`, `**/secrets*`, `**/*key*` are blocked unless user explicitly allows
- MCP server runs in same process as dev server (not exposed externally)

### 8.3 Claude Code Integration

When running inside Claude Code (the user's primary environment), the tool can optionally connect to the existing MCP infrastructure (OpenFaaS / FastMCP bridge) rather than spawning a new MCP server, by configuring:

```yaml
# .preso/manifest.yaml
mcp:
  mode: external               # external | local (default: local)
  url: http://127.0.0.1:8000/sse
```

This allows Garmin data, PostgreSQL queries, and other registered MCP tools to be available to Claude during the presentation conversation.

---

## 9. Dependency Graph Auto-Generation

For `type: dependency-graph` slides with `auto: true`:

**Server-side pipeline**:
1. `ts-morph` (TypeScript projects) or `madge` (JS) scans imports from `root` directory up to `depth` levels
2. Produces adjacency list: `{ node: string, imports: string[] }[]`
3. Converted to React Flow format: nodes positioned via `dagre` layout algorithm
4. Cached in memory; re-generated on file change (via `chokidar` watcher)
5. Served at `GET /api/slides/:id/graph`

**Node classification** (heuristic from file path):
- `src/services/*` → serviceNode (blue)
- `src/models/*` → dataNode (green)
- `src/routes/*` → routeNode (orange)
- `src/utils/*` → utilNode (gray)
- External packages → externalNode (dashed border)

---

## 10. Theming

```css
/* Default theme variables */
:root {
  --preso-bg: #1e1e2e;
  --preso-surface: #2a2a3e;
  --preso-accent: #89b4fa;
  --preso-text: #cdd6f4;
  --preso-code-theme: "catppuccin-mocha";
  --preso-slide-width: 1280px;
  --preso-slide-height: 720px;
  --preso-font-body: "Inter", system-ui;
  --preso-font-code: "JetBrains Mono", monospace;
}
```

Theme can be overridden in `.preso/theme.css`. Three built-in themes: `default` (dark), `light`, `solarized`.

---

## 11. CLI Interface

```bash
# Initialize presentation config in current git repo
npx git-arch-preso init

# Serve presentation (dev mode, with hot-reload)
npx git-arch-preso serve [--port 4000] [--repo /path/to/repo]

# Export to static HTML (for sharing)
npx git-arch-preso export --out ./dist

# Validate manifest
npx git-arch-preso validate
```

---

## 12. Key Design Decisions & Trade-offs

| Decision | Choice | Alternative Considered | Rationale |
|----------|--------|----------------------|-----------|
| Slide source | YAML manifest in `.preso/` | MDX files (like Slidev) | More structured; easier to reference file paths and auto-generate |
| Diagram rendering | Mermaid + React Flow | draw.io / mxGraph | Both are open-source, widely used in engineering; Mermaid for text-defined, React Flow for interactive |
| Code highlighting | Shiki | Prism, highlight.js | Best accuracy, VS Code grammar parity, WASM-based |
| API rendering | swagger-ui-react | Redoc, Stoplight Elements | Most familiar to engineers; easy tag filtering |
| State management | Zustand | Redux, Jotai | Minimal boilerplate for two small stores |
| Claude integration | Direct Anthropic SDK (server proxy) | Vercel AI SDK | Avoid vendor lock-in; simpler for CLI tool use case |
| MCP mode | Local stdio server (default) | External SSE | Works offline, no infra required; external mode opt-in |
| Build tool | Vite | webpack, esbuild | Fast HMR, first-class React support, simple config |

---

## 13. Open Questions for Review

1. **Export format**: Should the static export be a self-contained HTML file (single-file with inlined assets) or a directory served by any static host?
2. **Authentication for Claude API**: Should the tool read `ANTHROPIC_API_KEY` from env, or support a config file? Should it fall back to a local model (Ollama) when no key is present?
3. **Manifest auto-generation depth**: `npx git-arch-preso init` could scan the repo and suggest slides. How aggressive should this be? (opt-in scan vs. manual manifest)
4. **Collaboration mode**: Should the sidebar conversation be shareable (e.g., saved as `.preso/sessions/YYYY-MM-DD.json`)? Or is this strictly a local/ephemeral tool?
5. **Presenter vs. audience mode**: Should there be a read-only audience URL (served from same server) without the chat sidebar?
6. **Integration with Claude Code**: Should this tool detect when running inside Claude Code and automatically use the existing Claude Code conversation context?

---

## 14. Phased Implementation Plan

> **STOP** — Do not begin implementation until design is reviewed.

| Phase | Scope |
|-------|-------|
| **P1 — Core** | Manifest parsing, CLI serve, CodeView, MermaidView, keyboard nav, basic chat sidebar (no MCP) |
| **P2 — Diagrams** | ReactFlowView, dependency-graph auto-gen, OpenAPIView |
| **P3 — AI Context** | MCP filesystem server, context injection, suggested questions, git blame |
| **P4 — Polish** | Themes, static export, speaker notes, SlideOutline thumbnails |
| **P5 — Advanced** | External MCP mode, collaboration/session save, audience mode |

---

## 15. Framework Evaluation: reveal.js vs. Custom React

> **Decision**: Retain the custom React approach. This section documents the analysis.

### 15.1 What reveal.js Offers

[reveal.js](https://revealjs.com) is the dominant HTML/CSS/JS presentation framework. Its strengths:

- Polished slide transitions (fade, slide, zoom, cube)
- Built-in speaker notes window (press `S`)
- PDF export via `?print-pdf` query param
- Vertical slide stacks (section/chapter grouping)
- Plugin ecosystem: `RevealHighlight` (highlight.js), `RevealMarkdown`, `RevealSearch`, `RevealMath`
- Widely understood by engineers; battle-tested
- Themes out of the box (black, white, moon, sky, etc.)

### 15.2 Axis 1: Code and API Browsing

This is where the mismatch with reveal.js is most severe.

#### reveal.js Cons for Code/API Browsing

| Problem | Detail |
|---------|--------|
| **Fixed-viewport slides** | reveal.js enforces a fixed slide canvas (default 960×700 or 1280×720). Long source files, deep OpenAPI specs, and tall dependency graphs spill outside the viewport. Workarounds (overflow scroll, scale transforms) fight the framework and produce poor UX. |
| **highlight.js vs. Shiki** | The `RevealHighlight` plugin uses highlight.js, which has noticeably weaker grammar accuracy than Shiki (especially for TypeScript, JSX, and edge cases). The planned Shiki integration (VS Code grammar parity) cannot be dropped into reveal.js without a custom plugin of significant complexity. |
| **No file-loading abstraction** | reveal.js content is written as `<section>` HTML. Dynamically fetching file content from `/api/files/:path`, applying line-range highlights, and switching tabs between multiple files all require bespoke JavaScript that lives outside reveal.js's model — at which point reveal.js is just a div wrapper. |
| **swagger-ui-react incompatibility** | Swagger UI is a React component that expects a full React tree. Mounting it inside a reveal.js `<section>` requires a manual `ReactDOM.createRoot` call per slide — a fragile, non-idiomatic pattern that breaks React Fast Refresh and complicates state management. |
| **React Flow incompatibility** | Same problem: `@xyflow/react` is a React-specific library with its own context providers. Embedding it in reveal.js slides requires the same awkward manual mount pattern and produces z-index and event-bubbling conflicts with reveal.js's own overlay system. |
| **Multi-file tabs** | A `component` slide showing 3 source files with tabs has no reveal.js analog. Implementing it requires writing the tab component, state, and keyboard handling from scratch — which is exactly what the custom React approach already provides naturally. |
| **"Explain this code" button** | The design requires a button on highlighted code that injects the selection into the chat sidebar. In reveal.js, this cross-cutting integration (code view → sidebar state) requires a global event bus or shared module, whereas in React it is a single `usePresentationStore` call. |

#### reveal.js Pros for Code/API Browsing (limited)

- `RevealHighlight` handles simple code blocks with step-by-step line focus (`data-line-numbers="1-3|5-7"`) — useful for tutorial-style code walkthroughs but insufficient for the interactive code viewer this tool requires.

#### Custom React Wins Here

The custom approach treats each slide as a full React component. `CodeView` can implement scrollable code with file tabs, git blame gutter, line-range selection, Shiki themes, and diff mode — all using standard React patterns. `OpenAPIView` and `ReactFlowView` embed naturally because they are already React components. There is no friction.

---

### 15.3 Axis 2: LLM Interaction Loop (Chat Sidebar)

The chat sidebar is a persistent, always-visible UI panel that:
1. Receives the current slide's full context (type, files, schema, diagram source) automatically
2. Streams Claude responses (SSE) with incremental markdown rendering
3. Shows suggested questions that change per slide
4. Optionally triggers MCP tool calls (Claude reads files mid-conversation)
5. Can be toggled open/closed without losing conversation state

#### reveal.js Cons for Chat Sidebar

| Problem | Detail |
|---------|--------|
| **Full-screen layout conflict** | reveal.js takes over the entire viewport (`position: fixed; top: 0; left: 0; width: 100%; height: 100%`). A persistent 380px sidebar requires overriding `.reveal` CSS to apply a `margin-right` and constraining the slide canvas — effectively fighting the framework's core layout model on every render. |
| **Full-screen mode breaks sidebar** | reveal.js's built-in fullscreen (`F` key) calls the browser's Fullscreen API on the root element, which clips the sidebar entirely. The sidebar would need to be re-parented or the fullscreen feature disabled. |
| **Context injection requires event hooks** | The sidebar needs the current slide's content to build the Claude system prompt. In reveal.js this requires subscribing to the `slidechanged` event and then imperatively reading slide DOM content — a fragile extraction that breaks when slide content is dynamically loaded. In React, current slide content is always in the Zustand store, available synchronously. |
| **Streaming SSE + React state** | The streaming response rendering (incremental markdown) requires React state updates (`useState` + `useEffect`). Inside reveal.js, this code either lives in a manually mounted React island (awkward) or must be rewritten with vanilla DOM manipulation (expensive and brittle). |
| **Suggested questions per slide** | Questions change when the slide changes. In React, a `useEffect` on `currentSlide` handles this trivially. In reveal.js, it requires an event listener on `slidechanged` plus imperative DOM manipulation to swap question chips. |
| **MCP tool-use rendering** | When Claude calls `read_file` mid-conversation, the UI should show a "Reading `src/auth/middleware.ts`…" indicator. In React this is a message with a `type: 'tool-call'` field rendered by a component switch. In reveal.js it is custom DOM manipulation. |

#### reveal.js Pros for Chat Sidebar (none meaningful)

reveal.js has no sidebar concept and no LLM integration. Every aspect of the chat loop is custom code regardless of the presentation framework — but in reveal.js that custom code must interop with the framework via events and DOM manipulation, whereas in React it integrates naturally.

#### Custom React Wins Here

The persistent sidebar is a first-class layout concern. The flexbox layout (`slide canvas | chat sidebar`) is 10 lines of CSS. Zustand makes slide context universally available. SSE streaming, suggested question generation, and MCP tool-call rendering are all straightforward React patterns with no framework friction.

---

### 15.4 Where reveal.js Would Win

To be fair: if this tool's primary concern were **slide aesthetics and transition quality**, reveal.js would be superior.

| Use Case | reveal.js advantage |
|----------|-------------------|
| Polished transitions (cube, zoom, convex) | Built-in, GPU-accelerated |
| PDF/print export | First-class `?print-pdf` support |
| Speaker notes window | Built-in dual-display support |
| Non-technical audiences | Themes and visual polish out of the box |
| Zero-JS slide authors | Markdown plugin; no code required |

None of these are primary goals for **git-architecture-preso**, which targets engineers running a local dev server to navigate their own codebase. Slide transitions are a distraction; correctness and interactivity of the code/diagram/API views are what matter.

---

### 15.5 Hybrid Option (Considered and Rejected)

One could use reveal.js for slide navigation while mounting React components inside `<section>` elements. This was evaluated and rejected because:

1. **Two React roots**: Each `<section>` that needs React (CodeView, OpenAPIView, FlowView) requires a separate `ReactDOM.createRoot`. There is no shared context, no shared Zustand store instance without workarounds, and React DevTools become confusing.
2. **No HMR cohesion**: Vite's HMR works cleanly with a single React root. Multiple manual roots defeat this.
3. **Event conflicts**: reveal.js captures keyboard events (arrows, space, F, S, etc.); React keyboard handlers inside slides must call `stopPropagation` carefully. This is especially fraught for the chat sidebar's Shift+Enter vs. Enter handling.
4. **Net complexity**: The hybrid adds reveal.js's complexity on top of React's complexity without gaining enough to justify it.

---

### 15.6 Summary

| Criterion | reveal.js | Custom React |
|-----------|-----------|--------------|
| Slide transition quality | ✅ Excellent | ⚠️ Manual (CSS only) |
| PDF export | ✅ Built-in | ⚠️ Custom (P4) |
| Speaker notes | ✅ Built-in | ⚠️ Custom (P4) |
| Fixed-viewport enforcement | ❌ Hostile to scrollable code | ✅ Full layout control |
| Code view (Shiki, tabs, blame) | ❌ highlight.js only; no tabs | ✅ Native React components |
| OpenAPI viewer | ❌ Requires awkward React mount | ✅ swagger-ui-react natively |
| Interactive dependency graph | ❌ React Flow mount conflicts | ✅ @xyflow/react natively |
| Persistent chat sidebar | ❌ Fights full-screen layout | ✅ First-class flexbox layout |
| Slide context → Claude prompt | ❌ Event hooks, DOM extraction | ✅ Zustand store, synchronous |
| SSE streaming in sidebar | ❌ Vanilla DOM or React island | ✅ useState/useEffect |
| MCP tool-call rendering | ❌ Custom DOM manipulation | ✅ React component switch |
| Keyboard shortcut coexistence | ❌ Event capture conflicts | ✅ Single handler hierarchy |

**Verdict**: reveal.js is the right tool for visual slide decks. It is the wrong tool for an interactive engineering workbench where the "slides" are code viewers, API explorers, and interactive graphs anchored by a persistent LLM chat loop. The custom React SPA is the correct architectural choice and should be retained.
