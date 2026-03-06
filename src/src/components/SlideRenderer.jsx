import MermaidDiagram from './MermaidDiagram';
import FlowDiagram from './FlowDiagram';
import CodeBlock from './CodeBlock';
import SchemaViewer from './SchemaViewer';
import { GitCommit, GitBranch, Clock } from 'lucide-react';

function MarkdownSlide({ content }) {
  // Simple markdown renderer (headers, lists, tables, blockquotes, code)
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i}>{renderInline(line.slice(2))}</blockquote>);
    } else if (line.startsWith('| ')) {
      // Table
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('| ')) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0].split('|').filter(Boolean).map(h => h.trim());
      const rows = tableLines.slice(2).map(row => row.split('|').filter(Boolean).map(c => c.trim()));
      elements.push(
        <table key={`t-${i}`}>
          <thead><tr>{headers.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{c}</td>)}</tr>)}</tbody>
        </table>
      );
      continue;
    } else if (/^- \[[ x]\]/.test(line)) {
      elements.push(
        <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <input type="checkbox" defaultChecked={line.includes('[x]')} readOnly />
          {renderInline(line.replace(/^- \[[ x]\] /, ''))}
        </label>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={i}>{renderInline(line.slice(2))}</li>);
    } else if (line.match(/^\d+\. /)) {
      elements.push(<li key={i} style={{ listStyleType: 'decimal', marginLeft: 20 }}>{renderInline(line.replace(/^\d+\. /, ''))}</li>);
    } else if (line === '') {
      elements.push(<br key={i} />);
    } else {
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
    i++;
  }

  return <div className="markdown-slide">{elements}</div>;
}

function renderInline(text) {
  // Bold, italic, code
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

function CommitsSlide({ gitContext }) {
  if (!gitContext) return <div className="loading-state">Loading git context…</div>;
  const { branch, lastCommit, recentCommits } = gitContext;
  return (
    <div className="commits-slide">
      <div className="branch-badge">
        <GitBranch size={16} />
        <span>{branch}</span>
      </div>
      <div className="commit-list">
        {recentCommits.map((c, i) => (
          <div key={c.hash} className={`commit-item ${i === 0 ? 'latest' : ''}`}>
            <GitCommit size={16} className="commit-icon" />
            <code className="commit-hash">{c.hash}</code>
            <span className="commit-msg">{c.message}</span>
          </div>
        ))}
      </div>
      <div className="latest-commit-detail">
        <Clock size={14} />
        <span>Last commit by <strong>{lastCommit.author}</strong> on {lastCommit.date}</span>
      </div>
    </div>
  );
}

export default function SlideRenderer({ slide, gitContext }) {
  if (!slide) return null;

  switch (slide.type) {
    case 'cover':
      return (
        <div className="slide-cover">
          <div className="cover-badge">Iteration 1 Prototype</div>
          <h1>{slide.title}</h1>
          <p className="cover-subtitle">{slide.subtitle}</p>
          <p className="cover-meta">{slide.meta}</p>
          {gitContext && (
            <div className="cover-git-info">
              <GitBranch size={14} />
              <span>{gitContext.branch}</span>
              <span className="dot">·</span>
              <GitCommit size={14} />
              <code>{gitContext.lastCommit?.hash}</code>
              <span className="dot">·</span>
              <span>{gitContext.lastCommit?.message}</span>
            </div>
          )}
        </div>
      );

    case 'mermaid':
      return (
        <div className="slide-diagram">
          {slide.description && <p className="slide-desc">{slide.description}</p>}
          <MermaidDiagram chart={slide.diagram} />
        </div>
      );

    case 'flow':
      return (
        <div className="slide-diagram">
          {slide.description && <p className="slide-desc">{slide.description}</p>}
          <FlowDiagram />
        </div>
      );

    case 'schema':
      return (
        <div className="slide-schema">
          {slide.description && <p className="slide-desc">{slide.description}</p>}
          <SchemaViewer spec={gitContext?.openApiSpec} />
        </div>
      );

    case 'code':
      return (
        <div className="slide-code">
          {slide.description && <p className="slide-desc">{slide.description}</p>}
          {gitContext?.sampleCode && (
            <CodeBlock
              code={gitContext.sampleCode.content}
              language={gitContext.sampleCode.language}
              filename={gitContext.sampleCode.filename}
            />
          )}
        </div>
      );

    case 'commits':
      return (
        <div className="slide-commits">
          {slide.description && <p className="slide-desc">{slide.description}</p>}
          <CommitsSlide gitContext={gitContext} />
        </div>
      );

    case 'markdown':
      return (
        <div className="slide-markdown">
          <MarkdownSlide content={slide.content} />
        </div>
      );

    default:
      return <div className="slide-unknown">Unknown slide type: {slide.type}</div>;
  }
}
