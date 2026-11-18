import { useState, type FormEvent } from 'react';
import { forecastException, overrideSchema, scopeKey, type Environment } from './domain';
import { bases, formatMoney, type Line, type Ledger } from './ledger';
import { Field, NumberField, Select, Text } from './fields';

export const basisNames = { retail: 'Retail baseline', current: 'Current contract', forecast: 'Forecast' };
export function Scenario({ env, update }: { env: Environment; update: (env: Environment) => void }) {
  return <section className="panel padded">
    <h2>Forecast assumptions</h2>
    <p className="muted">Project a hypothetical price change. A specific meter exception replaces the global change.</p>
    <div className="form-grid">
      <NumberField label="Global price change (%)" value={env.forecast.percent} min={-100} max={10000}
        onChange={value => update({ ...env, forecast: { ...env.forecast, percent: value ?? 0 } })} />
      <Field label="Apply forecast to fixed contracts"><input type="checkbox" checked={env.forecast.applyToFixed}
        onChange={event => update({ ...env, forecast: { ...env.forecast, applyToFixed: event.target.checked } })} /></Field>
    </div>
  </section>;
}

function PriceEditor({ line, env, update }: { line: Line; env: Environment; update: (env: Environment) => void }) {
  const [scope, setScope] = useState('object');
  const meter = line.meter!;
  const scoped = { meter, objectId: scope === 'object' ? line.pricingOwner : undefined };
  const key = scopeKey(scoped);
  const existing = env.pricingOverrides.find(rule => scopeKey(rule) === key && rule.currency === env.currency);
  const scenario = env.forecast.exceptions.find(rule => scopeKey(rule) === key);
  const [notice, setNotice] = useState('');
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mode = form.get('mode');
    const raw = String(form.get('value') ?? '').trim();
    const effective = String(form.get('effective') ?? '');
    const parsed = overrideSchema.safeParse({ ...scoped, currency: env.currency, mode, reason: form.get('reason'),
      effectiveAt: effective ? `${effective}T00:00:00Z` : undefined,
      ...(mode === 'fixed' ? { value: raw } : mode === 'discount' ? { value: raw ? Number(raw) : undefined } : {}),
    });
    if (mode !== 'catalogue' && !parsed.success) {
      setNotice('Enter a valid rate or percentage and a reason. Use intentional zero for an included item.');
      return;
    }
    const replacement = String(form.get('scenario') ?? '').trim();
    const fixed = form.get('apply-fixed');
    const exception = forecastException.safeParse({ ...scoped, percent: Number(replacement), applyToFixed: fixed === 'yes' ? true : fixed === 'no' ? false : undefined });
    if (replacement && !exception.success) { setNotice('Enter a forecast percentage between −100 and 10,000.'); return; }
    update({
      ...env,
      pricingOverrides: [...env.pricingOverrides.filter(rule => scopeKey(rule) !== key || rule.currency !== env.currency),
        ...(mode !== 'catalogue' && parsed.success ? [parsed.data] : [])],
      forecast: { ...env.forecast, exceptions: [...env.forecast.exceptions.filter(rule => scopeKey(rule) !== key),
        ...(replacement && exception.success ? [exception.data] : [])] },
    });
    setNotice('Price assumptions saved.');
  }
  return <div className="price-editor">
    <Select label="Apply to" value={scope} options={[[ 'object', `This meter for ${env.objects.find(item => item.id === line.pricingOwner)?.name ?? line.object}` ], [ 'environment', 'This meter across the environment' ]]}
      empty={false} onChange={value => { setScope(value); setNotice(''); }} />
    <form className="price-form" key={key} onSubmit={save}>
      <Field label="Price agreement"><select name="mode" defaultValue={existing?.mode ?? 'catalogue'}>
        <option value="catalogue">Catalogue</option><option value="discount">Discount (%)</option>
        <option value="fixed">Fixed contractual rate</option><option value="intentional-zero">Intentional zero</option>
      </select></Field>
      <Field label={`Rate per billed unit (${env.currency}) or discount (%)`}><input name="value" inputMode="decimal" defaultValue={existing && 'value' in existing ? existing.value : ''} /></Field>
      <Field label="Agreement reason"><input name="reason" maxLength={300} defaultValue={existing?.reason} /></Field>
      <Field label="Agreement effective date (UTC)"><input name="effective" type="date" defaultValue={existing?.effectiveAt?.slice(0, 10)} /></Field>
      <Field label="Forecast exception (%)"><input name="scenario" type="number" min="-100" max="10000" step="any" defaultValue={scenario?.percent} /></Field>
      <Field label="Exception treatment of fixed contracts"><select name="apply-fixed" defaultValue={scenario?.applyToFixed === undefined ? '' : scenario.applyToFixed ? 'yes' : 'no'}>
        <option value="">Inherit global choice</option><option value="yes">Apply forecast</option><option value="no">Keep fixed rate</option>
      </select></Field>
      <button className="button" type="submit">Save price assumptions</button>
      {notice && <p role="status">{notice}</p>}
    </form>
  </div>;
}

export function Lines({ lines, env, update, compact = false }: {
  lines: Line[]; env: Environment; update: (env: Environment) => void; compact?: boolean;
}) {
  if (!lines.length) return <p className="muted">No cost lines in this view.</p>;
  return <div className={compact ? 'ledger-list compact' : 'ledger-list'}>
    {lines.map(line => <details key={line.id} className="ledger-row">
      <summary>
        <div><span className="subtle-label">{line.category}</span><strong>{line.component}</strong><small>{line.object}</small></div>
        {!compact && <span className="muted">{line.fixed ? 'Fixed' : 'Variable'}</span>}
        <span className={line.amounts.current === null ? 'status warning' : 'status'}>{line.status}</span>
        <strong>{formatMoney(line.amounts.current, env.currency)}</strong>
      </summary>
      <div className="ledger-detail">
        {line.reason && <p>{line.reason}</p>}
        <p className="muted">{line.meter ? `${line.meter.sku} · ${line.meter.region} · ${line.currency} · ${line.meter.priceType} · ${line.meter.quantityPerUnit} base units per ${line.meter.unit}` : 'Billing identity unresolved'} · Monthly quantity {line.quantity ?? 'unknown'}</p>
        <dl className="rate-grid">{bases.map(basis => <div key={basis}><dt>{basisNames[basis]}</dt><dd>{formatMoney(line.amounts[basis], env.currency)}</dd>
          <small>{line.rates[basis] === null ? 'Rate unknown' : `${line.currency} ${line.rates[basis]} per billed unit`}</small></div>)}</dl>
        {line.source && <p><a href={line.source.source} target="_blank" rel="noreferrer">Azure Retail Prices API</a> · effective {line.source.effectiveAt}</p>}
        {line.agreement && <p>Agreement basis {line.agreement.mode} · {line.agreement.reason}{line.agreement.effectiveAt && ` · effective ${line.agreement.effectiveAt}`}</p>}
        <p className="muted">Scenario change {line.scenario}% before fixed-rate rules. Amount = quantity ÷ billing unit × rate.</p>
        {line.allocatesTo.length > 0 && <p>{line.allocation ? line.allocation.map(record => `${env.objects.find(object => object.id === record.agentId)?.name}: ${formatMoney(record.amount, env.currency)}`).join(' · ')
          : 'Allocation unassigned. Enable allocation by input tokens on the model and provide usage for every linked agent.'} Shared charges appear once.</p>}
        {line.meter && <PriceEditor line={line} env={env} update={update} />}
      </div>
    </details>)}
  </div>;
}

export function CostAnalysis({ env, result, update }: { env: Environment; result: Ledger; update: (env: Environment) => void }) {
  const [filter, setFilter] = useState('');
  const [source, setSource] = useState('');
  return <>
    <Scenario env={env} update={update} />
    <section className="panel padded">
      <div className="section-heading"><div><h2>Monthly cost ledger</h2><p className="muted">Open a line to review rates, evidence and assumptions.</p></div></div>
      <div className="form-grid">
        <Text label="Filter by object, category or meter" value={filter} onChange={setFilter} />
        <Select label="Price status" value={source} empty="All statuses" onChange={setSource} options={[...new Set(result.lines.map(line => line.status))]} />
      </div>
      <Lines env={env} update={update} lines={result.lines.filter(line => (!source || line.status === source) &&
        [line.object, line.category, line.component, line.meter?.sku].join(' ').toLowerCase().includes(filter.toLowerCase()))} />
    </section>
  </>;
}
