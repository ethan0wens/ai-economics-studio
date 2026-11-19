import { useId, useRef, useState, type FormEvent } from 'react';
import { creditCategories } from './domain';
import type { Agent, Usage } from './guided-state';
import { LearnMore } from './learn-more';
import { formatQuantity } from './presentation';
import { creditKeys, estimateCopilot, estimateFoundry, foundryInputs, foundryKeys, workloadFields } from './usage-estimation';

const sources = ['Measured usage', 'Customer forecast', 'Illustrative assumption'] as const;
const given = (value?: number) => value === undefined ? 'Not entered' : formatQuantity(value);
type Props =
  | { profile: Usage; apply: (profile: Usage) => boolean; agent?: never }
  | { agent: Agent; apply: (agent: Agent) => boolean; profile?: never };

type Preview = NonNullable<ReturnType<typeof estimateFoundry> | ReturnType<typeof estimateCopilot>>;
type FormValues = Record<string, number | undefined>;

export function DraftQuantity({ label, value, onChange, step = 'any', min = 0, max = 1e15 }: {
  label: string; value?: number; onChange: (value: number | undefined) => void; step?: 'any' | 1; min?: number; max?: number;
}) {
  return <label className="plain-label">{label}<input type="number" min={min} max={max} step={step} value={value ?? ''}
    onChange={event => onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)} /></label>;
}

export function UsageAssistance(props: Props) {
  const [draft, setDraft] = useState<FormValues>({});
  const [source, setSource] = useState('');
  const [unit, setUnit] = useState<'credits' | 'activity'>('credits');
  const [preview, setPreview] = useState<Preview>();
  const [notice, setNotice] = useState('');
  const id = useId();
  const previewButton = useRef<HTMLButtonElement>(null);
  const { profile, agent } = props;
  function reset() {
    setDraft({}); setSource(''); setPreview(undefined); setNotice('');
  }
  function change(key: string, value?: number) {
    setDraft(current => ({ ...current, [key]: value }));
    setPreview(undefined); setNotice('');
  }
  function calculate(event: FormEvent) {
    event.preventDefault();
    setNotice('');
    if (!source && (profile || unit === 'credits')) {
      setPreview({ kind: 'invalid', message: 'Choose the source of your assumptions before previewing.' });
      return;
    }
    setPreview(profile ? estimateFoundry(draft, profile) : estimateCopilot(draft, unit, agent));
  }
  function apply() {
    if (preview?.kind !== 'ready') return;
    const updated = props.profile && 'values' in preview
      ? props.apply({ ...props.profile, ...preview.values })
      : props.agent && 'changes' in preview && props.apply({ ...props.agent, ...preview.changes });
    if (!updated) return;
    reset();
    previewButton.current?.focus();
    setNotice(`${source} applied. Record its source and any business assumptions in your environment description to keep them with the estimate.`);
  }
  return <details className="guided-disclosure usage-helper">
    <summary>Help me estimate usage</summary>
    <form className="usage-assistance-form" onSubmit={calculate} noValidate aria-label={profile ? 'Foundry usage assistant' : 'Copilot Credits assistant'}>
      {profile ? <>
        <p className="muted">Treat one interaction as one agent run. Use your expected average number of model requests in each run.</p>
        <p className="field-hint">Input tokens measure what the model reads, including instructions, conversation history and retrieved context. Output tokens measure what it generates. Tool use can add model calls. The preview counts existing retries and separately entered cached input. Enter only uncached input here.</p>
        <div className="form-grid">
          {foundryKeys.map(key => <DraftQuantity key={key} label={foundryInputs[key]} value={draft[key]}
            step={key === 'calls' || key === 'interactions' ? 'any' : 1} onChange={value => change(key, value)} />)}
        </div>
      </> : <>
        <p className="muted">Add measured or documented credits per month by activity. Leave out unused categories. Check all applicable activities before applying a total.</p>
        <label className="plain-label">What do you know?<select value={unit} onChange={event => {
          reset();
          const nextUnit = event.target.value === 'activity' ? 'activity' : 'credits';
          setUnit(nextUnit);
          if (agent && nextUnit === 'activity') setPreview(estimateCopilot({}, nextUnit, agent));
        }}>
          <option value="credits">Monthly credits by activity</option>
          <option value="activity">Activity counts only</option>
        </select></label>
        {unit === 'credits' && <div className="form-grid">
          {creditKeys.map(key => <DraftQuantity key={key} label={`${creditCategories[key]} (credits/month)`} value={draft[key]} onChange={value => change(key, value)} />)}
        </div>}
      </>}
      {(profile || unit === 'credits') && <label className="plain-label">Source of these assumptions
        <select value={source} onChange={event => { setSource(event.target.value); setPreview(undefined); setNotice(''); }}>
          <option value="">Choose a source</option>{sources.map(item => <option key={item}>{item}</option>)}
        </select>
      </label>}
      {(profile || unit === 'credits') && <div className="actions"><button ref={previewButton} type="submit" className="button">Preview usage</button>
        {(preview || source || Object.keys(draft).length > 0) && <button type="button" className="link-button" onClick={() => { reset(); previewButton.current?.focus(); }}>Cancel usage preview</button>}
      </div>}
      <div aria-live="polite" aria-atomic="true">{notice && <p>{notice}</p>}
        {preview && preview.kind !== 'ready' && <p className="field-hint">{preview.message}</p>}
        {preview?.kind === 'ready' && <div className="inset-editor" aria-labelledby={id}>
          <h4 id={id}>Usage preview · {source}</h4>
          {profile && 'values' in preview && <>
            <p>Users × interactions gives {formatQuantity(preview.values.executions)} monthly executions. Executions × model calls gives {formatQuantity(preview.requests)} calls per month{profile.retries ? `, or ${formatQuantity(preview.withRetries)} with retries` : ''}.</p>
            <p>Calls × tokens per call gives {formatQuantity(preview.inputTokens)} uncached input and {formatQuantity(preview.outputTokens)} output tokens per month{preview.cachedTokens ? `, plus ${formatQuantity(preview.cachedTokens)} cached input tokens` : ''}.</p>
            <p className="field-hint">Retry, cached input and tool settings retain their current values.</p>
            <dl className="usage-values">{(Object.keys(workloadFields) as (keyof typeof workloadFields)[]).map(key => <div key={key}>
              <dt>{workloadFields[key]}</dt><dd>{given(profile[key])} → {given(preview.values[key])}</dd>
            </div>)}</dl>
          </>}
          {agent && 'changes' in preview && <>
            <p>Sum of entered activities gives {formatQuantity(preview.total)} monthly Copilot Credits before any eligible allowance or prepaid capacity.</p>
            <dl className="usage-values">{agent.creditMethod === 'breakdown' ?
              creditKeys.filter(key => agent.creditBreakdown?.[key] !== undefined || draft[key] !== undefined).map(key => <div key={key}>
                <dt>{creditCategories[key]}</dt><dd>{given(agent.creditBreakdown?.[key])} → {given(draft[key])}</dd>
              </div>) : <div><dt>Monthly Copilot Credits</dt><dd>{given(agent.credits)} → {formatQuantity(preview.total)}</dd></div>}</dl>
          </>}
          <p className="field-hint">The values are shown from current to proposed. Applying replaces the current values. The quantities will be saved with the estimate. These working inputs and the source label are temporary. Enter them in the environment description if you need to share them.</p>
          <button type="button" className="button primary" onClick={apply}>{profile ? 'Apply Foundry usage' : 'Apply monthly credits'}</button>
        </div>}
      </div>
      <LearnMore guide={profile ? 'assistedFoundry' : 'assistedCopilot'}>{profile ? 'Understand tokens and requests' : 'Understand Copilot Credits and activity evidence'}</LearnMore>
    </form>
  </details>;
}
