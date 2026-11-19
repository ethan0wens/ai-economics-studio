import { useState } from 'react';
import type { Catalogue } from './catalogue';
import type { Environment } from './domain';
import { formatMoney, type Ledger } from './ledger';
import { formatQuantity } from './presentation';
import { LearnMore } from './learn-more';
import { DraftQuantity } from './usage-assistance-ui';
import { sensitivityTargets } from './usage-estimation';
import { compareAdoption, type AdoptionComparison, type AdoptionRates } from './adoption';
import type { ValuePlan } from './value';

export function AdoptionPreview({ env, result, catalogue, plan, include }: {
  env: Environment; result: Ledger; catalogue: Catalogue; plan: ValuePlan; include: (comparison: AdoptionComparison) => void;
}) {
  const original = plan.assumptions.adoption?.value;
  const [rates, setRates] = useState<AdoptionRates>({ expected: original });
  const [agentId, setAgentId] = useState('');
  const [perUser, setPerUser] = useState<number>();
  const [note, setNote] = useState('');
  const [comparison, setComparison] = useState<AdoptionComparison>();
  const targets = sensitivityTargets(env);
  const chosen = targets.find(item => item.agent.id === agentId);
  const copilot = chosen?.object.kind === 'agent';
  function clear() {
    setRates({ expected: original }); setAgentId(''); setPerUser(undefined); setNote(''); setComparison(undefined);
  }
  const number = (value: string | null) => value === null ? 'Unknown' : formatQuantity(value);
  return <form className="usage-assistance-form adoption-form" onSubmit={event => {
    event.preventDefault();
    setComparison(compareAdoption(env, result, catalogue, plan, rates, agentId ? { agentId, perUser, note: note.trim() } : undefined));
  }}>
    <p className="muted">Compare adoption at the same audience and productivity assumptions. To explore AI costs, link one workload to the number of active users.</p>
    <div className="form-grid">
      {(['lower', 'expected', 'higher'] as const).map(key => <DraftQuantity key={key} max={100} label={`${key[0].toUpperCase()}${key.slice(1)} adoption (%)`}
        value={rates[key]} onChange={value => { setRates({ ...rates, [key]: value }); setComparison(undefined); }} />)}
    </div>
    <details className="guided-disclosure">
      <summary>Link adoption to workload usage</summary>
      {targets.length ? <label className="plain-label">Workload affected by adoption
        <select value={agentId} onChange={event => { setAgentId(event.target.value); setPerUser(undefined); setNote(''); setComparison(undefined); }}>
          <option value="">Keep cost separate</option>{targets.map(({ agent }) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select></label> : <p className="muted">A Foundry PAYG agent needs its own usage profile. A Copilot Studio agent needs a single monthly credit total.</p>}
      {chosen && <>
        <p className="field-hint">{copilot ? 'Enter your own credit estimate. The studio has no verified conversion from activity to Copilot Credits.'
          : 'This changes executions for the selected workload. The existing calls, token and retry assumptions still apply.'}</p>
        <div className="form-grid">
          <DraftQuantity label={copilot ? 'Assumed monthly Copilot Credits per active user' : 'Monthly interactions per active user'}
            value={perUser} onChange={value => { setPerUser(value); setComparison(undefined); }} />
          <label className="plain-label">{copilot ? 'Basis for the credit assumption' : 'Basis for the workload assumption (optional)'}
            <input type="text" value={note} maxLength={300} onChange={event => { setNote(event.target.value); setComparison(undefined); }} /></label>
        </div>
      </>}
      <LearnMore guide="adoptionLink">How adoption can change workload usage</LearnMore>
    </details>
    <div className="actions">
      <button className="button" type="submit">Compare adoption assumptions</button>
      {comparison && <button className="link-button" type="button" onClick={clear}>Clear comparison</button>}
    </div>
    <div aria-live="polite">{comparison && <>
      <p>Current modelled AI expenditure {formatMoney(comparison.current, env.currency)} monthly · {comparison.unresolved} unresolved.</p>
      {!comparison.rows.some(row => row.volume) && <p className="field-hint">AI cost effects need an explicit, usable workload link. Review the relationship and input quantities to compare costs.</p>}
      {!!comparison.link && comparison.rows.some(row => row.volume) && <p className="field-hint">
        Customer-assumed link for {comparison.link.name} · {comparison.link.perUser} {copilot ? 'monthly credits' : 'monthly interactions'} per active user.
        {comparison.link.note && ` ${comparison.link.note}`}
      </p>}
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable adoption comparison">
        <table>
          <caption>Monthly adoption comparison</caption>
          <thead><tr>{['Scenario', 'Active users', 'Workload volume', 'Known AI cost', 'Unresolved charges',
            'Potential productivity hours', 'Economic equivalent', 'Declared cashable savings'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{comparison.rows.map(row => <tr key={row.label}>
            <th scope="row">{row.label}{row.adoption !== undefined && ` · ${row.adoption}%`}</th>
            <td>{number(row.activeUsers)}</td><td>{row.volume ? `${number(row.volume.value)} ${row.volume.unit}` : 'Unknown'}</td>
            <td>{formatMoney(row.knownCost, comparison.currency)}</td><td>{row.unresolved ?? 'Unknown'}</td>
            <td>{number(row.grossHours)}</td><td>{formatMoney(row.economicEquivalent, comparison.valueCurrency)}</td>
            <td>{formatMoney(row.cashableSavings, comparison.valueCurrency)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="field-hint">The AI ledger gives known subtotals. Benefits and separately declared implementation and operating costs are outside those amounts. Cashable savings stay as declared across scenarios.</p>
      <div className="actions"><button type="button" className="button" onClick={() => include(comparison)}>Include comparison in Full Report</button></div>
    </>}</div>
  </form>;
}
