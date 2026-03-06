# git-architecture-preso

**Interactive architecture presentations powered by live git context.**

Iteration-1 prototype — a React presentation app that renders architecture diagrams,
API schemas, source code and a simulated Claude design-discussion sidebar, all driven
by metadata pulled from the current git repository.

---

## Features

| Feature | Implementation |
|---------|----------------|
| Slide-based navigation | Arrow keys, Space, PageUp/PageDown, or dot-picker nav bar |
| Architecture diagrams | Mermaid (flowchart + sequence) |
| Interactive service graph | React Flow (drag & pan nodes) |
| OpenAPI schema viewer | Visual explorer + raw JSON toggle |
| Source code | Syntax-highlighted via react-syntax-highlighter |
| Design chat | Simulated Claude sidebar with starter prompts |
| Git context | Branch, commit history, last-commit banner on cover |

## Quick Start

```bash
cd src
npm install
npm run dev
# Open http://localhost:5173
```

## Build

```bash
cd src
npm run build      # outputs to src/dist/
npm run preview    # preview production build
```

## Project Structure

```
git-architecture-preso/
├── src/                    # Vite + React app
│   ├── src/
│   │   ├── slides/         # Slide definitions (slideData.js)
│   │   ├── components/     # MermaidDiagram, FlowDiagram, CodeBlock,
│   │   │                   # SchemaViewer, ChatSidebar, NavBar, SlideRenderer
│   │   ├── store/          # Zustand presentation state
│   │   ├── utils/          # gitContext.js (mock → swap for real API)
│   │   ├── App.jsx
│   │   └── App.css
│   ├── index.html
│   └── vite.config.js
├── docs/
├── tests/
└── scripts/
```

## Extending

### Add a slide
Edit `src/src/slides/slideData.js` — push a new entry with one of:
`cover | mermaid | flow | code | schema | commits | markdown`

### Connect to a real git repo
Replace the mock in `src/src/utils/gitContext.js` with a call to a local
Express/FastAPI server that shells out to `git log`, reads your `openapi.yaml`, etc.

### Real Claude chat
Swap the canned-response logic in `src/src/components/ChatSidebar.jsx`
with a call to the Anthropic Messages API (Claude 3.5 Sonnet recommended).

---

**Author:** Umut Topkara · **Year:** 2026 · **Iteration:** 1
