import dagre from '@dagrejs/dagre';
import { kindLabels, type Environment, type Kind } from './domain';
import { formatMoney, summarize, type Ledger } from './ledger';
import { compatibilityLabels } from './compatibility';

export const groupColors: Record<Kind, string> = {
  'user-group': '#2563eb', 'licence-entitlement': '#0d9488', agent: '#7c3aed', 'usage-profile': '#475569',
  'model-deployment': '#2563eb', 'supporting-resource': '#d97706', 'security-policy': '#475569',
};
const rank: Kind[] = ['user-group', 'licence-entitlement', 'agent', 'usage-profile', 'model-deployment', 'supporting-resource', 'security-policy'];
export function logicalGraph(env: Environment, result: Ledger) {
  const graph = new dagre.graphlib.Graph({ multigraph: true });
  graph.setGraph({ rankdir: 'TB', marginx: 16, marginy: 16, nodesep: 18, ranksep: 42 });
  graph.setDefaultEdgeLabel(() => ({}));
  const nodes = [...env.objects].sort((a, b) => rank.indexOf(a.kind) - rank.indexOf(b.kind) || a.id.localeCompare(b.id));
  const nodeKeys = new Map(nodes.map((item, index) => [item.id, 'node-' + index]));
  const key = (id: string) => nodeKeys.get(id)!;
  for (const item of nodes) graph.setNode(key(item.id), { width: 218, height: 66 });
  const edges = env.relationships.filter(edge => edge.to !== env.id);
  for (const edge of edges) graph.setEdge(key(edge.from), key(edge.to), {}, edge.type);
  dagre.layout(graph);
  return {
    width: Math.max(260, graph.graph().width || 0), height: Math.max(100, graph.graph().height || 0),
    nodes: nodes.map(item => {
      const billable = result.lines.filter(line => line.objectId === item.id);
      const cost = summarize(billable, env.currency).current;
      const monthly = !billable.length ? undefined : cost.incomplete === billable.length
        ? 'Current cost unknown' : `${formatMoney(cost.known, env.currency)}/mo${cost.incomplete ? ' + unknown' : ''}`;
      const comparison = result.capacityComparisons.find(row => row.id === item.id);
      const annotation = comparison ? `${monthly} · PAYG comparison ${formatMoney(comparison.payg, env.currency)}` : monthly;
      return ({
      id: item.id, name: item.name, kind: item.kind, type: kindLabels[item.kind], color: groupColors[item.kind],
      incomplete: result.issues.some(issue => issue.id === item.id) || result.lines.some(line => line.objectId === item.id && line.amounts.current === null) ||
        result.technicalFindings.some(finding => finding.id === item.id && finding.status !== 'compatible'),
      compatibility: [...new Set(result.technicalFindings.filter(finding => finding.id === item.id).map(finding => compatibilityLabels[finding.status]))],
      shared: item.kind === 'model-deployment' && edges.filter(edge => edge.to === item.id && ['agent-uses-deployment', 'agent-uses-prompt-model'].includes(edge.type)).length > 1,
      annotation, ...graph.node(key(item.id)),
    }); }),
    edges: edges.map(edge => ({ ...edge, points: graph.edge(key(edge.from), key(edge.to), edge.type).points as { x: number; y: number }[] })),
  };
}
