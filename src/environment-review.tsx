import { lazy, Suspense } from 'react';
import type { Environment } from './domain';
import { licensingTarget, technicalTarget, type EditTarget } from './estimate-ui';
import { routeHref } from './navigation';
import type { governance, Ledger } from './ledger';
import { findingStatus } from './validation-ui';

const Architecture = lazy(() => import('./diagram'));
const tabs = { overview: 'Overview', architecture: 'Architecture', technical: 'Technical fit', controls: 'Controls' } as const;
export type ReviewView = keyof typeof tabs;

type Advice = ReturnType<typeof governance>;
type Props = {
  env: Environment; result: Ledger; advice: Advice; view: ReviewView;
  edit: (target: EditTarget) => void; select: (id: string) => void; openAdvanced: () => void;
};

const controlGroups = {
  identity: 'Identity and access', approval: 'Human approval', audit: 'Audit and monitoring',
  dlp: 'Data protection', budget: 'Budget and usage controls',
} satisfies Record<Advice[number]['control'], string>;
const declaredStatus: Record<string, string> = {
  'Modelled control': 'Declared implemented', Planned: 'Planned', 'Requires validation': 'Absent',
  Unknown: 'Unknown', 'Conflicting declarations': 'Conflicting declarations',
};

function TechnicalFit({ env, result, edit }: Pick<Props, 'env' | 'result' | 'edit'>) {
  const byComponent = new Map<string, { finding: Ledger['technicalFindings'][number] | Ledger['licensingFindings'][number]; target: EditTarget; licensing?: true }[]>();
  function append(id: string, row: NonNullable<ReturnType<typeof byComponent.get>>[number]) {
    const entries = byComponent.get(id);
    if (entries) entries.push(row);
    else byComponent.set(id, [row]);
  }
  for (const item of result.technicalFindings) append(item.id, { finding: item, target: technicalTarget(item) });
  const objects = new Map(env.objects.map(item => [item.id, item]));
  for (const item of result.licensingFindings) {
    const object = objects.get(item.id);
    if (object) append(item.id, { finding: item, target: licensingTarget(object, item.title), licensing: true });
  }
  const priority: Record<string, number> = { incompatible: 0, 'Action required': 0, unverified: 1, Unverified: 1, conditional: 2, Conditional: 2 };
  const weight = (status: string) => priority[status] ?? 3;
  return <section className="panel padded">
    <h2>Technical fit</h2>
    <p className="muted">Check the declared configuration against reviewed evidence. A matching price only establishes the billing basis.</p>
    {!byComponent.size && <p className="muted">Technical and licence checks appear as you add applicable components.</p>}
    {[...byComponent].sort(([, a], [, b]) => Math.min(...a.map(row => weight(row.finding.status))) - Math.min(...b.map(row => weight(row.finding.status))))
      .map(([id, rows]) => <details key={id} className="guided-disclosure review-disclosure">
        <summary>{objects.get(id)?.name ?? env.name} · {[...new Set(rows.map(row => findingStatus(row.finding)))].join(' · ')}</summary>
        <ul className="readiness-list">{[...rows].sort((a, b) => weight(a.finding.status) - weight(b.finding.status)).map(({ finding, licensing, target }, index) =>
          <li key={index}><div><strong>{finding.title}</strong>
            <p className="muted">{licensing ? 'Licensing' : 'Technical'} · {findingStatus(finding)}</p>
            <p>{finding.detail}</p>
            {finding.source && <a href={finding.source} target="_blank" rel="noreferrer">Microsoft evidence{finding.verifiedOn ? ` · reviewed ${finding.verifiedOn}` : ''}</a>}
          </div><button className="button" onClick={() => edit(target)} aria-label={`Review ${finding.title.toLowerCase()} for ${objects.get(id)?.name ?? env.name}`}>Review input</button></li>)}</ul>
      </details>)}
  </section>;
}

function Controls({ env, advice, edit, openAdvanced }: Pick<Props, 'env' | 'advice' | 'edit' | 'openAdvanced'>) {
  const agents = env.objects.filter(item => item.kind === 'agent');
  const names = new Map(env.objects.map(item => [item.id, item.name]));
  const applicable = new Map(advice.map(item => [JSON.stringify([item.id, item.control]), item]));
  const assessedDeclarations = new Set(advice.flatMap(item => item.declarationIds));
  const other = env.objects.filter(item => item.kind === 'security-policy' && !assessedDeclarations.has(item.id));
  const policyTarget = (id: string) => ({ id, field: 'controlStatus', section: 'Configuration' }) as const;
  return <section className="panel padded">
    <h2>Controls</h2>
    <p className="muted">These checks use your declarations. Confirm how controls work in the actual environment. Advisory ruleset 1.0.0.</p>
    {!agents.length && <p className="muted">Add an agent to assess which controls apply.</p>}
    {agents.length > 0 && Object.entries(controlGroups).map(([control, label]) => <details key={control} className="guided-disclosure review-disclosure">
      <summary>{label}</summary>
      <ul className="readiness-list">{agents.map(agent => {
        const item = applicable.get(JSON.stringify([agent.id, control]));
        return <li key={agent.id}><div><strong>{agent.name}</strong>
          <p className="muted">{item ? declaredStatus[item.status] : 'Not assessed'}</p>
          <p>{item?.why ?? 'This check is outside the declared scope of the agent.'}</p>
          {item && <a href={item.source} target="_blank" rel="noreferrer">Microsoft guidance</a>}
        </div>{!!item?.declarationIds.length && <div className="actions">{item.declarationIds.map(id =>
          <button className="button" key={id} onClick={() => edit(policyTarget(id))}>Review {names.get(id)}</button>)}</div>}</li>;
      })}</ul>
    </details>)}
    {!!other.length && <details className="guided-disclosure review-disclosure"><summary>Declarations outside these checks</summary>
      <ul className="readiness-list">{other.map(policy => <li key={policy.id}><div><strong>{policy.name}</strong><p>Not assessed</p></div>
        <button className="button" onClick={() => edit(policyTarget(policy.id))}>Review declaration</button></li>)}</ul></details>}
    <div className="actions"><button className="button" onClick={openAdvanced}>Open Advanced builder</button></div>
  </section>;
}

export function EnvironmentReview({ env, result, advice, view, edit, select, openAdvanced }: Props) {
  const count = (kind: Environment['objects'][number]['kind']) => env.objects.filter(item => item.kind === kind).length;
  const assessed = result.technicalFindings.length + result.licensingFindings.length;
  const fit = result.technicalFindings.filter(item => item.status !== 'compatible').length
    + result.licensingFindings.filter(item => item.status !== 'Verified').length;
  return <div className="page-stack">
    <nav className="mode-control view-choice" aria-label="Environment review views">
      {Object.entries(tabs).map(([id, text]) => <a className="button" key={id} href={routeHref('review', id === 'overview' ? undefined : id)}
        aria-current={view === id ? 'page' : undefined}>{text}</a>)}
    </nav>
    {view === 'overview' && <section className="panel padded">
      <h2>Review your design</h2>
      <p className="muted">Explore the modelled design, compatibility evidence and declared controls.</p>
      <dl className="usage-values">
        <div><dt>Modelled design</dt><dd>{count('agent')} agents · {count('model-deployment')} deployments · {env.relationships.length} declared relationships</dd></div>
        <div><dt>Technical and licence checks</dt><dd>{fit ? `${fit} items to check` : assessed ? 'No outstanding findings in the assessed scope' : 'No applicable checks yet'}</dd></div>
        <div><dt>Declared controls</dt><dd>{count('security-policy') ? `${count('security-policy')} policy declarations` : 'No policy declarations entered'}</dd></div>
      </dl>
    </section>}
    {view === 'architecture' && <Suspense fallback={<p role="status">Preparing diagram…</p>}><Architecture {...{ env, result, select }} /></Suspense>}
    {view === 'technical' && <TechnicalFit {...{ env, result, edit }} />}
    {view === 'controls' && <Controls {...{ env, advice, edit, openAdvanced }} />}
  </div>;
}
