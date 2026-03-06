import { useState } from 'react';
import CodeBlock from './CodeBlock';
import { ChevronDown, ChevronRight } from 'lucide-react';

function MethodBadge({ method }) {
  const colors = {
    get: '#10b981', post: '#6366f1', put: '#f59e0b',
    patch: '#8b5cf6', delete: '#ef4444',
  };
  return (
    <span style={{
      background: colors[method] || '#64748b',
      color: '#fff', fontWeight: 700, fontSize: 11,
      padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
      letterSpacing: 1, fontFamily: 'monospace',
    }}>
      {method}
    </span>
  );
}

function EndpointRow({ path, method, operation }) {
  const [open, setOpen] = useState(false);
  const schema = operation.requestBody?.content?.['application/json']?.schema;

  return (
    <div className="endpoint-row">
      <button className="endpoint-header" onClick={() => setOpen((v) => !v)}>
        <MethodBadge method={method} />
        <span className="endpoint-path">{path}</span>
        <span className="endpoint-summary">{operation.summary}</span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && (
        <div className="endpoint-body">
          {operation.description && <p className="endpoint-desc">{operation.description}</p>}
          {schema && (
            <>
              <h5>Request Body Schema</h5>
              <CodeBlock
                code={JSON.stringify(schema, null, 2)}
                language="json"
              />
            </>
          )}
          <h5>Responses</h5>
          {Object.entries(operation.responses || {}).map(([code, resp]) => (
            <div key={code} className="response-row">
              <span className="response-code" style={{ color: code.startsWith('2') ? '#10b981' : '#ef4444' }}>
                {code}
              </span>
              <span className="response-desc">{resp.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SchemaViewer({ spec }) {
  const [view, setView] = useState('visual'); // 'visual' | 'raw'

  if (!spec) return <div className="schema-empty">No spec loaded.</div>;

  return (
    <div className="schema-viewer">
      <div className="schema-info">
        <h3>{spec.info?.title}</h3>
        <span className="schema-version">v{spec.info?.version}</span>
        <span className="openapi-badge">OpenAPI {spec.openapi}</span>
        <div className="schema-tabs">
          <button className={view === 'visual' ? 'active' : ''} onClick={() => setView('visual')}>Visual</button>
          <button className={view === 'raw' ? 'active' : ''} onClick={() => setView('raw')}>Raw JSON</button>
        </div>
      </div>

      {view === 'visual' ? (
        <div className="endpoints-list">
          {Object.entries(spec.paths || {}).map(([path, methods]) =>
            Object.entries(methods).map(([method, op]) => (
              <EndpointRow key={`${method}-${path}`} path={path} method={method} operation={op} />
            ))
          )}
        </div>
      ) : (
        <CodeBlock code={JSON.stringify(spec, null, 2)} language="json" filename="openapi.json" />
      )}
    </div>
  );
}
