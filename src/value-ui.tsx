import { useRef, useState } from 'react';
import type { Environment } from './domain';
import { formatMoney, type Ledger } from './ledger';
import { formatQuantity } from './presentation';
import { LearnMore } from './learn-more';
import { DraftQuantity } from './usage-assistance-ui';
import { assumptionSources, estimateValue, valueFields, valueKeys, valuePlanSchema, type ValueInputs, type ValuePlan } from './value';

type Key = keyof ValueInputs;
const steps: { title: string; guidance: string; inputs: Key[] }[] = [
  { title: 'Who will use it?', guidance: 'Choose the intended audience for this solution. Enter the share you expect to use it actively.', inputs: ['audience', 'adoption'] },
  { title: 'What activity might improve?', guidance: 'Estimate a monthly workload and minutes saved for one representative task. These are your planning assumptions.', inputs: ['tasks', 'minutes'] },
  { title: 'How much of that benefit is realised?', guidance: 'Enter the share of released time you expect to become usable business capacity. A blank factor leaves realised hours unknown.', inputs: ['realisation'] },
  { title: 'Is there a financial value?', guidance: 'Use your own planning values. Enter cashable savings only for an identified reduction in expenditure. Include additional costs here only if they are outside the AI cost ledger.', inputs: ['hourlyValue', 'cashableSavings', 'implementation', 'ongoing'] },
];

const shownHours = (value: string | null) => value === null ? 'Unknown' : `${formatQuantity(value)} hours`;
const both = (monthly: string, annual: string) => monthly === 'Unknown' && annual === 'Unknown' ? 'Unknown' : `${monthly} monthly · ${annual} annualised`;

function Results({ plan, result, currency }: { plan: ValuePlan; result: Ledger; currency: string }) {
  const value = estimateValue(plan);
  const costKnown = result.lines.some(line => line.amounts.current !== null);
  const money = (pair: { monthly: string | null; annual: string | null }) => both(formatMoney(pair.monthly, plan.currency), formatMoney(pair.annual, plan.currency));
  return <>
    <h2>Potential business value</h2>
    <p className="muted">These planning estimates use your accepted assumptions. Economic value represents released capacity. Cashable savings are a separate declaration.</p>
    <dl className="usage-values value-outcomes">
      <div><dt>Expected active users</dt><dd>{value.activeUsers === null ? 'Unknown' : formatQuantity(value.activeUsers)}</dd></div>
      <div><dt>Potential productivity capacity</dt><dd>{both(shownHours(value.grossHours.monthly), shownHours(value.grossHours.annual))}</dd></div>
      <div><dt>Realised capacity</dt><dd>{both(shownHours(value.realisedHours.monthly), shownHours(value.realisedHours.annual))}</dd></div>
      <div><dt>Assumed economic equivalent</dt><dd>{money(value.economicEquivalent)}</dd></div>
      <div><dt>Declared cashable savings</dt><dd>{money(value.cashableSavings)}</dd></div>
    </dl>
    <LearnMore guide="valueAssumptions">How capacity and financial value differ</LearnMore>
    <h3>Investment context</h3>
    <dl className="usage-values value-investment">
      <div><dt>Modelled AI expenditure</dt><dd>{formatMoney(costKnown ? result.summary.current.known : null, currency)} monthly
        {result.summary.current.incomplete > 0 && ` · ${result.summary.current.incomplete} unresolved charges`}</dd></div>
      <div><dt>One-off implementation costs</dt><dd>{formatMoney(value.implementation, plan.currency)}</dd></div>
      <div><dt>Additional operating costs</dt><dd>{money(value.additionalOngoing)}</dd></div>
    </dl>
    <details className="guided-disclosure"><summary>Accepted assumptions and sources</summary>
      <dl className="usage-values">{valueKeys.flatMap(key => {
        const input = plan.assumptions[key];
        return input ? [<div key={key}><dt>{valueFields[key]}{steps[3].inputs.includes(key) && ` (${plan.currency})`}</dt>
          <dd>{formatQuantity(input.value)} · {assumptionSources[input.source]}{input.note && <small className="assumption-note">{input.note}</small>}</dd></div>] : [];
      })}</dl>
    </details>
  </>;
}

export function PotentialValue({ env, result, update }: { env: Environment; result: Ledger; update: (env: Environment) => boolean }) {
  const [draft, setDraft] = useState<ValueInputs>();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const start = useRef<HTMLButtonElement>(null);
  const plan = env.valuePlan;
  const currency = plan?.currency ?? env.currency;
  const groups = env.objects.filter(item => item.kind === 'user-group' && item.intended !== undefined);
  const current = steps[step];
  function move(index: number) {
    setStep(index); setError('');
    requestAnimationFrame(() => heading.current?.focus());
  }
  function close() {
    setDraft(undefined); setError('');
    requestAnimationFrame(() => start.current?.focus());
  }
  function change(key: Key, value: number | undefined) {
    setDraft(inputs => ({ ...inputs, [key]: value === undefined ? undefined : { value, source: 'entered', note: inputs?.[key]?.note } }));
    setError('');
  }
  function finish() {
    const parsed = valuePlanSchema.safeParse({ currency, assumptions: draft });
    if (!parsed.success) { setError('Enter at least one valid assumption. Check percentages and other values before accepting.'); return; }
    if (update({ ...env, valuePlan: parsed.data })) close();
  }
  return <section className="panel padded analysis-panel analysis-value">
    {draft ? <form className="usage-assistance-form" onSubmit={event => { event.preventDefault(); if (step === steps.length - 1) finish(); else move(step + 1); }}>
      <p className="field-hint">Step {step + 1} of {steps.length}</p>
      <h2 tabIndex={-1} ref={heading}>{current.title}</h2>
      <p className="muted">{current.guidance} Leave any unknown input blank.</p>
      {step === 0 && groups.length > 0 && <label className="plain-label">Use an existing audience
        <select value="" onChange={event => {
          const group = groups.find(item => item.id === event.target.value);
          if (group?.kind === 'user-group' && group.intended !== undefined) {
            setDraft({ ...draft, audience: { value: group.intended, source: 'entered', note: `Intended audience from ${group.name}`.slice(0, 300) } });
          }
        }}><option value="">Choose a group or enter your own count</option>
          {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select>
      </label>}
      <div className="form-grid">
        {current.inputs.map(key => <DraftQuantity key={key} label={valueFields[key] + (step === 3 ? ` (${currency})` : '')}
          value={draft[key]?.value} step={key === 'audience' ? 1 : 'any'} max={key === 'adoption' || key === 'realisation' ? 100 : undefined}
          onChange={value => change(key, value)} />)}
      </div>
      {current.inputs.some(key => draft[key]) && <details className="guided-disclosure"><summary>Assumption sources and notes</summary>
        {current.inputs.flatMap(key => {
          const input = draft[key];
          if (!input) return [];
          return [<div key={key} className="form-grid">
            <label className="plain-label">{valueFields[key]} source<select value={input.source} onChange={event => {
              const source = event.target.value as keyof typeof assumptionSources;
              setDraft({ ...draft, [key]: { ...input, source } });
            }}>{Object.entries(assumptionSources).filter(([source]) => source !== 'imported' || input.source === 'imported')
                .map(([source, label]) => <option key={source} value={source}>{label}</option>)}</select></label>
            <label className="plain-label">{valueFields[key]} note<input maxLength={300} value={input.note ?? ''}
              onChange={event => setDraft({ ...draft, [key]: { ...input, note: event.target.value } })} /></label>
          </div>];
        })}
      </details>}
      {error && <p role="alert" className="field-missing">{error}</p>}
      <div className="actions">
        <button className="button primary" type="submit">{step === steps.length - 1 ? 'Accept value assumptions' : 'Continue'}</button>
        {step > 0 && <button className="button" type="button" onClick={() => move(step - 1)}>Back</button>}
        <button className="link-button" type="button" onClick={close}>Cancel draft</button>
      </div>
    </form> : <>
      {plan ? <Results plan={plan} result={result} currency={env.currency} /> : <>
        <h2>Potential value</h2>
        <p className="muted">Explore how adoption and productivity improvements could affect the business value of your proposed AI solution.</p>
      </>}
      <div className="actions">
        <button className="button primary" ref={start} onClick={() => { setDraft(plan?.assumptions ?? {}); move(0); }}>
          {plan ? 'Edit value assumptions' : 'Estimate potential value'}
        </button>
        {plan && <button className="link-button" onClick={() => {
          if (update({ ...env, valuePlan: undefined })) start.current?.focus();
        }}>Remove accepted assumptions</button>}
      </div>
    </>}
  </section>;
}
