import { useState, type FormEvent } from 'react';
import { ArrowRight, Cpu, Layers3, Plus } from 'lucide-react';
import type { Catalogue } from './catalogue';
import { isCurrentRate, resolveOffering } from './catalogue';
import type { Environment } from './domain';
import type { FieldId } from './field-help';
import { NumberField, Select, Text } from './fields';
import { addSolution, assignLink, bindModel, bindService, linkedObject, ownUsage, platforms, presets, reuseDeployment, updateObject, type Agent, type Intent, type Model, type Platform, type Service } from './guided-state';
import { LearnMore } from './learn-more';
import type { Ledger } from './ledger';
import { deploymentFindings } from './compatibility';
import { offerings, type Offering } from './offerings';
import { routeHref } from './navigation';
import { missingInputs } from './inspector-status';
import { regionName, unavailablePrice } from './presentation';
import type { ReactNode } from 'react';
import { UsageAssistance } from './usage-assistance-ui';

const steps = ['Choose your AI platform', 'Build your AI solution', 'Estimate usage', 'Additional costs', 'Review your estimate'];
type Edit = (id: string, field?: FieldId) => void;
type Props = {
  env: Environment; catalogue: Catalogue; result: Ledger; update: (env: Environment) => boolean;
  step: number; setStep: (index: number) => void; intent?: Intent; setIntent: (intent: Intent) => void;
  selected?: string; select: (id: string) => void; advanced: Edit; review: ReactNode;
  generated: ReadonlySet<string>; remember: (id: string) => void;
};

const offerName = (offer: Offering) => offer.kind === 'model-deployment'
  ? [offer.name, offer.model.version, offer.deployment?.replaceAll('-', ' '), regionName(offer.region)].filter(Boolean).join(' · ')
  : `${offer.name} · ${regionName(offer.region)}`;
const relevant = (offer: Offering, env: Environment) => offer.selectable !== false && offer.currency === env.currency &&
  (offer.region === env.region || offer.region === 'gb');

function OfferPicker({ choices, selected, field, choose }: {
  choices: readonly Offering[]; selected?: string; field: string; choose: (offer: Offering) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = choices.filter(offer => `${offerName(offer)} ${offer.id}`.toLowerCase().includes(search.trim().toLowerCase()) || offer.id === selected);
  return <>
    <label className="plain-label">{`Find ${field.toLowerCase()}`}<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name" /></label>
    <label className="plain-label">{field}<select value={selected ?? ''} onChange={event => {
      const selected = choices.find(offer => offer.id === event.target.value);
      if (selected) choose(selected);
    }}>
      <option value="" disabled>Choose a configuration</option>
      {selected && !choices.some(offer => offer.id === selected) && <option value={selected} disabled>Previously selected configuration</option>}
      {filtered.map(offer => <option key={offer.id} value={offer.id}>{offerName(offer)}</option>)}
    </select></label>
    {!filtered.length && <p className="muted" role="status">No matching configurations for this billing region and currency.</p>}
  </>;
}

function ModelSetup({ env, agent, model, catalogue, update, advanced, generated, remember }: Pick<Props, 'env' | 'catalogue' | 'update' | 'advanced' | 'generated' | 'remember'> & { agent: Agent; model?: Model }) {
  const inventory = catalogue.inventory ?? offerings;
  const models = env.objects.filter((item): item is Model => item.kind === 'model-deployment');
  const shared = model && env.relationships.filter(edge => edge.type === 'agent-uses-deployment' && edge.to === model.id).length > 1;
  const [specialist, setSpecialist] = useState(false);
  const [choice, setChoice] = useState<'current' | 'reuse'>('current');
  const current = inventory.find(offer => offer.id === model?.offeringId);
  const preview = current?.components.map(part => {
    const record = resolveOffering(catalogue.records, current, part.id, env.currency, new Date().toISOString());
    return <li key={part.id}>{part.label} · {record ? <a href={record.source} target="_blank" rel="noreferrer" aria-description="External Microsoft evidence">{record.currency} {record.price} / {part.unit}</a> : unavailablePrice}</li>;
  });
  const findings = model && deploymentFindings(model, new Date().toISOString());
  function createModel() {
    const draft: Model = { id: crypto.randomUUID(), kind: 'model-deployment', name: (agent.name + ' model').slice(0, 300) };
    if (update(assignLink({ ...env, objects: [...env.objects, draft] }, agent.id, 'agent-uses-deployment', draft.id))) remember(draft.id);
    setChoice('current');
  }
  return <section className="guided-block">
    <h3>Model deployment</h3>
    <p className="muted">Use one model for this agent or share an existing deployment. Shared capacity is charged once.</p>
    <div className="actions">
      {models.length > 1 || (!model && models.length > 0) ? <button className="button" onClick={() => setChoice(choice === 'reuse' ? 'current' : 'reuse')}>Use an existing deployment</button> : null}
      {!model && <button className="button" onClick={createModel}>Create deployment</button>}
      <LearnMore guide="models">Model selection and reuse</LearnMore>
    </div>
    {choice === 'reuse' && <Select field="linkedDeployment" value={model?.id} empty="Choose a deployment"
      options={models.map(item => [item.id, [item.name, item.modelId, item.deploymentRegion && regionName(item.deploymentRegion)].filter(Boolean).join(' · ')])}
      onChange={id => { if (id) { update(reuseDeployment(env, agent, id, generated)); setChoice('current'); } }} />}
    {model && choice === 'current' && <>
      <h4>{model.name}{shared ? ' · Shared' : ''}</h4>
      {shared ? <p className="field-hint">Changes to this deployment affect every linked agent. Open it in Advanced to make a shared change.</p>
        : <>
          <button className="link-button" onClick={() => setSpecialist(!specialist)} aria-expanded={specialist}>
            {specialist ? 'Show fewer model options' : 'Show more model options'}
          </button>
          <OfferPicker field="Model configuration" selected={model.offeringId}
            choices={inventory.filter(offer => offer.kind === 'model-deployment' && relevant(offer, env) &&
              (offer.model.mode === 'payg' || specialist || offer.id === model.offeringId))}
            choose={offer => { if (offer.kind === 'model-deployment') update(updateObject(env, bindModel(model, offer))); }} />
          <Text field="deploymentRegion" label="Actual deployment region" value={model.deploymentRegion} placeholder="e.g. uksouth"
            hint="Enter the Azure region code where you plan to run the model. This can differ from the billing region."
            onChange={value => update(updateObject(env, { ...model, deploymentRegion: value.trim() || undefined }))} />
        </>}
      {preview && <ul className="guided-rates">{preview}</ul>}
      {findings?.some(item => item.status === 'incompatible') && <p className="notice">Microsoft evidence indicates a conflict with this deployment. Review the deployment details.</p>}
      <button className="link-button" onClick={() => advanced(model.id)}>More deployment options</button>
      <LearnMore guide="deployments">Deployment types and availability</LearnMore>
    </>}
  </section>;
}

function UsageEditor({ env, agent, update, advanced }: Pick<Props, 'env' | 'update' | 'advanced'> & { agent: Agent }) {
  const [pending, setPending] = useState('');
  const [applied, setApplied] = useState('');
  const [revision, setRevision] = useState(0);
  const usage = linkedObject(env, agent.id, 'agent-uses-usage', 'usage-profile');
  const model = linkedObject(env, agent.id, 'agent-uses-deployment', 'model-deployment');
  const isCopilot = agent.platform === 'copilot-studio' && agent.modelSource === 'platform-managed';
  const isFoundry = agent.platform === 'foundry-agent-service' && agent.modelSource === 'deployment-ref';
  const shared = usage && env.relationships.filter(edge => edge.type === 'agent-uses-usage' && edge.to === usage.id).length > 1;
  const preset = presets.find(option => option.id === pending);
  const canPriceUsage = (isCopilot && agent.creditMethod !== 'breakdown') || (isFoundry && usage && !shared && model?.mode !== 'provisioned');
  const inputDescription = preset && (isCopilot ? `${preset.credits.toLocaleString('en-GB')} Copilot Credits/month`
    : `${preset.executions.toLocaleString('en-GB')} runs/month × ${preset.calls} requests/run, with ${preset.input.toLocaleString('en-GB')} input and ${preset.output} output tokens/request`);
  const recordedPreset = isCopilot ? presets.find(item => item.credits === agent.credits) :
    presets.find(item => usage && item.executions === usage.executions && item.calls === usage.calls && item.input === usage.input && item.output === usage.output);
  const marked = !!applied || (env.description?.includes('Illustrative usage preset applied.') && !!recordedPreset);
  const hasUsage = isCopilot ? agent.credits !== undefined : !!usage &&
    [usage.executions, usage.calls, usage.input, usage.output].some(value => value !== undefined);
  function applyAssisted(assumptions: Agent | NonNullable<typeof usage>) {
    if (!update(updateObject(env, assumptions))) return false;
    setApplied('');
    setPending('');
    setRevision(revision + 1);
    return true;
  }
  function apply() {
    if (!preset) return;
    const note = 'Illustrative usage preset applied.';
    const canRecord = !env.description?.includes(note) && (env.description?.length ?? 0) + note.length + 1 <= 300;
    const next = canRecord ? { ...env, description: [env.description, note].filter(Boolean).join(' ') } : env;
    const { executions, calls, input, output, credits } = preset;
    if (isCopilot) update(updateObject(next, { ...agent, credits }));
    else if (usage) update(updateObject(next, { ...usage, executions, calls, input, output }));
    setApplied(preset.name);
    setPending('');
    setRevision(revision + 1);
  }
  if (!isCopilot && !isFoundry) return <div className="guided-block">
    <p className="muted">Choose the agent’s platform and model before estimating its usage.</p>
    <button className="button" onClick={() => advanced(agent.id, 'modelSource')}>Open agent configuration</button>
  </div>;
  return <section className="guided-block" aria-label={`Usage for ${agent.name}`}>
    <h3>{isCopilot ? 'Copilot Credits' : model?.mode === 'provisioned' ? 'Monthly provisioned capacity' : 'Monthly workload'}</h3>
    {isCopilot && <p className="muted">Enter the credits you expect to consume in a month. Use measured consumption if you have it, or estimate it using Microsoft’s activity guidance.</p>}
    {isCopilot && agent.creditMethod === 'breakdown' ? <div>
      <p>This agent uses a credit breakdown by activity.</p>
      <button className="link-button" onClick={() => advanced(agent.id, 'creditCategory')}>Edit credit breakdown</button>
    </div> : isCopilot ? <NumberField key={revision} field="credits" label="Monthly Copilot Credits" value={agent.credits}
      onChange={credits => { setApplied(''); update(updateObject(env, { ...agent, credits })); }} /> : null}
    {isFoundry && model?.mode === 'provisioned' && <>
      <p className="muted">Enter provisioned throughput units (PTUs) and billable hours once for the deployment. Linked agents use the same capacity.</p>
      <div className="form-grid">
        <NumberField field="capacity" value={model.capacity} step={1} onChange={capacity => update(updateObject(env, { ...model, capacity }))} />
        <NumberField field="hours" value={model.billableHours} max={744} onChange={billableHours => update(updateObject(env, { ...model, billableHours }))} />
      </div>
      <button className="link-button" onClick={() => advanced(model.id, 'capacity')}>Capacity constraints and allocation</button>
      <LearnMore guide="provisioned">PTU sizing and reservations</LearnMore>
    </>}
    {isFoundry && model?.mode !== 'provisioned' && <>
      {!usage || shared ? <div>
        <p className="field-hint">{shared ? 'This usage profile is linked to more than one agent. Create a copy for this workload before editing.' : 'Estimate how often this agent will run so its token costs can be calculated.'}</p>
        <button className="button" onClick={() => update(ownUsage(env, agent, usage))}>{shared ? 'Copy usage for this agent' : 'Estimate monthly usage'}</button>
      </div> : <>
        <p className="muted">Start with runs per month. Each run makes one or more model requests. Enter the average input and output tokens for one request.</p>
        <div className="form-grid" key={usage.id + ':' + revision}>
          {([
            ['executions', 'Monthly executions', 1], ['calls', 'Model calls per execution', undefined],
            ['input', 'Input tokens per call', 1], ['output', 'Output tokens per call', 1],
          ] as const).map(([field, label, step]) => <NumberField key={field} field={field} label={label} value={usage[field]} step={step}
            onChange={value => { setApplied(''); update(updateObject(env, { ...usage, [field]: value })); }} />)}
        </div>
        {(missingInputs(usage, env).length === 0) && <p className="field-hint">The monthly estimate reflects this workload. Open the cost breakdown for billed input and output quantities.</p>}
        <button className="link-button" onClick={() => advanced(usage.id, 'cachedInput')}>More usage options</button>
      </>}
    </>}
    {isCopilot && <UsageAssistance key={agent.id} agent={agent} apply={applyAssisted} />}
    {isFoundry && model?.mode !== 'provisioned' && usage && !shared &&
      <UsageAssistance key={usage.id} profile={usage} apply={applyAssisted} />}
    {canPriceUsage && <details className="guided-disclosure">
      <summary>Try example usage</summary>
      <p className="muted">Choose a preset to see how example usage affects the estimate. You can edit all the values afterwards.</p>
      <label className="plain-label">Illustrative preset<select value={pending} onChange={event => setPending(event.target.value)}>
        <option value="">Choose a preset</option>
        {presets.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select></label>
      {preset && <div className="preset-preview"><p>{inputDescription}.</p>{hasUsage && <p>Applying this preset replaces the values shown above for this workload.</p>}
        <button className="button" onClick={apply}>Apply {preset.name.toLowerCase()} preset</button></div>}
    </details>}
    {marked && <p className="status warning">Illustrative usage{applied ? ` · ${applied}` : ''}</p>}
    <LearnMore guide={isCopilot ? 'credits' : 'foundryUsage'}>
      {isCopilot ? 'How to estimate Copilot Credits' : 'How to estimate model usage'}
    </LearnMore>
    {isCopilot && <button className="link-button" onClick={() => advanced(agent.id, 'creditMethod')}>More usage options</button>}
  </section>;
}

function Services({ env, catalogue, result, update, advanced }: Pick<Props, 'env' | 'catalogue' | 'result' | 'update' | 'advanced'>) {
  const [selected, setSelected] = useState('');
  const items = env.objects.filter((item): item is Service => item.kind === 'licence-entitlement' || item.kind === 'supporting-resource');
  const item = items.find(item => item.id === selected);
  const inventory = catalogue.inventory ?? offerings;
  function add(kind: Service['kind']) {
    const item: Service = { id: crypto.randomUUID(), name: kind === 'licence-entitlement' ? 'New licence' : 'New supporting service', kind };
    if (update({ ...env, objects: [...env.objects, item] })) setSelected(item.id);
  }
  const offer = inventory.find(offer => offer.id === item?.offeringId);
  const unit = offer?.id.startsWith('search-') ? 'search-unit-hours' : offer?.components[0]?.unit;
  return <div className="guided-block">
    <div className="actions">
      <button className="button" onClick={() => add('licence-entitlement')}><Plus size={16} aria-hidden="true" />Add licence</button>
      <button className="button" onClick={() => add('supporting-resource')}><Plus size={16} aria-hidden="true" />Add supporting service</button>
      <LearnMore guide="licences">Licences and seats</LearnMore>
      <LearnMore guide="services">Estimate Azure services</LearnMore>
    </div>
    {!!items.length && <ul className="guided-choices">{items.map(object => <li key={object.id}>
      <button className="button" aria-pressed={selected === object.id} onClick={() => setSelected(object.id)}>{object.name}</button></li>)}</ul>}
    {item && <section key={item.id} className="inset-editor">
      <Text field="objectName" value={item.name} onChange={name => { if (name.trim()) update(updateObject(env, { ...item, name })); }} />
      <OfferPicker field={item.kind === 'licence-entitlement' ? 'Licence product' : 'Azure service'} selected={item.offeringId}
        choices={inventory.filter(offer => offer.kind === item.kind && relevant(offer, env))}
        choose={offer => update(updateObject(env, { ...bindService(item, offer), name: item.name.startsWith('New ') ? offer.name : item.name }))} />
      {item.kind === 'licence-entitlement' ? <>
        <Select field="procurement" label="Do you already own this licence?" value={item.procurement}
          options={[[ 'existing', 'Already owned' ], [ 'incremental', 'New purchase' ], [ 'unknown', 'Unsure' ]]}
          onChange={value => update(updateObject(env, { ...item, procurement: (value || undefined) as typeof item.procurement }))} />
        {(item.procurement === 'existing' || item.procurement === 'incremental') && <NumberField field="seats" label="Number of users requiring a licence" value={item.seats} step={1}
          onChange={seats => update(updateObject(env, { ...item, seats }))} />}
        {item.procurement === 'existing' && <NumberField field="existingMonthly" value={item.existingMonthly}
          onChange={existingMonthly => update(updateObject(env, { ...item, existingMonthly }))} />}
        {result.licensingFindings.filter(finding => finding.id === item.id && finding.status !== 'Verified').map(finding => <p className="field-hint" key={finding.rule ?? finding.title}>{finding.title} · {finding.status}. {finding.detail}</p>)}
      </> : <NumberField field="resourceQuantity" label={`Monthly quantity${unit ? ' · ' + unit : ''}`} value={item.monthlyQuantity}
        hint="Use the billing unit shown for the selected service." onChange={monthlyQuantity => update(updateObject(env, { ...item, monthlyQuantity }))} />}
      {offer && !catalogue.records.some(rate => rate.offeringId === offer.id && isCurrentRate(rate, new Date().toISOString())) &&
        <p className="status warning">{unavailablePrice}</p>}
      <button className="link-button" onClick={() => advanced(item.id)}>Advanced configuration</button>
    </section>}
  </div>;
}

export function GuidedBuilder(props: Props) {
  const { env, catalogue, result, update, step, setStep, intent, setIntent, selected, select, advanced, review, generated, remember } = props;
  const agents = env.objects.filter((item): item is Agent => item.kind === 'agent');
  const agent = agents.find(item => item.id === selected) ?? agents[0];
  const [recentIntent, setRecentIntent] = useState<Platform>();
  const [agentName, setAgentName] = useState('');
  const [reuse, setReuse] = useState('');
  const [formError, setFormError] = useState('');
  const platform = intent === 'both' || !intent ? recentIntent : intent;
  const existingModels = env.objects.filter((item): item is Model => item.kind === 'model-deployment');
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!platform || !agentName.trim()) {
      setFormError(!platform ? 'Choose a platform for this agent.' : 'Enter an agent name.');
      event.currentTarget.querySelector<HTMLElement>(!platform ? 'select' : 'input')?.focus();
      return;
    }
    const next = addSolution(env, agentName.trim(), platform, existingModels.find(item => item.id === reuse));
    if (update(next.env)) { if (next.draft) remember(next.draft.id); select(next.agent.id); setAgentName(''); setReuse(''); setFormError(''); }
  }
  const stage = [
    ['What are you looking to build?', 'Start by choosing the Microsoft platform your AI solution will use. You can combine platforms or add more agents later.'],
    [agent ? 'Build your AI solution' : 'Add your first AI agent', "Give your agent a name and choose how it will be powered. We'll help you connect the services needed to estimate its costs."],
    ['How much will your AI be used?', "Estimate how often your agents will run and how much they'll process. Not sure? Start with an illustrative example and adjust it later."],
    ['What else will your environment need?', 'Include Microsoft licences and supporting Azure services where relevant. You can return to this later.'],
    ['Your AI environment, in numbers', 'Explore your estimated costs, review any missing information and create a report you can share.'],
  ][step];
  const move = (index: number) => {
    setStep(index);
    requestAnimationFrame(() => document.getElementById('guided-step')?.focus());
  };
  return <div className="guided-layout">
    <nav className="guided-steps" aria-label="Builder steps"><ol>{steps.map((label, index) => <li key={label}>
      <button type="button" aria-current={index === step ? 'step' : undefined} onClick={() => move(index)}>
        <span aria-hidden="true">{index + 1}</span>{label}</button></li>)}</ol></nav>
    <label className="plain-label guided-step-picker">Builder step
      <select value={step} onChange={event => setStep(Number(event.target.value))}>
        {steps.map((label, index) => <option key={label} value={index}>{index + 1}. {label}</option>)}
      </select>
    </label>
    <div className="guided-main">
      <section className="panel padded guided-task">
        <header className="guided-title"><p className="muted">Step {step + 1} of {steps.length}</p><h2 id="guided-step" tabIndex={-1}>{stage[0]}</h2><p>{stage[1]}</p></header>
        {step === 0 && <>
          <div className="platform-choices">
            {([
              ['foundry-agent-service', 'Microsoft Foundry', 'Choose a model and estimate token usage or dedicated capacity.', Cpu],
              ['copilot-studio', 'Copilot Studio', 'Plan business agents and estimate their monthly Copilot Credits.', Layers3],
              ['both', 'Both platforms', 'Estimate Foundry and Copilot Studio workloads in one environment.', Plus],
            ] as const).map(([id, name, desc, Icon]) => <button className="platform-choice" key={id} aria-pressed={intent === id} onClick={() => setIntent(id)}>
              <Icon size={20} aria-hidden="true" /><span><strong>{name}</strong><small>{desc}</small></span>
            </button>)}
          </div>
          <div className="form-grid">
            <Text field="defaultRegion" label="Default billing region" value={env.region} hint={`Enter an Azure region code, such as uksouth for UK South. Current region is ${regionName(env.region)}.`}
              onChange={region => { if (/^[a-z0-9-]+$/.test(region)) update({ ...env, region }); }} />
            <Text field="currency" value={env.currency} hint="Verified prices require a matching currency."
              onChange={currency => { if (/^[a-zA-Z]{3}$/.test(currency)) update({ ...env, currency: currency.toUpperCase() }); }} />
          </div>
          <div className="actions"><LearnMore guide="platforms">Choosing a platform</LearnMore>
            <a href={routeHref('examples')}>Explore an example</a></div>
        </>}
        {(step === 1 || step === 2) && !!agents.length && <label className="plain-label">
          Agent<select value={agent?.id ?? ''} onChange={event => select(event.target.value)}>{agents.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>}
        {step === 1 && <>
          {agent && <div className="guided-block">
            <div className="section-heading"><h3>{agent.name}</h3><span className="status">{agent.platform ? platforms[agent.platform] : 'Choose a platform'}</span></div>
            {agent.platform === 'foundry-agent-service' && agent.modelSource === 'deployment-ref' ?
              <ModelSetup key={agent.id} {...{ env, agent, catalogue, update, advanced, generated, remember }} model={linkedObject(env, agent.id, 'agent-uses-deployment', 'model-deployment')} />
              : agent.platform === 'copilot-studio' && agent.modelSource === 'platform-managed'
                ? <p className="field-hint">Copilot Studio manages the primary model. Estimate this workload in Copilot Credits.</p>
                : <p className="field-hint">Review this agent’s platform and model settings in Advanced.</p>}
            <button className="link-button" onClick={() => advanced(agent.id, 'platform')}>Edit agent configuration</button>
          </div>}
          <form className="guided-block" onSubmit={create}>
            {agent && <h3>Add another agent</h3>}
            <label className="plain-label">Agent name<input value={agentName} maxLength={300} placeholder="e.g. Support assistant" onChange={event => setAgentName(event.target.value)} /></label>
            {(intent === 'both' || !intent) && <label className="plain-label">Agent platform
              <select value={recentIntent ?? ''} onChange={event => setRecentIntent(event.target.value as Platform || undefined)}>
                <option value="">Choose a platform</option><option value="foundry-agent-service">Microsoft Foundry</option><option value="copilot-studio">Copilot Studio</option>
              </select></label>}
            {platform === 'foundry-agent-service' && existingModels.length > 0 && <Select field="linkedDeployment" label="Use an existing deployment" empty="Create a deployment for this agent"
              value={reuse} options={existingModels.map(model => [model.id, model.name])} onChange={setReuse} />}
            {formError && <p className="notice error" role="alert">{formError}</p>}
            <button className="button primary"><Plus size={16} aria-hidden="true" />Add agent</button>
          </form>
        </>}
        {step === 2 && (agent ? <UsageEditor key={agent.id} {...{ env, agent, update, advanced }} /> : <div>
          <p className="muted">Add an agent so the studio can show the usage inputs for its platform.</p>
          <button className="button" onClick={() => move(1)}>Add an agent</button>
        </div>)}
        {step === 3 && <Services {...{ env, catalogue, result, update, advanced }} />}
        {step === 4 && review}
        <div className="guided-actions">
          {step > 0 && <button className="button" onClick={() => move(step - 1)}>Back</button>}
          {step === 3 && <button className="link-button" onClick={() => move(4)}>Skip for now</button>}
          {step < 4 && <button className="button primary" onClick={() => move(step + 1)}>Continue <ArrowRight size={16} aria-hidden="true" /></button>}
          {step < 4 && <button className="link-button" onClick={() => move(4)}>Review your estimate</button>}
        </div>
      </section>
    </div>
  </div>;
}
