import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react'

// Detect language from file extension
function detectLanguage(filename) {
  if (!filename) return 'text'
  const ext = filename.split('.').pop()?.toLowerCase()
  const map = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift',
    kt: 'kotlin', scala: 'scala', sh: 'bash', bash: 'bash', zsh: 'bash',
    yaml: 'yaml', yml: 'yaml', toml: 'toml', json: 'json', md: 'markdown',
    html: 'html', css: 'css', scss: 'scss', sql: 'sql', dockerfile: 'dockerfile',
  }
  return map[ext] || 'text'
}

// Parse highlight range "10-20,30" → Set of line numbers
function parseHighlightLines(rangeStr) {
  const lines = new Set()
  if (!rangeStr) return lines
  for (const part of String(rangeStr).split(',')) {
    const [start, end] = part.trim().split('-').map(Number)
    if (!isNaN(start)) {
      const to = end ?? start
      for (let i = start; i <= to; i++) lines.add(i)
    }
  }
  return lines
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button className="code-copy-btn" onClick={copy} title="Copy code">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function CodeViewPane({ code, language, filename, highlightLines = new Set(), maxHeight = '420px' }) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!code) { setHtml(''); setLoading(false); return }
    setLoading(true)
    setError(null)

    // Dynamic import of shiki to avoid SSR issues
    import('shiki').then(({ codeToHtml }) =>
      codeToHtml(code, {
        lang: language || 'text',
        theme: 'github-dark',
        transformers: [
          {
            line(el, line) {
              if (highlightLines.has(line)) {
                el.properties['data-highlighted'] = 'true'
              }
            },
          },
        ],
      })
    ).then((result) => {
      setHtml(result)
      setLoading(false)
    }).catch((err) => {
      // Fallback: render as plain text if language not supported
      import('shiki').then(({ codeToHtml }) =>
        codeToHtml(code, { lang: 'text', theme: 'github-dark' })
      ).then((result) => {
        setHtml(result)
        setLoading(false)
      }).catch(() => {
        setError(err.message)
        setLoading(false)
      })
    })
  }, [code, language, highlightLines])

  if (loading) {
    return (
      <div className="code-view-loading">
        <div className="code-shimmer" style={{ height: maxHeight }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="code-view-error">
        <pre>{code}</pre>
      </div>
    )
  }

  return (
    <div
      className="code-view-body"
      style={{ maxHeight, overflowY: 'auto', overflowX: 'auto' }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// Single file view
function SingleFileView({ filename, code, language, highlight }) {
  const [collapsed, setCollapsed] = useState(false)
  const highlightLines = parseHighlightLines(highlight)
  const lang = language || detectLanguage(filename)

  return (
    <div className="code-file-panel">
      <div className="code-file-header" onClick={() => setCollapsed((c) => !c)}>
        <span className="code-file-chevron">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>
        <span className="code-file-name">{filename || 'code'}</span>
        <span className="code-lang-badge">{lang}</span>
        <CopyButton text={code} />
      </div>
      {!collapsed && (
        <CodeViewPane
          code={code}
          language={lang}
          filename={filename}
          highlightLines={highlightLines}
        />
      )}
    </div>
  )
}

// Multi-file tab view
function MultiFileTabView({ fileContents, files, highlight = [] }) {
  const fileList = files || Object.keys(fileContents)
  const [activeFile, setActiveFile] = useState(fileList[0])

  const getHighlight = useCallback((filepath) => {
    const h = highlight.find((h) => h.file === filepath || filepath.endsWith(h.file))
    return h?.lines || ''
  }, [highlight])

  if (fileList.length === 0) return null

  const currentCode = fileContents[activeFile] || ''
  const lang = detectLanguage(activeFile)

  return (
    <div className="code-tab-container">
      <div className="code-tabs">
        {fileList.map((f) => (
          <button
            key={f}
            className={`code-tab ${f === activeFile ? 'active' : ''}`}
            onClick={() => setActiveFile(f)}
          >
            {f.split('/').pop()}
          </button>
        ))}
        <div className="code-tab-spacer" />
        <CopyButton text={currentCode} />
      </div>
      <div className="code-tab-path">{activeFile}</div>
      <CodeViewPane
        code={currentCode}
        language={lang}
        filename={activeFile}
        highlightLines={parseHighlightLines(getHighlight(activeFile))}
        maxHeight="460px"
      />
    </div>
  )
}

/**
 * CodeView — Shiki-powered syntax-highlighted code viewer.
 *
 * Props:
 *   slide.fileContents  { [path]: string }  — populated by the server
 *   slide.files         string[]            — ordered file list
 *   slide.highlight     [{file, lines}]     — highlight ranges
 *   slide.code          string              — inline code (fallback)
 *   slide.language      string              — explicit language
 *   slide.filename      string              — filename for language detection
 */
export default function CodeView({ slide }) {
  const { fileContents, files, highlight, code, language, filename, description } = slide

  const hasFiles = fileContents && Object.keys(fileContents).length > 0

  return (
    <div className="code-view">
      {description && <p className="slide-description">{description}</p>}

      {hasFiles ? (
        files && files.length > 1 ? (
          <MultiFileTabView
            fileContents={fileContents}
            files={files}
            highlight={highlight}
          />
        ) : (
          // Single file from fileContents
          Object.entries(fileContents).map(([path, content]) => (
            <SingleFileView
              key={path}
              filename={path}
              code={content}
              highlight={highlight?.find((h) => h.file === path || path.endsWith(h.file))?.lines}
            />
          ))
        )
      ) : (
        // Inline code fallback
        <SingleFileView
          filename={filename}
          code={code || '// No code provided'}
          language={language}
        />
      )}
    </div>
  )
}
