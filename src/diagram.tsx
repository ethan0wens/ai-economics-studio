import { useMemo, useRef } from 'react';
import { ArrowDownToLine, GitFork } from 'lucide-react';
import { download } from './download';
import { logicalGraph } from './graph';
import { kindLabels, type Environment } from './domain';
import type { Ledger } from './ledger';

export default function Architecture({ env, result, select }: { env: Environment; result: Ledger; select: (id: string) => void }) {
  const graph = useMemo(() => logicalGraph(env, result), [env, result]);
  const svg = useRef<SVGSVGElement>(null);
  const names = new Map([[env.id, env.name], ...env.objects.map(item => [item.id, item.name] as const)]);
  return <section className="panel padded">
    <div className="section-heading"><div><h2>Logical architecture</h2><p className="muted">Relationships declared in the workspace. Activate a node to inspect it.</p></div>
      <button className="button" disabled={!graph.nodes.length} onClick={() => {
        if (svg.current) download(new XMLSerializer().serializeToString(svg.current), 'logical-architecture.svg', 'image/svg+xml');
      }}><ArrowDownToLine size={16} /> Export SVG</button></div>
    {!graph.nodes.length ? <div className="empty"><span className="empty-icon"><GitFork size={24} /></span><h3>No objects to diagram</h3><p>Add objects and link them in the builder.</p></div> :
      <div className="diagram-frame">
        <svg ref={svg} width={graph.width} height={graph.height} viewBox={`0 0 ${graph.width} ${graph.height}`}
          xmlns="http://www.w3.org/2000/svg" aria-label="Logical architecture graph" fontFamily="system-ui" role="group">
          <title>AI Economics Studio logical architecture</title>
          <defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#61738c" /></marker></defs>
          {graph.edges.map(edge => <polyline key={JSON.stringify([edge.from, edge.to, edge.type])} points={edge.points.map(point => `${point.x},${point.y}`).join(' ')}
            fill="none" stroke="#61738c" strokeWidth="1.5" markerEnd="url(#arrow)"><title>{names.get(edge.from)} → {names.get(edge.to)} · {edge.type}{result.technicalFindings.filter(finding => finding.id === edge.from && finding.related === edge.to).map(finding => ` · ${finding.status}`).join('')}</title></polyline>)}
          {graph.nodes.map(node => <g key={node.id} transform={`translate(${node.x - node.width / 2} ${node.y - node.height / 2})`}
            role="button" tabIndex={0} aria-label={`Inspect ${node.name}`} onClick={() => select(node.id)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(node.id); } }}>
            <title>{node.name} · {node.type}{node.compatibility.length ? ` · ${node.compatibility.join(' · ')}` : node.incomplete ? ' · Needs review' : ''}{node.annotation ? ` · ${node.annotation}` : ''}</title>
            <rect width={node.width} height={node.height} rx={9} fill="#fff" stroke={node.color} />
            <text x="11" y="23" fontSize="14" fill="#17243b" fontWeight="700">{node.name.length > 24 ? node.name.slice(0, 23) + '…' : node.name}</text>
            <text x="11" y="45" fontSize="11" fill="#475569">{node.type}{node.shared ? ' · Shared' : ''}{node.incomplete ? ' · Needs review' : ''}</text>
          </g>)}
        </svg>
      </div>}
    <p className="muted">Conceptual model for planning. Deployment topology, traffic and security boundaries are outside its scope.</p>
    {graph.nodes.length > 0 && <div className="table-wrap"><table><caption>Architecture objects and outgoing links</caption><thead><tr><th>Object</th><th>Type</th><th>Status</th><th>Current cost</th><th>Declared dependencies</th></tr></thead>
      <tbody>{env.objects.map(item => <tr key={item.id}><td><button className="link-button" onClick={() => select(item.id)}>{item.name}</button></td><td>{kindLabels[item.kind]}</td>
        <td>{graph.nodes.find(node => node.id === item.id)?.compatibility.join(' · ') ||
          (graph.nodes.find(node => node.id === item.id)?.incomplete ? 'Needs review' : 'Configured')}</td>
        <td>{graph.nodes.find(node => node.id === item.id)?.annotation ?? '—'}</td>
        <td>{env.relationships.filter(edge => edge.from === item.id).map(edge => `${edge.type}: ${names.get(edge.to)}`).join(' · ') || 'None declared'}</td></tr>)}</tbody></table></div>}
  </section>;
}
