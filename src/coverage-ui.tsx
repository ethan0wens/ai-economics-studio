import { catalogueCoverage, environmentCompleteness } from './coverage';
import { isCurrentRate, type Catalogue } from './catalogue';
import type { Ledger } from './ledger';

export function Coverage({ catalogue, result, select }: { catalogue: Catalogue; result: Ledger; select: (id: string) => void }) {
  const at = new Date().toISOString();
  const breakdown = catalogueCoverage(catalogue, at);
  const complete = environmentCompleteness(result);
  const checked = catalogue.manifest.lastCheckedAt;
  const stale = !checked || Date.parse(at) - Date.parse(checked) > 7 * 86_400_000;
  const expired = catalogue.records.filter(record => record.review && !isCurrentRate(record, at)).length;
  const total = breakdown.reduce((sum, family) => sum + family.supported, 0);
  const fully = breakdown.reduce((sum, family) => sum + family.fully, 0);
  return <>
    <section className="panel padded">
      <h2>Catalogue coverage</h2>
      <p className="muted">{fully} of {total} reviewed configurations have verified prices for every required meter. Coverage is measured against the studio’s named inventory. The wider Microsoft catalogue has no denominator here.</p>
      <div className="compare-grid">
        <div><h3>Catalogue coverage</h3><strong>{total ? `${(100 * fully / total).toFixed(1)}%` : '—'}</strong><small>{fully} fully priced configurations</small></div>
        <div><h3>Current environment</h3><strong>{complete.fully} of {complete.groups.length}</strong><small>Fully priced billable objects</small></div>
        <div><h3>Azure source freshness</h3><strong>{stale ? 'Needs review' : 'Current'}</strong><small>{checked ? new Date(checked).toLocaleString('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' }) : 'Last check unavailable'}</small></div>
      </div>
      {(stale || expired > 0 || catalogue.fallback) && <p className="notice">{catalogue.fallback ? 'Using a previous validated catalogue. ' : ''}{stale ? 'The Azure check is older than seven days or unavailable. ' : ''}{expired > 0 ? `${expired} curated record(s) are outside their review period and unavailable for calculation.` : ''}</p>}
      <p className="muted">The catalogue contains {catalogue.records.filter(record => isCurrentRate(record, at)).length} current verified records of {catalogue.records.length} published. A failed refresh preserves the last successful catalogue. <a href="https://github.com/ethan0wens/ai-economics-studio/actions/workflows/refresh-pricing.yml" target="_blank" rel="noreferrer">Check the latest refresh outcome</a>.</p>
    </section>
    <section className="panel padded">
      <h2>Coverage by product family</h2>
      <div className="ledger-list">
        {breakdown.map(family => <details key={family.family} className="coverage-family">
          <summary><strong>{family.name}</strong><span>{family.fully} / {family.supported} verified · {family.percent === null ? 'No finite inventory' : `${family.percent.toFixed(1)}%`}</span></summary>
          <p className="muted">{family.partial} partial · {family.manual} manual · {family.unsupported} named unsupported categories · {family.automated} automated · {family.curated} curated{family.mixed ? ` · ${family.mixed} mixed` : ''}. Last verification {family.checkedAt ? new Date(family.checkedAt).toLocaleDateString('en-GB', { timeZone: 'Europe/London' }) : 'unavailable'}.</p>
          <ul>{family.configurations.map(offer => <li key={offer.id}><strong>{offer.name}</strong> · {offer.region === 'gb' ? 'UK market' : offer.region} · {offer.currency} · {offer.status}
            <ul>{offer.components.map(part => <li key={part.id}>{part.label} · {part.unit} · {part.rate
              ? <a href={part.rate.source} target="_blank" rel="noreferrer">{part.rate.verification === 'azure-retail-api' ? 'Azure retail' : 'Reviewed Microsoft price'}</a>
              : 'No current verified rate'}</li>)}</ul>
          </li>)}
          {family.gaps.map(gap => <li key={gap.name}><strong>{gap.name}</strong> · {gap.status === 'manual' ? 'Manual model' : 'Unsupported'}<p className="muted">{gap.reason}</p></li>)}</ul>
        </details>)}
      </div>
    </section>
    <section className="panel padded">
      <h2>Environment pricing completeness</h2>
      <p className="muted">{complete.fully} complete · {complete.partial} partial · {complete.unresolved} unresolved · {complete.excluded} waiting on configuration</p>
      <p className="muted">{complete.retail} use verified retail and {complete.manual} use customer-supplied rates. These counts can overlap when an object has multiple meters.</p>
      {complete.groups.length === 0 && <p>No billable objects configured.</p>}
      <ul>{complete.groups.filter(group => group.status !== 'complete').map(group => <li key={group.id}>
        <button className="link-button" onClick={() => select(group.id)}>{group.name}</button> · {group.status}
        <ul>{group.lines.filter(line => line.amounts.current === null).map(line => <li key={line.id}>{line.component} · {line.meter ? `${line.meter.sku} / ${line.meter.region} / ${line.meter.unit}` : 'Configuration required'} · {line.reason}</li>)}</ul>
      </li>)}</ul>
    </section>
  </>;
}
