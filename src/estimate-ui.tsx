import { useState } from 'react';
import Decimal from 'decimal.js';
import { ArrowRight, CircleHelp } from 'lucide-react';
import type { Catalogue } from './catalogue';
import type { Environment, StudioObject } from './domain';
import { fieldHelp, type FieldId } from './field-help';
import { missingInputs } from './inspector-status';
import { categories, formatMoney, summarize, type Ledger } from './ledger';
import { LearnMore } from './learn-more';
import { linkedObject } from './guided-state';
import { costExplanation, regionName } from './presentation';

export type EditTarget = { id: string; field?: FieldId; section?: 'Configuration' | 'Usage' | 'Dependencies' | 'Costs'; line?: string };

const actions: Partial<Record<FieldId, string>> = {
  executions: 'Enter how often the agent will run each month', calls: 'Enter model requests per run',
  input: 'Enter input tokens per request', output: 'Enter output tokens per request', credits: 'Enter monthly Copilot Credits',
  creditCategory: 'Enter credits by activity', platform: 'Choose where the agent runs', modelSource: 'Choose how the agent uses a model',
  linkedDeployment: 'Attach a model deployment', usageLink: 'Enter the agent’s monthly workload',
  modelId: 'Choose a model', billingMode: 'Choose the deployment billing mode', capacity: 'Enter provisioned capacity',
  hours: 'Enter monthly billable hours', procurement: 'Confirm whether the licence is already owned', seats: 'Enter distinct seats',
  resourceQuantity: 'Enter monthly service usage',
};
const usageFields: FieldId[] = ['usageLink', 'credits', 'creditCategory', 'allowanceCredits', 'allowanceBasis', 'allowanceExpiry', 'capacity', 'hours', 'reservationRef'];

export function estimateBasis(env: Environment, result: Ledger) {
  return result.lines.some(line => line.agreement && line.agreement.mode !== 'retail') ? 'Includes customer pricing agreements' :
    env.pricingOverrides.some(rule => rule.mode !== 'retail') ? 'See the active rate on each cost line' : 'Uses verified Microsoft retail prices where available';
}

export function EstimateSummary({ env, result, catalogue, compact = false }: {
  env: Environment; result: Ledger; catalogue: Catalogue; compact?: boolean;
}) {
  const current = result.summary.current;
  const hasKnown = result.lines.some(line => line.amounts.current !== null);
  return <section className={`estimate-summary${compact ? ' estimate-compact' : ''}`} aria-label="Running estimate">
    <div className="estimate-numbers">
      <div className="metric"><span>Estimated monthly cost</span><strong>{hasKnown ? formatMoney(current.known, env.currency) : '—'}</strong>
        {!compact && <small>Based on the charges we can currently calculate.</small>}</div>
      <div className="metric"><span>Annualised estimate</span><strong>{hasKnown ? formatMoney(current.annual, env.currency) : '—'}</strong>
        {!compact && <small>Twelve months at the current estimated monthly rate, assuming the same usage and pricing.</small>}</div>
    </div>
    <div className="estimate-basis"><span>{estimateBasis(env, result)}</span>{catalogue.manifest.lastCheckedAt &&
      <span>Catalogue checked {catalogue.manifest.lastCheckedAt.slice(0, 10)}</span>}</div>
    {current.incomplete > 0 ? <div className="estimate-gap"><CircleHelp size={17} aria-hidden="true" /><div>
      <strong>Costs still to confirm</strong>
      <p>{hasKnown ? 'The known-cost subtotal excludes' : 'The studio cannot yet calculate'} {current.incomplete} unresolved {current.incomplete === 1 ? 'charge' : 'charges'}.</p>
    </div></div>
      : !hasKnown ? <p className="muted">Add a workload or a billable service to start estimating costs.</p>
      : new Decimal(current.known).isZero() ? <p className="muted">The calculated charges add up to zero. Check the itemised costs for usage and coverage.</p> : null}
    {/\billustrative\b|\bfictional\b/i.test(env.description ?? '') && <p className="estimate-example">Includes illustrative planning assumptions.</p>}
    {!compact && current.incomplete > 0 && <LearnMore guide="missingRate">Why are some costs missing?</LearnMore>}
  </section>;
}

type ReadinessItem = { key: string; title: string; name: string; detail?: string; source?: string; date?: string; status?: string; target: EditTarget };
const techFields: Record<string, FieldId> = {
  'Model deployment and region': 'deploymentRegion', 'Model lifecycle': 'modelVersion', 'Deployment and billing mode': 'billingMode',
  'Model input modality': 'inputModality', 'Model output modality': 'outputModality', 'Required model feature': 'requiredFeature',
  'Provisioned capacity': 'capacity', 'Throughput feasibility': 'peakInput', 'Agent platform': 'modelSource',
  'Foundry agent model': 'agentSetup', 'External prompt model': 'promptEndpoint', 'Azure AI Search integration': 'resourceIntegration',
  'Azure AI Search resource availability': 'deploymentRegion', 'Supporting resource configuration': 'deploymentRegion',
};
function licensingTarget(item: StudioObject, title: string): EditTarget {
  if (item.kind === 'agent') return { id: item.id, field: 'allowanceExpiry', section: 'Usage' };
  if (title === 'Contract replacement') return { id: item.id, field: 'replacementDate', section: 'Dependencies' };
  if (title === 'Seat overlap' || title === 'Potential duplicate seats') return { id: item.id, field: title === 'Seat overlap' ? 'seats' : 'seatScope' };
  return { id: item.id, field: 'relationship', section: 'Dependencies' };
}

export function readiness(env: Environment, result: Ledger) {
  const objects = new Map(env.objects.map(item => [item.id, item]));
  const charged = new Set(result.lines.map(line => line.objectId));
  const missing: ReadinessItem[] = [];
  for (const item of env.objects) {
    if (!['agent', 'usage-profile', 'model-deployment', 'licence-entitlement', 'supporting-resource'].includes(item.kind)) continue;
    if (item.kind === 'usage-profile') {
      const linked = env.relationships.filter(edge => edge.type === 'agent-uses-usage' && edge.to === item.id);
      const needed = linked.some(edge => {
        const model = linkedObject(env, edge.from, 'agent-uses-deployment', 'model-deployment');
        return charged.has(edge.from) || model?.allocationBasis === 'input-tokens';
      });
      if (!needed) continue;
    }
    const fields = missingInputs(item, env);
    for (const field of fields) missing.push({ key: `${item.id}:${field}`, name: item.name,
      title: actions[field] ?? `Enter ${fieldHelp[field].label.toLowerCase()}`,
      detail: field === 'usageLink' || field === 'executions' ? 'Add an estimate of how often this agent will be used so the studio can calculate its running cost.' : undefined,
      target: { id: item.id, field, section: usageFields.includes(field) ? 'Usage' : 'Configuration' } });
  }
  const price: ReadinessItem[] = result.lines.filter(line => line.amounts.current === null && line.meter && line.quantity !== null)
    .map(line => ({ key: line.id, name: line.object, title: `Review price for ${line.component.toLowerCase()}`,
      detail: `${line.currency} · ${line.meter!.unit} · ${regionName(line.meter!.region)}. ${costExplanation(line) ?? ''}`,
      target: { id: line.objectId, line: line.id, field: 'agreement' } }));
  const blockers: ReadinessItem[] = [];
  const advice: ReadinessItem[] = [];
  for (const item of result.technicalFindings) {
    if (item.status === 'compatible') continue;
    const object = objects.get(item.id);
    if (!object) continue;
    const field = techFields[item.title];
    if (missing.some(row => row.target.id === item.id && (row.target.field === field ||
      item.title === 'Agent platform' || item.title === 'Foundry agent model' && row.target.field === 'linkedDeployment'))) continue;
    const status = item.status === 'incompatible' ? 'Verified incompatible' : item.status === 'conditional' ? 'Conditional' : 'Unverified';
    const target: EditTarget = { id: item.id, field,
      section: field === 'resourceIntegration' ? 'Dependencies' : field && (usageFields.includes(field) || ['promptEndpoint', 'peakInput'].includes(field)) ? 'Usage' : 'Configuration' };
    (item.status === 'incompatible' ? blockers : advice).push({ key: `${item.id}:${item.title}:${item.related ?? ''}`, name: object.name,
      title: item.title, status, detail: item.detail, source: item.source, date: item.verifiedOn, target });
  }
  for (const item of result.licensingFindings) {
    if (item.status === 'Verified') continue;
    const object = objects.get(item.id);
    if (!object) continue;
    (item.status === 'Action required' ? blockers : advice).push({ key: `${item.id}:${item.rule ?? item.title}`, name: object.name,
      title: item.title, status: item.status, detail: item.detail, source: item.source, date: item.verifiedOn, target: licensingTarget(object, item.title) });
  }
  const costReview = result.lines.filter(line => line.amounts.current === null && !price.some(item => item.key === line.id) &&
    !missing.some(item => item.target.id === line.objectId || item.target.id === line.pricingOwner) && !blockers.some(item => item.target.id === line.objectId))
    .map(line => ({ key: line.id, name: line.object, title: `Review ${line.component.toLowerCase()}`, detail: costExplanation(line),
      target: { id: line.objectId, line: line.id } }));
  return { tasks: [...missing, ...price, ...blockers, ...costReview], advice };
}

export function EstimateReadiness({ env, result, edit }: { env: Environment; result: Ledger; edit: (target: EditTarget) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { tasks, advice } = readiness(env, result);
  const render = (items: ReadinessItem[]) => <ul className="readiness-list">{items.map((item, index) =>
    <li key={`${item.key}:${index}`}><div>
      <strong>{item.title}</strong><p className="muted">{item.name}{item.status ? ` · ${item.status}` : ''}</p>
      {item.detail && <p>{item.detail}</p>}
      {item.source && <a href={item.source} target="_blank" rel="noreferrer">Microsoft evidence{item.date ? ` · reviewed ${item.date}` : ''}</a>}
    </div><button className="button" onClick={() => edit(item.target)} aria-label={`Resolve ${item.title.toLowerCase()} for ${item.name}`}>
      Review <ArrowRight size={15} aria-hidden="true" /></button></li>)}</ul>;
  return <section className="panel padded readiness" aria-labelledby="readiness-title">
    <div className="section-heading"><h2 id="readiness-title" tabIndex={-1}>Improve your estimate</h2><LearnMore guide="completeness">Check what your estimate covers</LearnMore></div>
    <p className="muted">Review missing inputs and unresolved pricing before sharing.</p>
    {tasks.length ? render(expanded ? tasks : tasks.slice(0, 3))
      : <p className="muted">{result.lines.length ? 'All entered billable costs are resolved. Check any evidence that still needs confirming below.' : 'Add a workload or a billable service to review its costs.'}</p>}
    {tasks.length > 3 && <button className="link-button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      {expanded ? 'Show fewer actions' : `View all ${tasks.length} actions`}</button>}
    {!!advice.length && <details className="guided-disclosure"><summary>Evidence to confirm ({advice.length})</summary>
      <p className="muted">These conditions are separate from whether an amount has been priced.</p>{render(advice)}</details>}
  </section>;
}

const categoryNames = {
  Inference: 'Model inference', Orchestration: 'Copilot Studio usage', Licensing: 'New licences',
  Infrastructure: 'Supporting infrastructure', Governance: 'Modelled governance resources',
};
export function CostDrivers({ env, result }: { env: Environment; result: Ledger }) {
  const rows = categories.flatMap(category => {
    const lines = result.lines.filter(line => line.category === category);
    return lines.length ? [{ category, ...summarize(lines, env.currency).current, resolved: lines.some(line => line.amounts.current !== null) }] : [];
  }).sort((a, b) => new Decimal(b.known).comparedTo(a.known));
  if (!rows.length) return null;
  return <section className="panel padded"><h2>Where your money goes</h2><p className="muted">A breakdown of estimated monthly costs by service and category.</p>
    <dl className="cost-drivers">{rows.map(row => <div key={row.category}><dt>{categoryNames[row.category]}{row.incomplete > 0 && <small>{row.incomplete} unresolved</small>}</dt>
      <dd>{formatMoney(row.resolved ? row.known : null, env.currency)}</dd></div>)}</dl>
  </section>;
}
