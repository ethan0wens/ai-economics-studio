import { useState } from 'react';
import type { Catalogue } from './catalogue';
import type { Environment } from './domain';
import { ledger, type Ledger } from './ledger';
import { DraftQuantity } from './usage-assistance-ui';
import { compareCosts, pricePreview } from './scenario';
import { CostComparison } from './cost-comparison';
import { LearnMore } from './learn-more';
import { formatQuantity } from './presentation';
import { sensitivityTargets, sensitivityValue, usageSensitivity, workloadFields, type SensitivityField } from './usage-estimation';

const labels = { ...workloadFields, credits: 'Monthly Copilot Credits' };

function UsageSensitivity({ env, result, catalogue }: { env: Environment; result: Ledger; catalogue: Catalogue }) {
  const targets = sensitivityTargets(env);
  const [id, setId] = useState('');
  const target = targets.find(item => item.agent.id === id);
  const [field, setField] = useState<SensitivityField | ''>('');
  const [value, setValue] = useState<number>();
  const [submitted, setSubmitted] = useState(false);
  const change = submitted && target && field && value !== undefined
    ? usageSensitivity(env, target.agent.id, field, value) : undefined;
  const next = change?.kind === 'ready' ? ledger(change.env, catalogue.records, result.assessedAt, catalogue.inventory) : undefined;
  const initial = target && field ? sensitivityValue(target, field) : undefined;
  function preview(event: React.FormEvent) { event.preventDefault(); setSubmitted(true); }
  return <>
    <p className="muted">Change one workload input to see its monthly effect at current prices and agreements. This temporary comparison is outside your estimate and exports. </p>
    {!targets.length ? <p className="field-hint">Add a Foundry pay-as-you-go workload with its own usage profile or a Copilot agent with a single monthly credit total.</p> :
      <form className="usage-assistance-form" aria-label="Usage sensitivity" onSubmit={preview} noValidate>
        <div className="form-grid">
          <label className="plain-label">Workload<select value={id} onChange={event => {
            setId(event.target.value); setField(''); setValue(undefined); setSubmitted(false);
          }}><option value="">Choose an agent</option>{targets.map(item => <option key={item.agent.id} value={item.agent.id}>{item.agent.name}</option>)}</select></label>
          {target && <label className="plain-label">Usage input<select value={field} onChange={event => {
            setField(target.fields.find(key => key === event.target.value) ?? ''); setValue(undefined); setSubmitted(false);
          }}><option value="">Choose an input</option>{target.fields.map(key => <option key={key} value={key}>{labels[key]}</option>)}</select></label>}
          {target && field && <DraftQuantity label={`Proposed ${labels[field].toLowerCase()}`} value={value}
            step={field === 'calls' || field === 'credits' ? 'any' : 1} onChange={quantity => { setValue(quantity); setSubmitted(false); }} />}
        </div>
        {target && field && <p className="field-hint">Current input {initial === undefined ? 'unknown' : formatQuantity(initial)}.</p>}
        <div className="actions"><button className="button" type="submit">Compare monthly costs</button>
          {submitted && <button type="button" className="link-button" onClick={() => { setSubmitted(false); setValue(undefined); }}>Clear comparison</button>}
        </div>
        <div aria-live="polite" aria-atomic="true">
          {submitted && !change && <p>Choose a workload and input and enter a proposed quantity.</p>}
          {change?.kind === 'invalid' && <p>{change.message}</p>}
          {next && target && field && <><p>{target.agent.name} · {labels[field]} changes from {initial === undefined ? 'unknown' : formatQuantity(initial)} to {formatQuantity(value!)}.</p>
            <CostComparison change={compareCosts(result, next)} currency={env.currency} proposedLabel="With proposed usage" /></>}
        </div>
      </form>}
    <LearnMore guide="usageSensitivity">How temporary usage comparisons work</LearnMore>
  </>;
}

function PricePreview({ env, result, catalogue }: { env: Environment; result: Ledger; catalogue: Catalogue }) {
  const [percent, setPercent] = useState<number>();
  const [submitted, setSubmitted] = useState(false);
  const comparison = submitted ? pricePreview(env, result, catalogue, percent) : undefined;
  return <form className="usage-assistance-form" onSubmit={event => { event.preventDefault(); setSubmitted(true); }} noValidate>
    <p className="muted">Test a price change at the same usage. This comparison uses current agreements, leaves fixed contracts at their agreed rates and sets aside saved forecast settings.</p>
    <DraftQuantity label="Hypothetical price change (%)" min={-100} max={10_000} step="any" value={percent}
      onChange={value => { setPercent(value); setSubmitted(false); }} />
    <div className="actions">
      <button className="button" type="submit">Compare monthly costs</button>
      {submitted && <button className="link-button" type="button" onClick={() => { setPercent(undefined); setSubmitted(false); }}>Clear comparison</button>}
    </div>
    <div aria-live="polite">
      {submitted && !comparison && <p>Enter a percentage between −100 and 10,000.</p>}
      {comparison && <><p>Hypothetical price change of {percent}%.</p>
        <CostComparison change={comparison} currency={env.currency} proposedLabel="With proposed prices" /></>}
    </div>
  </form>;
}

export function ExploreChanges({ env, result, catalogue }: { env: Environment; result: Ledger; catalogue: Catalogue }) {
  const [choice, setChoice] = useState('');
  return <section className="panel padded">
    <h2>Explore changes</h2>
    <p className="muted">Compare one temporary change with your current estimate. Your accepted inputs and exports stay as they are.</p>
    <label className="plain-label scenario-choice">What would you like to change?
      <select value={choice} onChange={event => setChoice(event.target.value)}>
        <option value="">Choose a change</option><option value="usage">Workload usage</option><option value="price">Prices</option>
      </select>
    </label>
    {choice === 'usage' && <UsageSensitivity {...{ env, result, catalogue }} />}
    {choice === 'price' && <PricePreview {...{ env, result, catalogue }} />}
  </section>;
}
