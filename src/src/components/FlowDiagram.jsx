import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: 'client',   position: { x: 80,  y: 50  }, data: { label: 'Client Apps' },    style: nodeStyle('#6366f1') },
  { id: 'gateway',  position: { x: 340, y: 50  }, data: { label: 'API Gateway' },     style: nodeStyle('#6366f1') },
  { id: 'auth',     position: { x: 340, y: 180 }, data: { label: 'Auth Service' },    style: nodeStyle('#8b5cf6') },
  { id: 'router',   position: { x: 560, y: 50  }, data: { label: 'Request Router' },  style: nodeStyle('#6366f1') },
  { id: 'oai',      position: { x: 760, y: -30 }, data: { label: 'OpenAI Proxy' },    style: nodeStyle('#10b981') },
  { id: 'claude',   position: { x: 760, y: 80  }, data: { label: 'Claude Proxy' },    style: nodeStyle('#10b981') },
  { id: 'glm',      position: { x: 760, y: 190 }, data: { label: 'GLM Service' },     style: nodeStyle('#10b981') },
  { id: 'cache',    position: { x: 340, y: 310 }, data: { label: 'Redis Cache' },     style: nodeStyle('#f59e0b') },
  { id: 'db',       position: { x: 560, y: 310 }, data: { label: 'PostgreSQL' },      style: nodeStyle('#f59e0b') },
  { id: 'queue',    position: { x: 760, y: 310 }, data: { label: 'Task Queue' },      style: nodeStyle('#f59e0b') },
];

const initialEdges = [
  edge('client',  'gateway'),
  edge('gateway', 'auth'),
  edge('gateway', 'router'),
  edge('router',  'oai'),
  edge('router',  'claude'),
  edge('router',  'glm'),
  edge('gateway', 'cache'),
  edge('gateway', 'db'),
  edge('oai',     'queue', true),
];

function nodeStyle(color) {
  return {
    background: '#1e293b',
    color: '#e2e8f0',
    border: `2px solid ${color}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    boxShadow: `0 0 12px ${color}44`,
    minWidth: 130,
    textAlign: 'center',
  };
}

function edge(src, tgt, dashed = false) {
  return {
    id: `${src}-${tgt}`,
    source: src,
    target: tgt,
    animated: dashed,
    style: { stroke: '#6366f1', strokeWidth: dashed ? 1 : 2, strokeDasharray: dashed ? '5,5' : undefined },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
  };
}

export default function FlowDiagram() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback((p) => setEdges((e) => addEdge(p, e)), [setEdges]);

  return (
    <div style={{ width: '100%', height: '420px', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0f172a' }}
      >
        <Background color="#334155" gap={20} />
        <Controls style={{ background: '#1e293b', border: '1px solid #334155' }} />
        <MiniMap
          style={{ background: '#1e293b', border: '1px solid #334155' }}
          nodeColor="#6366f1"
          maskColor="#0f172a88"
        />
      </ReactFlow>
    </div>
  );
}
