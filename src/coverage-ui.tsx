import { costExplanation, regionName, unavailablePrice } from './presentation';
import { useState } from 'react';
import { CatalogueHealth } from './catalogue-health-ui';
import { catalogueCoverage, environmentCompleteness } from './coverage';
import { isCurrentRate, type Catalogue } from './catalogue';
import { Select, Text } from './fields';
import type { Ledger } from './ledger';

const labels = { verified: 'Fully priced', partial: 'Partially priced', manual: 'Unpriced · manual rate supported', unsupported: 'Unsupported as a separate estimate' };

export function Coverage({ catalogue, result, select }: { catalogue: Catalogue; result: Ledger; select: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState('');
  const at = new Date().toISOString();
  const breakdown = catalogueCoverage(catalogue, at);
  const complete = environmentCompleteness(result);
  const checked = catalogue.manifest.lastCheckedAt;
  const stale = !checked || Date.parse(at) - Date.parse(checked) > 7 * 86_400_000;
  const expired = catalogue.records.filter(record => record.review && !isCurrentRate(record, at)).length;
  const total = breakdown.reduce((sum, family) => sum + family.supported, 0);
  const discovered = breakdown.reduce((sum, family) => sum + family.discovered, 0);
  const fully = breakdown.reduce((sum, family) => sum + family.fully, 0);
  const partial = breakdown.reduce((sum, family) => sum + family.partial, 0);
  const manual = breakdown.reduce((sum, family) => sum + family.manual, 0);
  const regions = [...new Set(breakdown.flatMap(family => family.configurations.map(offer => offer.region)))].sort();
  return <>
    <section className="panel padded">
      <h2>Catalogue coverage</h2>
      <p className="muted">{fully} of {total} supported configurations have verified prices for every listed billing component. The catalogue lists {discovered} configurations across the Azure billing regions and UK commercial market shown below.</p>
      <div className="compare-grid">
        <div><h3>Supported inventory</h3><strong>{total ? `${(100 * fully / total).toFixed(1)}%` : '—'}</strong><small>{fully} fully priced · {partial} partial · {manual} unpriced</small></div>
        <div><h3>Current environment</h3><strong>{complete.fully} of {complete.groups.length}</strong><small>Billable items with all costs priced</small></div>
        <div><h3>Latest Azure price check</h3><strong>{stale ? 'Needs review' : 'Current'}</strong><small>{checked ? new Date(checked).toLocaleString('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' }) : 'Last check unavailable'}</small></div>
      </div>
      {(stale || expired > 0 || catalogue.fallback) && <p className="notice">{catalogue.fallback ? 'Using a previous validated catalogue. ' : ''}{stale ? 'The Azure check is older than seven days or unavailable. ' : ''}{expired > 0 ? `${expired} curated record(s) are outside their review period and unavailable for calculation.` : ''}</p>}
      <p className="muted">The catalogue contains {catalogue.records.filter(record => isCurrentRate(record, at)).length} current verified records of {catalogue.records.length} published. A failed refresh preserves the last successful catalogue. <a href="https://github.com/ethan0wens/ai-economics-studio/actions/workflows/refresh-pricing.yml" target="_blank" rel="noreferrer">Check the latest refresh outcome</a>.</p>
    </section>
    <CatalogueHealth manifest={catalogue.manifest} />
    <section className="panel padded">
      <h2>Coverage by product family</h2>
      <p className="muted">{discovered - total} configurations are unsupported as separate estimates. Azure rates describe a billing region. Model deployment, agent compatibility, licence eligibility and included use require separate evidence.</p>
      <div className="coverage-filters">
        <Text field="catalogueSearch" value={query} onChange={setQuery} />
        <Select field="catalogueRegion" value={market} options={regions.map(region => [region, regionName(region)])} empty="All regions and markets" onChange={setMarket} />
      </div>
      <div className="ledger-list">
        {breakdown.map(family => {
          const matches = family.configurations.filter(offer => (!market || offer.region === market) &&
            [offer.name, offer.id, offer.region, regionName(offer.region), offer.deployment].join(' ').toLocaleLowerCase('en-GB').includes(query.trim().toLocaleLowerCase('en-GB')));
          return <details key={family.family} className="coverage-family">
          <summary><strong>{family.name}</strong><span>{family.fully} / {family.supported} verified · {family.percent === null ? 'No supported configurations' : `${family.percent.toFixed(1)}%`}</span></summary>
          <p className="muted">{family.partial} partial · {family.manual} unpriced · {family.unsupported} unsupported · {family.automated} automated · {family.curated} curated{family.mixed ? ` · ${family.mixed} mixed` : ''}. Last verification {family.checkedAt ? new Date(family.checkedAt).toLocaleDateString('en-GB', { timeZone: 'Europe/London' }) : 'unavailable'}.</p>
          {!matches.length && <p>No matching configurations in this family.</p>}
          <ul>{matches.map(offer => <li key={offer.id}><strong>{offer.name}</strong> · {regionName(offer.region)} · {offer.currency} · {labels[offer.status]}
            {(offer.note || offer.evidence) && <p className="muted">{offer.note} {offer.evidence && <a href={offer.evidence} target="_blank" rel="noreferrer">Microsoft product guidance</a>}</p>}
            <ul>{offer.components.map(part => <li key={part.id}>{part.label} · {part.unit} · {part.rate
              ? <a href={part.rate.source} target="_blank" rel="noreferrer">{part.rate.verification === 'azure-retail-api' ? 'Azure retail' : 'Reviewed Microsoft price'}</a>
              : unavailablePrice}</li>)}</ul>
          </li>)}
          {!query && !market && family.gaps.map(gap => <li key={gap.name}><strong>{gap.name}</strong> · {gap.status === 'manual' ? 'Manual model' : 'Unsupported category'}<p className="muted">{gap.reason}</p></li>)}</ul>
        </details>;
        })}
      </div>
    </section>
    <section className="panel padded">
      <h2>Environment pricing completeness</h2>
      <p className="muted">{complete.fully} complete · {complete.partial} partial · {complete.unresolved} unresolved · {complete.excluded} need more information</p>
      <p className="muted">{complete.retail} use verified retail and {complete.manual} use customer-supplied rates. These counts can overlap when an object has multiple meters.</p>
      {complete.groups.length === 0 && <p>Add usage or a billable service to check how much of your environment can be priced.</p>}
      <ul>{complete.groups.filter(group => group.status !== 'complete').map(group => <li key={group.id}>
        <button className="link-button" onClick={() => select(group.id)}>{group.name}</button> · {group.status}
        <ul>{group.lines.filter(line => line.amounts.current === null).map(line => <li key={line.id}>{line.component} · {line.meter ? `${line.meter.sku} / ${regionName(line.meter.region)} / ${line.meter.unit}` : 'More billing details needed'} · {costExplanation(line)}</li>)}</ul>
      </li>)}</ul>
    </section>
  </>;
}
