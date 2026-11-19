import { edgeKinds, kindLabels, type Environment } from './domain';
import { logicalGraph } from './graph';
import type { Ledger } from './ledger';
import { colour, ink, margin, type ReportLayout } from './report-layout';

export function architecture(layout: ReportLayout, environment: Environment, result: Ledger) {
  const graph = logicalGraph(environment, result);
  const refs = new Map([[environment.id, 'ENV'], ...graph.nodes.map((node, index) =>
    [node.id, `N${String(index + 1).padStart(3, '0')}`] as const)]);
  const names = new Map([[environment.id, environment.name], ...graph.nodes.map(node => [node.id, node.name] as const)]);
  const compact = graph.nodes.length <= 3 && graph.width <= 510 && graph.height <= 310;
  layout.section('Logical architecture', 'Declared logical relationships in a modelled plan. Validate deployed topology, network connectivity, security boundaries and technical compatibility independently.', !compact);
  const scale = Math.min(1, layout.width / graph.width, (layout.remaining - 74) / graph.height);
  if (!graph.nodes.length) {
    layout.callout('No modelled components', 'Add objects and declare their relationships in Environment Builder to produce an architecture plan.');
    return;
  }
  if (scale >= .87 && graph.nodes.length <= 28) {
    const page = layout.page;
    const top = layout.y - 5;
    const left = margin + (layout.width - graph.width * scale) / 2;
    const point = ({ x, y }: { x: number; y: number }) => ({ x: left + x * scale, y: top - y * scale });
    for (const edge of graph.edges) {
      edge.points.slice(1).forEach((next, index) => page.drawLine({
        start: point(edge.points[index]), end: point(next), color: colour.muted, thickness: .85,
      }));
      if (edge.points.length < 2) continue;
      const end = point(edge.points.at(-1)!);
      const previous = point(edge.points.at(-2)!);
      const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
      for (const wing of [-.55, .55]) page.drawLine({ start: end,
        end: { x: end.x - 6 * Math.cos(angle + wing), y: end.y - 6 * Math.sin(angle + wing) },
        color: colour.muted, thickness: 1,
      });
    }
    for (const node of graph.nodes) {
      const x = left + (node.x - node.width / 2) * scale;
      const y = top - (node.y - node.height / 2) * scale;
      const width = node.width * scale;
      const height = node.height * scale;
      page.drawRectangle({ x, y: y - height, width, height, color: colour.canvas, borderColor: colour.border, borderWidth: .6 });
      page.drawRectangle({ x, y: y - height, width: 3, height, color: ink(node.color) });
      const title = { size: 11.4, bold: true };
      const name = layout.wrap(node.name, width - 20, title).length > 2 ? 'See full name in register' : node.name;
      layout.at(refs.get(node.id)!, x + 10, y - 5, width - 20, { size: 8.3, bold: true, color: ink(node.color) });
      layout.at(name, x + 10, y - 17, width - 20, title);
      layout.at([node.type, node.shared && 'Shared', node.incomplete && 'Review'].filter(Boolean).join(' · '),
        x + 10, y - height + 15, width - 20, { size: 8.8, color: colour.muted });
    }
    layout.y = top - graph.height * scale - 17;
    layout.paragraph('Arrows show the declared direction. Colour and the type label identify each kind. Shared marks a reused deployment. Review marks a draft, an unresolved charge or a condition to check. Environment-level relationships appear in the register.', { size: 9, color: colour.muted });
  } else {
    layout.subhead('Grouped relationship map');
    layout.paragraph('The overview groups links by type at readable size. The complete component and relationship registers below identify every declared link and preserve full names.', { color: colour.muted });
    const counts = new Map<keyof typeof edgeKinds, number>();
    for (const edge of environment.relationships) counts.set(edge.type, (counts.get(edge.type) ?? 0) + 1);
    if (counts.size) layout.table([
      { title: 'Source type', width: .25 }, { title: 'Direction and relationship', width: .4 },
      { title: 'Target type', width: .25 }, { title: 'Links', width: .1, align: 'right' },
    ], [...counts].map(([type, count]) => [
      kindLabels[edgeKinds[type][0]], `→ ${type.replaceAll('-', ' ')}`,
      edgeKinds[type][1] === 'environment' ? 'Environment' : kindLabels[edgeKinds[type][1]], String(count),
    ]), { caption: 'Grouped relationship map' });
    else layout.paragraph('No relationships have been declared.');
    layout.paragraph('Type and status labels identify shared deployments and components requiring review. Use the references below to trace an individual link.', { size: 9, color: colour.muted });
  }
  layout.table([
    { title: 'Ref.', width: .09 }, { title: 'Full component name', width: .29 }, { title: 'Type', width: .19 },
    { title: 'Status and compatibility', width: .215 }, { title: 'Estimate note', width: .215 },
  ], graph.nodes.map(node => [
    { text: refs.get(node.id)!, color: ink(node.color), bold: true }, node.name, node.type,
    [node.shared && 'Shared', node.incomplete && 'Requires review', ...node.compatibility].filter(Boolean).join('\n') || 'Declared',
    node.annotation ?? '—',
  ]), { caption: 'Component register', heading: 'Component register' });
  if (!environment.relationships.length) {
    layout.subhead('Relationship register');
    layout.paragraph('No relationships have been declared.');
  }
  else layout.table([
    { title: 'From', width: .29 }, { title: 'Declared relationship', width: .34 }, { title: 'To', width: .29 }, { title: 'Link', width: .08 },
  ], environment.relationships.map((edge, index) => [
    `${refs.get(edge.from)}  ${names.get(edge.from)}`,
    [edge.type, edge.integration, edge.seats !== undefined && `${edge.seats} seats`, edge.effectiveOn].filter(Boolean).join('\n'),
    `${refs.get(edge.to)}  ${names.get(edge.to)}`, `R${String(index + 1).padStart(3, '0')}`,
  ]), { caption: 'Relationship register', heading: 'Relationship register' });
}
