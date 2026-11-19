import { compatibilityLabels, type TechnicalFinding } from './compatibility';
import { environmentCompleteness } from './coverage';
import type { Environment } from './domain';
import type { LicensingFinding } from './entitlements';
import { formatMoney, type Ledger } from './ledger';

export function findingStatus(item: TechnicalFinding | LicensingFinding) {
  return item.status in compatibilityLabels
    ? compatibilityLabels[item.status as keyof typeof compatibilityLabels] : item.status;
}

export function EvidenceFindings({ items, label, name, select }: {
  items: (TechnicalFinding | LicensingFinding)[]; label: string; name?: (id: string) => string; select?: (id: string) => void;
}) {
  if (!items.length) return null;
  return <details className="coverage-family">
    <summary><strong>{label}</strong><span>{[...new Set(items.map(findingStatus))].join(' · ')}</span></summary>
    <ul className="findings">{items.map((item, i) => <li key={`${item.id}:${item.rule ?? item.title}:${i}`}>
      {name && select && <><button className="link-button" onClick={() => select(item.id)}>{name(item.id)}</button> · </>}
      <strong>{item.title}</strong> · {findingStatus(item)}
      <p className="muted">{item.detail} {item.source && <a href={item.source} target="_blank" rel="noreferrer">Microsoft evidence</a>}
        {item.verifiedOn && <small> · Reviewed {item.verifiedOn}</small>}</p>
    </li>)}</ul>
  </details>;
}

export function ValidationDashboard({ env, result, select }: { env: Environment; result: Ledger; select: (id: string) => void }) {
  const pricing = environmentCompleteness(result);
  const technical = result.technicalFindings;
  const licensing = result.licensingFindings;
  const count = <T extends { status: string }>(items: T[], status: T['status']) => items.filter(item => item.status === status).length;
  const name = (id: string) => env.objects.find(item => item.id === id)?.name ?? id;
  return <section className="panel padded">
    <h2>Environment validation</h2>
    <p className="muted">Evidence and cost assumptions assessed on {result.assessedAt.slice(0, 10)}.</p>
    <div className="validation-metrics">
      <div><h3>Pricing completeness</h3><strong>{pricing.fully} of {pricing.groups.length}</strong><small>{pricing.partial} partial · {pricing.unresolved} unresolved · {pricing.excluded} drafts</small></div>
      <div><h3>Technical compatibility</h3><strong>{count(technical, 'compatible')} verified</strong><small>{count(technical, 'conditional')} conditional · {count(technical, 'incompatible')} incompatible · {count(technical, 'unverified')} unverified</small></div>
      <div><h3>Licensing confidence</h3><strong>{count(licensing, 'Verified')} verified</strong><small>{count(licensing, 'Conditional')} conditional · {count(licensing, 'Action required')} action required · {count(licensing, 'Unverified')} unverified</small></div>
    </div>
    {pricing.groups.some(group => group.status !== 'complete') && <details className="coverage-family"><summary><strong>Resolve missing usage and prices</strong></summary>
      <ul>{pricing.groups.filter(group => group.status !== 'complete').map(group => <li key={group.id}>
        <button className="link-button" onClick={() => select(group.id)}>{group.name}</button>
        <ul>{group.lines.filter(line => line.amounts.current === null).map(line => <li key={line.id}>{line.component} · {line.reason}</li>)}</ul>
      </li>)}</ul>
    </details>}
    <EvidenceFindings items={technical} label="Review technical evidence" name={name} select={select} />
    <EvidenceFindings items={licensing} label="Review licensing and entitlement evidence" name={name} select={select} />
  </section>;
}

export function LicenceEstate({ result, currency }: { result: Ledger; currency: string }) {
  const estate = result.licenceEstate;
  if (!estate.owned && !result.lines.some(line => line.component === 'Monthly seats')) return null;
  const values = [
    ['Existing licence spend', estate.existing], ['New licence spend', estate.incremental],
    ['Proposed licence estate', estate.proposed], ['Proposed environment including retained licences', estate.proposedEnvironment],
  ] as const;
  return <section className="panel padded">
    <h2>Existing and proposed expenditure</h2>
    <div className="table-wrap"><table><thead><tr><th>Scope</th><th>Known monthly</th><th>Known annual</th><th>Unresolved</th></tr></thead>
      <tbody>{values.map(([label, value]) => {
        const missingExisting = label === 'Existing licence spend' && estate.owned > 0 && estate.owned === value.incomplete;
        return <tr key={label}><th scope="row">{label}</th><td>{formatMoney(missingExisting ? null : value.known, currency)}</td><td>{formatMoney(missingExisting ? null : value.annual, currency)}</td><td>{value.incomplete}</td></tr>;
      })}</tbody></table></div>
    <p className="muted">The existing figure uses declared customer spend. The proposed estate adds new licences to retained spend after any documented replacement.</p>
  </section>;
}
