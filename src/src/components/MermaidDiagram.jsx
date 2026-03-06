import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#818cf8',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#0f172a',
    mainBkg: '#1e293b',
    nodeBorder: '#6366f1',
    clusterBkg: '#1e293b',
    titleColor: '#e2e8f0',
    edgeLabelBackground: '#1e293b',
    sequenceNumberColor: '#e2e8f0',
    actorBkg: '#1e293b',
    actorBorder: '#6366f1',
    actorTextColor: '#e2e8f0',
    actorLineColor: '#94a3b8',
    signalColor: '#94a3b8',
    signalTextColor: '#e2e8f0',
  },
  flowchart: { htmlLabels: true, curve: 'basis' },
  sequence: { diagramMarginX: 20, diagramMarginY: 20, actorMargin: 80 },
});

let idCounter = 0;

export default function MermaidDiagram({ chart }) {
  const ref = useRef(null);
  const [error, setError] = useState(null);
  const [id] = useState(() => `mermaid-${++idCounter}`);

  useEffect(() => {
    if (!ref.current || !chart) return;
    setError(null);
    ref.current.removeAttribute('data-processed');
    ref.current.innerHTML = chart;

    mermaid.render(id, chart).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    }).catch((err) => {
      setError(err.message || 'Diagram render error');
    });
  }, [chart, id]);

  if (error) {
    return (
      <div className="mermaid-error">
        <p>Diagram error: {error}</p>
        <pre>{chart}</pre>
      </div>
    );
  }

  return <div ref={ref} className="mermaid-container" />;
}
