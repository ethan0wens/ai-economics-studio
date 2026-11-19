import { regionName, unavailablePrice } from './presentation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Link2, Trash2 } from 'lucide-react';
import { creditCategories, edgeKinds, kindLabels, meterKey, objectSchema, type CreditCategory, type Edge, type EdgeType, type Environment, type StudioObject } from './domain';
import { resolveOffering, type Catalogue } from './catalogue';
import { Field, NumberField, Select, Text } from './fields';
import { type Ledger } from './ledger';
import { Lines } from './pricing-ui';
import { hasUnknownPrice, missingInputs } from './inspector-status';
import { applicableOffering, copilotPack, offeringMeter, offerings } from './offerings';
import type { FieldId } from './field-help';
import { EvidenceFindings } from './validation-ui';
import { deploymentFindings } from './compatibility';
import { deployedIdentity } from './provisioned';
import { CapacityComparisons } from './capacity-ui';
import type { EditTarget } from './estimate-ui';

const edgeLabels: Record<EdgeType, string> = {
  'agent-uses-deployment': 'Model deployment', 'agent-uses-usage': 'Usage profile', 'group-can-access-agent': 'Can access agent',
  'group-has-entitlement': 'Assigned entitlement', 'agent-invokes-agent': 'Invokes agent', 'agent-uses-resource': 'Uses resource',
  'agent-has-entitlement': 'Uses licence entitlement', 'licence-replaces-entitlement': 'Replaces an existing entitlement',
  'agent-uses-prompt-model': 'External prompt model',
  'policy-applies-to-agent': 'Applies to agent', 'policy-applies-to-group': 'Applies to user group', 'policy-applies-to-environment': 'Applies to environment', 'deployment-uses-resource': 'Uses resource',
};
export const platformOptions: [string, string][] = [['foundry-agent-service', 'Foundry Agent Service'], ['copilot-studio', 'Copilot Studio']];

const levels = ['Essential', 'Detailed', 'Advanced'] as const;
type Level = typeof levels[number];
const modalities = ['text', 'image', 'audio', 'video'];

export function Inspector({ item, env, catalogue, result, update, select, remove, focus }: {
  item: StudioObject; env: Environment; catalogue: Catalogue; result: Ledger;
  update: (env: Environment) => void; select: (id: string) => void; remove: () => void; focus?: EditTarget;
}) {
  const panel = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<string>(focus?.section ?? 'Configuration');
  const [level, setLevel] = useState<Level>(focus?.field ? 'Advanced' : 'Essential');
  useEffect(() => {
    const field = focus?.field ? panel.current?.querySelector<HTMLElement>(`[data-field="${focus.field}"] :is(input, select, textarea)`) : undefined;
    const heading = panel.current?.querySelector<HTMLElement>('#inspector-title');
    (field ?? (focus ? heading : panel.current?.querySelector('input')))?.focus();
  }, [focus]);
  const detailed = level !== 'Essential';
  const advanced = level === 'Advanced';
  const missing = missingInputs(item, env);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState('');
  const options = (Object.keys(edgeKinds) as EdgeType[]).filter(key => edgeKinds[key][0] === item.kind &&
    !(item.kind === 'agent' && ((item.platform === 'copilot-studio' && key === 'agent-uses-deployment') ||
      (key === 'agent-uses-prompt-model' && (item.platform !== 'copilot-studio' || item.modelSource !== 'platform-managed')))));
  const related = env.relationships.filter(edge => edge.from === item.id || edge.to === item.id);
  const name = (id: string) => id === env.id ? env.name : env.objects.find(object => object.id === id)?.name ?? 'Missing object';
  const save = (draft: StudioObject) => {
    const checked = objectSchema.safeParse(draft);
    if (checked.success) {
      setError('');
      update({ ...env, objects: env.objects.map(object => object.id === item.id ? checked.data : object) });
    } else setError(checked.error.issues[0].message);
  };
  const inventory = catalogue.inventory ?? offerings;
  const regionForOffer = 'region' in item ? item.region ?? env.region : env.region;
  const activeOffer = applicableOffering(item, regionForOffer, env.currency, inventory);
  const change = (key: string, value: unknown) => {
    const draft = { ...item, [key]: value };
    if ('offeringId' in draft && ['modelId', 'modelVersion', 'sku', 'mode', 'region', 'product', 'platform', 'modelSource'].includes(key)) {
      draft.offeringId = undefined;
      if (draft.kind === 'model-deployment') {
        draft.inputMeter = undefined;
        draft.outputMeter = undefined;
        draft.capacityMeter = undefined;
      }
    }
    save(draft);
  };
  function retailSelector() {
    const choices = inventory.filter(offer => offer.selectable !== false && offer.kind === item.kind &&
      (offer.id === activeOffer?.id || (offer.currency === env.currency && (offer.region === regionForOffer || offer.region === 'gb'))));
    return <><Select field="retailOffering" value={activeOffer?.id}
      options={choices.map(offer => {
        const unavailable = item.kind === 'model-deployment' && offer.kind === 'model-deployment' && deploymentFindings({
          ...item, modelId: offer.model.id, modelVersion: offer.model.version, sku: offer.model.sku, mode: offer.model.mode,
          deployedVersion: offer.model.id === item.modelId ? item.deployedVersion : undefined,
        }, new Date().toISOString(), false).find(check => check.status === 'incompatible');
        return [offer.id, `${offer.name} · ${regionName(offer.region)} · ${offer.currency}${unavailable ? ` · Unavailable — ${unavailable.title}` : ''}`, !!unavailable];
      })}
      hint={activeOffer
        ? activeOffer.currency !== env.currency ? `This offer is published in ${activeOffer.currency}. The environment uses ${env.currency}.` : activeOffer.note
        : undefined}
      empty={item.kind === 'agent' ? 'Match the environment billing region' : 'Custom or unlisted configuration'}
      onChange={id => {
        const offer = choices.find(candidate => candidate.id === id);
        if (item.kind === 'model-deployment') {
          const model = offer?.kind === 'model-deployment' ? offer.model : undefined;
          save({ ...item, offeringId: offer?.id, ...(model && { modelId: model.id, modelVersion: model.version, sku: model.sku, mode: model.mode, region: offer?.region }),
            inputMeter: undefined, outputMeter: undefined, capacityMeter: undefined });
        } else if (item.kind === 'licence-entitlement') save({ ...item, offeringId: offer?.id, product: offer?.name ?? item.product, meter: undefined });
        else if (item.kind === 'supporting-resource') save({ ...item, offeringId: offer?.id,
          region: offer && offer.region !== 'gb' ? offer.region : item.region, meter: undefined });
        else if (item.kind === 'agent') save({ ...item, offeringId: offer?.id, platformMeter: undefined });
      }} />
      {activeOffer && <div className="retail-preview">
        <strong>Microsoft retail pricing</strong>
        {activeOffer.evidence && <p><a href={activeOffer.evidence} target="_blank" rel="noreferrer">Microsoft product guidance</a></p>}
        <ul>{activeOffer.components.map(part => {
          const rate = resolveOffering(catalogue.records, activeOffer, part.id, env.currency, new Date().toISOString());
          return <li key={part.id}>{part.label} · {rate
            ? <a href={rate.source} target="_blank" rel="noreferrer">{rate.tiers ? 'Graduated usage bands' : `${rate.currency} ${rate.price} per ${part.unit === '1K' ? '1,000 tokens' : part.unit === '1' ? 'credit' : part.unit}`}</a>
            : unavailablePrice}</li>;
        })}</ul>
      </div>}
    </>;
  }
  const string = (field: FieldId, key: string, value?: string) => <Text field={field} value={value}
    missing={missing.includes(field)} onChange={text => change(key, text)} />;
  const number = (field: FieldId, key: string, value?: number, max?: number, step?: number, hint?: string) =>
    <NumberField field={field} value={value} max={max} step={step} hint={hint} missing={missing.includes(field)} onChange={value => change(key, value)} />;
  const option = (field: FieldId, key: string, value: string | undefined, choices: (string | [string, string])[]) =>
    <Select field={field} value={value} options={choices} missing={missing.includes(field)} onChange={value => change(key, value || undefined)} />;
  const region = (value?: string) => <Text field="region" value={value} placeholder={env.region} hint={`Leave blank to use the environment’s billing region, ${regionName(env.region)}.`}
    onChange={text => change('region', text || undefined)} />;
  const setEdge = (type: EdgeType, to: string, replace = false) => {
    const current = replace ? env.relationships.filter(edge => edge.from !== item.id || edge.type !== type) : env.relationships;
    const edge: Edge = { type, from: item.id, to };
    update({ ...env, relationships: to ? [...current, edge] : current });
  };
  const editEdge = (edge: Edge, details: Partial<Edge>) =>
    update({ ...env, relationships: env.relationships.map(link => link === edge ? { ...edge, ...details } : link) });
  const edgeSelect = (type: 'agent-uses-deployment' | 'agent-uses-usage') => {
    const field = type === 'agent-uses-deployment' ? 'linkedDeployment' : 'usageLink';
    return <Select field={field} missing={missing.includes(field)}
    value={related.find(edge => edge.from === item.id && edge.type === type)?.to}
    options={env.objects.filter(object => object.kind === edgeKinds[type][1]).map(object => [object.id,
      object.kind === 'model-deployment' ? [object.name, object.modelId, regionName(object.region || env.region), object.mode].filter(Boolean).join(' / ') : object.name])}
    onChange={value => setEdge(type, value, true)} empty="Unlinked" />;
  };
  const deploymentId = related.find(edge => edge.from === item.id && edge.type === 'agent-uses-deployment')?.to;
  const candidate = env.objects.find(object => object.id === deploymentId);
  const model = candidate?.kind === 'model-deployment' ? candidate : undefined;
  const promptModel = item.kind === 'agent' && related.some(edge => edge.from === item.id && edge.type === 'agent-uses-prompt-model');

  function renderConfiguration() {
    switch (item.kind) {
      case 'agent': {
        const sources: [string, string][] = [['platform-managed', 'Platform-managed']];
        if (item.platform === 'foundry-agent-service') sources.push(['deployment-ref', 'Linked model deployment']);
        else if (item.modelSource === 'deployment-ref') sources.push(['deployment-ref', 'Previously linked deployment (unsupported)']);
        return <>
          {option('platform', 'platform', item.platform, platformOptions)}
          {item.platform && option('modelSource', 'modelSource', item.modelSource, sources)}
          {item.platform === 'foundry-agent-service' && item.modelSource === 'deployment-ref' && edgeSelect('agent-uses-deployment')}
          {item.platform === 'copilot-studio' && item.modelSource === 'platform-managed' && retailSelector()}
          {item.platform === 'copilot-studio' && <p className="field-hint">For Copilot Studio, enter monthly credits in Usage. Link an eligible shared pack under Dependencies to apply prepaid capacity.</p>}
          {detailed && <div className="field-group"><h3>Risk and data</h3>
            {option('autonomy', 'autonomy', item.autonomy, [['read-only', 'Read only'], ['approved-writes', 'Writes after approval'], ['autonomous-writes', 'Writes without approval']])}
            {option('sensitivity', 'sensitivity', item.sensitivity, [['public', 'Public'], ['internal', 'Internal'], ['confidential', 'Confidential'], ['regulated', 'Regulated']])}
          </div>}
          {advanced && <div className="field-group"><h3>Access and integrations</h3>
            {option('identity', 'identity', item.identity, [['delegated', 'Delegated user identity'], ['application', 'Application identity']])}
            {string('tools', 'tools', item.tools)}
            {item.platform === 'foundry-agent-service' && option('agentSetup', 'agentSetup', item.agentSetup,
              [['current', 'Current Foundry'], ['classic-basic', 'Classic basic'], ['classic-standard', 'Classic standard']])}
          </div>}
        </>;
      }
      case 'model-deployment': return <>
        {retailSelector()}
        {string('modelId', 'modelId', item.modelId)}
        {option('billingMode', 'mode', item.mode, [['payg', 'Pay as you go'], ['provisioned', 'Provisioned capacity']])}
        {detailed && <div className="field-group"><h3>Deployment details</h3>{region(item.region)}{string('modelVersion', 'modelVersion', item.modelVersion)}
          <Text field="deploymentRegion" value={item.deploymentRegion} onChange={value => change('deploymentRegion', value || undefined)} />
          {item.modelId === 'azure-openai' && string('deployedModel', 'deployedModel', item.deployedModel)}
          {string('deployedVersion', 'deployedVersion', item.deployedVersion)}
          {option('inputModality', 'inputModality', item.inputModality, modalities)}{option('outputModality', 'outputModality', item.outputModality, [...modalities, 'embedding'])}
          {option('requiredFeature', 'requiredFeature', item.requiredFeature, [['function-calling', 'Function calling'], ['structured-outputs', 'Structured outputs'], ['responses', 'Responses API']])}
        </div>}
        {advanced && string('sku', 'sku', item.sku)}
      </>;
      case 'user-group': return <>
        {number('intended', 'intended', item.intended, undefined, 1)}
        {number('active', 'active', item.active, undefined, 1)}
        {detailed && number('population', 'population', item.population, undefined, 1)}
        {advanced && number('interactions', 'interactions', item.interactions, undefined, 1)}
      </>;
      case 'licence-entitlement': return <>
        {retailSelector()}
        {string('product', 'product', item.product)}
        {option('procurement', 'procurement', item.procurement, [['existing', 'Already owned'], ['incremental', 'New purchase'], ['unknown', 'Unsure']])}
        {(item.procurement === 'incremental' || (detailed && item.procurement === 'existing')) &&
          number('seats', 'seats', item.seats, undefined, 1, 'Enter distinct seats, or derive the count from linked assignments.')}
        {detailed && <>{string('seatScope', 'seatScope', item.seatScope)}
          {related.filter(edge => edge.type === 'group-has-entitlement').length > 1 && number('overlapSeats', 'overlapSeats', item.overlapSeats, undefined, 1)}
          {item.procurement === 'existing' && number('existingMonthly', 'existingMonthly', item.existingMonthly)}
        </>}
      </>;
      case 'supporting-resource': {
        const meters = catalogue.records.filter(record => (!record.component || record.component === 'usage') && (!record.offeringId || record.offeringId === 'd2s-v3-uk-south') && record.currency === env.currency && record.region === (item.region ?? env.region));
        const activeMeter = activeOffer ? offeringMeter(activeOffer, 'usage') : item.meter?.region === (item.region ?? env.region) ? item.meter : undefined;
        return <>
          {retailSelector()}
          {string('category', 'category', item.category)}
          {!activeOffer && <Select field="meter" value={item.meter && meterKey(item.meter)}
            options={[...(item.meter && !meters.some(record => meterKey(record) === meterKey(item.meter!)) ?
              [[meterKey(item.meter), 'Previously selected meter (unavailable)'] as [string, string]] : []),
              ...meters.map(record => [meterKey(record), `${record.product} / ${record.sku} / ${record.unit}`] as [string, string])]}
            onChange={key => {
              const record = meters.find(record => meterKey(record) === key);
              change('meter', record && { meterId: record.meterId, sku: record.sku, region: record.region, unit: record.unit, quantityPerUnit: record.quantityPerUnit, priceType: record.priceType });
            }} empty="Manual billing assumption"
            hint={meters.length ? undefined : 'No verified meters for this region and currency. Use a manual rate under Costs if you have one.'} />}
          {number('resourceQuantity', 'monthlyQuantity', item.monthlyQuantity, undefined, activeOffer?.id === copilotPack.offeringId ? 1 : undefined, activeMeter
            ? `Enter base units per month. The selected meter bills per ${activeMeter.unit} (${activeMeter.quantityPerUnit} base units).`
            : 'Use the same unit for this quantity and your manual rate. For example, enter hours if your contract quotes a rate per hour.')}
          {detailed && <>{region(item.region)}<Text field="deploymentRegion" value={item.deploymentRegion} onChange={value => change('deploymentRegion', value || undefined)} /></>}
        </>;
      }
      case 'security-policy': return <>
        {option('control', 'control', item.control, [['identity', 'Identity and access'], ['approval', 'Human approval'], ['audit', 'Audit and monitoring'], ['dlp', 'Data loss prevention'], ['budget', 'Budget and usage limits']])}
        {option('controlStatus', 'status', item.status, [['implemented', 'Implemented'], ['planned', 'Planned'], ['absent', 'Absent'], ['unknown', 'Unknown']])}
        {detailed && string('controlNotes', 'detail', item.detail)}
      </>;
      case 'usage-profile': return <>
        <p className="field-hint">Enter the number of runs in a typical month, the average requests per run, and the input and output tokens for a single request.</p>
        {number('executions', 'executions', item.executions, undefined, 1)}
        {number('calls', 'calls', item.calls)}
        <div className="field-group"><h3>Tokens per request</h3>
          {number('input', 'input', item.input, undefined, 1)}
          {detailed && number('cachedInput', 'cachedInput', item.cachedInput, undefined, 1)}
          {number('output', 'output', item.output, undefined, 1)}
        </div>
        {detailed && number('retries', 'retries', item.retries, 100, undefined, 'Enter only extra calls. If retries are already included in your base call count, leave this blank.')}
        {advanced && number('toolCalls', 'toolCalls', item.toolCalls)}
      </>;
    }
  }
  const rows = result.lines.filter(line => line.objectId === item.id || item.kind === 'model-deployment' && line.pricingOwner === item.id);
  const issues = result.issues.filter(issue => issue.id === item.id);
  const unknownPrice = hasUnknownPrice(rows);
  const canUseProfile = item.kind === 'agent' && item.platform === 'foundry-agent-service' &&
    item.modelSource === 'deployment-ref' && model && (model.mode === 'payg' || model.mode === 'provisioned');
  const visibleLevels: readonly Level[] = tab === 'Usage' && item.kind === 'model-deployment' && item.mode === 'provisioned'
    ? levels.filter(choice => choice !== 'Detailed')
    : tab !== 'Configuration' ? []
    : item.kind === 'supporting-resource' || item.kind === 'security-policy' || (item.kind === 'licence-entitlement' && item.procurement === 'existing')
      ? levels.filter(choice => choice !== 'Advanced')
    : item.kind === 'licence-entitlement' ? levels.filter(choice => choice !== 'Advanced')
      : levels;
  const selectedLevel = visibleLevels.includes(level) ? level : level === 'Advanced' ? 'Detailed' : 'Essential';
  const sections = ['Configuration', ...(item.kind === 'agent' || item.kind === 'model-deployment' ? ['Usage'] : []), 'Dependencies', 'Costs'];

  return <aside ref={panel} className="panel inspector" aria-labelledby="inspector-title">
    <header className="inspector-header"><span className="subtle-label">{kindLabels[item.kind]}</span><h2 id="inspector-title" tabIndex={-1}>{item.name}</h2>
      <div className="inspector-badges">
        {missing.length > 0 && <span className="status warning">Draft · {missing.length} {missing.length === 1 ? 'input' : 'inputs'} needed</span>}
        {unknownPrice && <span className="status price-unknown">Unknown price</span>}
      </div></header>
    <div className="tabs" role="group" aria-label="Inspector sections">
      {sections.map(label => <button key={label} type="button" aria-pressed={tab === label} onClick={() => setTab(label)}>{label}</button>)}
    </div>
    <div className="inspector-content" key={tab}>
      {error && <p role="alert" className="notice">{error}</p>}
      {issues.map(issue => <p className="notice" key={issue.message}>{issue.message}</p>)}
      {missing.length > 0 && <p className="draft-note">Complete the marked fields when you have the information. Export JSON to keep a copy of this draft.</p>}
      {unknownPrice && <p className="field-hint">At least one charge has usage but needs a price. Open Costs to check the billing unit and available pricing options.</p>}
      {visibleLevels.length > 0 && <div className="level-control" role="group" aria-label="Configuration detail">
        {visibleLevels.map(choice => <button type="button" key={choice} aria-pressed={visibleLevels.includes(selectedLevel) ? selectedLevel === choice : choice === 'Essential'} onClick={() => setLevel(choice)}>{choice}</button>)}
      </div>}
      {tab === 'Configuration' && <>{missing.includes('linkedDeployment') && <p className="field-hint">Choose the model deployment this agent uses so the studio can estimate its costs.</p>}<Text field="objectName" value={item.name} onChange={value => change('name', value)} />{renderConfiguration()}
        <EvidenceFindings label="Technical compatibility" items={result.technicalFindings.filter(finding => finding.id === item.id || finding.related === item.id)} />
        <EvidenceFindings label="Licensing evidence" items={result.licensingFindings.filter(finding => finding.id === item.id)} />
      </>}
      {tab === 'Usage' && (item.kind === 'agent' ? <>
        {item.platform === 'copilot-studio' && item.modelSource === 'platform-managed'
          ? <>
            <Select field="creditMethod" value={item.creditMethod} options={[[ 'breakdown', 'Break down by activity' ]]}
              empty="Enter a monthly total" onChange={value => change('creditMethod', value || undefined)} />
            {item.creditMethod === 'breakdown'
              ? <div className="field-group"><h3>Monthly billable Copilot Credits</h3>
                <p className="field-hint">Enter measured or documented credits for each applicable activity. Include billable credits only and enter each activity once. The studio adds these amounts before applying linked monthly packs.</p>
                {(Object.entries(creditCategories) as [CreditCategory, string][]).map(([category, label]) => <NumberField
                  key={category} field="creditCategory" label={`${label} credits`} value={item.creditBreakdown?.[category]}
                  onChange={value => {
                    const next = { ...item.creditBreakdown, [category]: value };
                    if (value === undefined) delete next[category];
                    change('creditBreakdown', next);
                  }} />)}
                {missing.includes('creditCategory') && <p className="field-missing">Enter credits for at least one category to complete the estimate.</p>}
              </div>
              : number('credits', 'credits', item.credits, undefined, undefined, 'Enter billable credits for the month. Review the plan-specific rate separately under Costs.')}
            <Field field="usesAllowance"><input type="checkbox" checked={!!item.includedUsage} onChange={event =>
              change('includedUsage', event.target.checked ? {} : undefined)} /></Field>
            {item.includedUsage && <div className="field-group">
              <NumberField field="allowanceCredits" value={item.includedUsage.credits} onChange={credits => change('includedUsage', { ...item.includedUsage, credits })} />
              <Text field="allowanceBasis" value={item.includedUsage.basis} onChange={basis => change('includedUsage', { ...item.includedUsage, basis })} />
              <Field field="allowanceExpiry"><input type="date" value={item.includedUsage.expiresOn ?? ''} onChange={event =>
                change('includedUsage', { ...item.includedUsage, expiresOn: event.target.value || undefined })} /></Field>
            </div>}
            {promptModel && <div className="field-group"><h3>External prompt usage</h3>
              {option('promptEndpoint', 'promptEndpoint', item.promptEndpoint, [['chat-completions', 'Chat completions'], ['responses', 'Responses API']])}
              {edgeSelect('agent-uses-usage')}
            </div>}
          </>
          : canUseProfile ? edgeSelect('agent-uses-usage')
          : <p className="field-hint">In Configuration, choose the platform and how this agent uses a model. The studio will show the matching usage inputs.</p>}
        {detailed && canUseProfile && <p className="field-hint">Use a separate profile for each distinct workload. Connections do not multiply traffic. Provisioned deployments use profiles only for cost allocation.</p>}
      </> : item.kind === 'model-deployment' && (item.mode === 'provisioned' ? <>
        <p className="field-hint">Enter reserved units and billable hours for the same month. This shared charge is counted once per deployment.</p>
        {number('capacity', 'capacity', item.capacity, undefined, 1)}
        {number('hours', 'billableHours', item.billableHours, 744)}
        <EvidenceFindings label="Provisioned sizing" items={result.technicalFindings.filter(finding => finding.id === item.id &&
          ['Provisioned capacity', 'Throughput feasibility'].includes(finding.title))} />
        {advanced && <>
          <Field field="allocation"><input type="checkbox" checked={!!item.allocationBasis}
            onChange={event => change('allocationBasis', event.target.checked ? 'input-tokens' : undefined)} /></Field>
          <Select field="comparePayg" value={item.comparisonOfferingId} empty="No comparison" options={inventory.filter(offer => {
            const identity = deployedIdentity(item);
            return offer.kind === 'model-deployment' && offer.model.mode === 'payg' && offer.currency === env.currency &&
              offer.model.id.toLowerCase() === identity.model && offer.model.version === identity.version && offer.selectable !== false;
          }).map(offer => [offer.id, `${offer.name} · ${regionName(offer.region)}`])}
          onChange={value => change('comparisonOfferingId', value || undefined)} />
          {number('peakInput', 'peakInputTpm', item.peakInputTpm, undefined, 1)}
          {number('peakOutput', 'peakOutputTpm', item.peakOutputTpm, undefined, 1)}
          <Field field="useReservation"><input type="checkbox" checked={!!item.reservation}
            onChange={event => change('reservation', event.target.checked ? { sku: item.sku, region: regionForOffer, currency: env.currency } : undefined)} /></Field>
          {item.reservation && <div className="field-group">
            <p className="field-hint">Scope {item.reservation.sku ?? 'unassigned'} · {item.reservation.region ? regionName(item.reservation.region) : 'unassigned'} · {item.reservation.currency ?? 'unassigned'}. Reselect the reservation and reconfirm the quote if this scope changes.</p>
            <NumberField field="reservationPtus" value={item.reservation.ptus} min={1} step={1}
              onChange={ptus => change('reservation', { ...item.reservation, ptus })} />
            <Select field="reservationTerm" value={item.reservation.term} options={[[ '1', 'One month' ], [ '12', 'One year' ]]}
              onChange={term => change('reservation', { ...item.reservation, term: term || undefined })} />
            <NumberField field="reservationTotal" value={item.reservation.total ? Number(item.reservation.total) : undefined} min={0.01}
              onChange={value => change('reservation', { ...item.reservation, total: value?.toFixed(2) })} />
            <Field field="reservationStart"><input type="date" value={item.reservation.start ?? ''}
              onChange={event => change('reservation', { ...item.reservation, start: event.target.value || undefined })} /></Field>
            <NumberField field="reservationHours" value={item.reservation.coveredHours} max={744}
              onChange={coveredHours => change('reservation', { ...item.reservation, coveredHours })} />
            <Text field="reservationRef" value={item.reservation.reference}
              onChange={reference => change('reservation', { ...item.reservation, reference })} />
          </div>}
        </>}
      </> : <p className="field-hint">{item.mode === 'payg' ? 'Pay-as-you-go token usage comes from profiles linked to agents.' : 'Choose a billing mode in Configuration to see the applicable usage inputs.'}</p>))}
      {tab === 'Dependencies' && <>
        {related.length === 0 && <p className="muted">This object has no linked dependencies.</p>}
        {related.map(edge => {
          const other = edge.from === item.id ? edge.to : edge.from;
          return <div className="dependency" key={JSON.stringify([edge.type, edge.from, edge.to])}>
            <div><small>{edgeLabels[edge.type]}</small>{other === env.id ? <p>{env.name}</p> : <button onClick={() => select(other)}>{name(other)} <ArrowUpRight size={13} /></button>}</div>
            <button className="icon-button" aria-label={`Unlink ${name(other)}`} onClick={() => update({ ...env, relationships: env.relationships.filter(item => item !== edge) })}><Link2 size={16} /> Unlink</button>
            {(edge.type === 'group-has-entitlement' || edge.type === 'licence-replaces-entitlement' || edge.type === 'agent-uses-resource') && <div className="dependency-details">
            {edge.type === 'group-has-entitlement' && <NumberField field="assignedSeats" value={edge.seats} step={1} onChange={seats => editEdge(edge, { seats })} />}
            {edge.type === 'licence-replaces-entitlement' && <>
              <NumberField field="replacementSeats" value={edge.seats} step={1} onChange={seats => editEdge(edge, { seats })} />
              <Field field="replacementDate"><input type="date" value={edge.effectiveOn ?? ''} onChange={event => editEdge(edge, { effectiveOn: event.target.value || undefined })} /></Field>
            </>}
            {edge.type === 'agent-uses-resource' && <Select field="resourceIntegration" value={edge.integration}
              options={[[ 'foundry-search', 'Foundry AI Search tool' ], [ 'foundry-private-search', 'Foundry private AI Search tool' ]]}
              empty="General resource use" onChange={value => editEdge(edge, { integration: value as Edge['integration'] || undefined })} />}
            </div>}
          </div>;
        })}
        {options.length > 0 && <>
          <Select field="relationship" value={link} options={options.map(type => [type, edgeLabels[type]])}
            onChange={value => { setLink(value); setTarget(''); }} />
          {link && <><Select field="relationshipTarget" value={target} options={
            edgeKinds[link as EdgeType][1] === 'environment' ? [[env.id, env.name]] :
              env.objects.filter(object => object.id !== item.id && object.kind === edgeKinds[link as EdgeType][1] &&
                (link !== 'licence-replaces-entitlement' || (object.kind === 'licence-entitlement' && object.procurement === 'existing'))).map(object => [object.id, object.name])}
          onChange={setTarget} />
          <button className="button" disabled={!target} onClick={() => setEdge(link as EdgeType, target, ['agent-uses-deployment', 'agent-uses-usage', 'agent-uses-prompt-model'].includes(link))}>Link object</button></>}
        </>}
      </>}
      {tab === 'Costs' && <><CapacityComparisons rows={result.capacityComparisons.filter(row => row.id === item.id)} currency={env.currency} />
        <Lines lines={rows} env={env} update={update} checkedAt={catalogue.manifest.lastCheckedAt} compact /></>}
      <div className="inspector-footer"><button className="button danger" onClick={remove}><Trash2 size={15} /> Delete object</button></div>
    </div>
  </aside>;
}
