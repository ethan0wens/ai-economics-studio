import { useState, type FormEvent } from 'react';
import Decimal from 'decimal.js';
import type { Catalogue } from './catalogue';
import type { Environment } from './domain';
import { LearnMore } from './learn-more';
import { formatMoney, ledger, type Ledger } from './ledger';
import { formatQuantity } from './presentation';
import { DraftQuantity } from './usage-assistance-ui';
import { sensitivityTargets, sensitivityValue, usageSensitivity, workloadFields, type SensitivityField } from './usage-estimation';

const labels = { ...workloadFields, credits: 'Monthly Copilot Credits' };
const Amount = Decimal.clone({ precision: 80 });

function monthlyCost(result: Ledger, currency: string) {
  const { known, incomplete } = result.summary.current;
  const total = result.lines.some(line => line.amounts.current !== null) ? formatMoney(known, currency) : 'Unknown';
  return incomplete ? `${total} · ${incomplete} unresolved ${incomplete === 1 ? 'charge' : 'charges'}` : total;
}

export function UsageSensitivity({ env, result, catalogue }: { env: Environment; result: Ledger; catalogue: Catalogue }) {
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
  const complete = next && !result.summary.current.incomplete && !next.summary.current.incomplete;
  const delta = complete ? new Amount(next.summary.current.known).minus(result.summary.current.known) : undefined;
  function preview(event: FormEvent) { event.preventDefault(); setSubmitted(true); }
  return <details className="panel padded assumption-details">
    <summary>Preview a change in usage</summary>
    <p className="muted">Change one workload input to see its monthly effect at current prices and agreements. This temporary comparison is outside your estimate and exports. Compare pricing assumptions separately to test a change in rates.</p>
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
          {next && <div className="inset-editor">
            <dl className="usage-values">
              <div><dt>Current monthly estimate</dt><dd>{monthlyCost(result, env.currency)}</dd></div>
              <div><dt>With proposed usage</dt><dd>{monthlyCost(next, env.currency)}</dd></div>
              {delta !== undefined && <div><dt>Monthly difference</dt><dd>{delta.isPositive() && !delta.isZero() ? '+' : ''}{formatMoney(delta.toFixed(), env.currency)}</dd></div>}
            </dl>
            {!complete && <p className="field-hint">Both estimates need complete pricing and quantities to show a whole-environment difference. The amounts shown are known-cost subtotals where charges are unresolved.</p>}
          </div>}
        </div>
      </form>}
    <LearnMore guide="usageSensitivity">How temporary usage comparisons work</LearnMore>
  </details>;
}
