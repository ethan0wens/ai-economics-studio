import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Link2, Trash2 } from 'lucide-react';
import { edgeKinds, kindLabels, meterKey, objectSchema, type Edge, type EdgeType, type Environment, type StudioObject } from './domain';
import { type Catalogue } from './catalogue';
import { Field, NumberField, Select, Text } from './fields';
import { compatibility } from './microsoft';
import { type Ledger } from './ledger';
import { Lines } from './pricing-ui';

const edgeLabels: Record<EdgeType, string> = {
  'agent-uses-deployment': 'Model deployment', 'agent-uses-usage': 'Usage profile', 'group-can-access-agent': 'Can access agent',
  'group-has-entitlement': 'Assigned entitlement', 'agent-invokes-agent': 'Invokes agent', 'agent-uses-resource': 'Uses resource',
  'policy-applies-to-agent': 'Applies to agent', 'policy-applies-to-group': 'Applies to user group', 'policy-applies-to-environment': 'Applies to environment', 'deployment-uses-resource': 'Uses resource',
};
export const platformOptions: [string, string][] = [['foundry-agent-service', 'Foundry Agent Service'], ['copilot-studio', 'Copilot Studio']];

export function Inspector({ item, env, catalogue, result, update, select, remove }: {
  item: StudioObject; env: Environment; catalogue: Catalogue; result: Ledger;
  update: (env: Environment) => void; select: (id: string) => void; remove: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.querySelector('input')?.focus(); }, []);
  const [tab, setTab] = useState('Configuration');
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState('');
  const options = (Object.keys(edgeKinds) as EdgeType[]).filter(key => edgeKinds[key][0] === item.kind);
  const related = env.relationships.filter(edge => edge.from === item.id || edge.to === item.id);
  const name = (id: string) => id === env.id ? env.name : env.objects.find(object => object.id === id)?.name ?? 'Missing object';
  const change = (key: string, value: unknown) => {
    const draft = { ...item, [key]: value };
    const checked = objectSchema.safeParse(draft);
    if (checked.success) {
      setError('');
      update({ ...env, objects: env.objects.map(object => object.id === item.id ? checked.data : object) });
    } else setError(checked.error.issues[0].message);
  };
  const string = (label: string, key: string, value?: string, placeholder?: string) => <Text label={label} value={value}
    onChange={text => change(key, text)} placeholder={placeholder} />;
  const number = (label: string, key: string, value?: number, max?: number, step?: number) =>
    <NumberField label={label} value={value} max={max} step={step} onChange={value => change(key, value)} />;
  const option = (label: string, key: string, value: string | undefined, options: (string | [string, string])[]) =>
    <Select label={label} value={value} options={options} onChange={value => change(key, value || undefined)} />;
  const setEdge = (type: EdgeType, to: string, replace = false) => {
    const current = replace ? env.relationships.filter(edge => edge.from !== item.id || edge.type !== type) : env.relationships;
    const edge: Edge = { type, from: item.id, to };
    update({ ...env, relationships: to ? [...current, edge] : current });
  };
  const edgeSelect = (type: 'agent-uses-deployment' | 'agent-uses-usage') => <Select label={edgeLabels[type]}
    value={related.find(edge => edge.from === item.id && edge.type === type)?.to}
    options={env.objects.filter(object => object.kind === edgeKinds[type][1]).map(object => [object.id,
      object.kind === 'model-deployment' ? [object.name, object.modelId, object.region || env.region, object.mode].filter(Boolean).join(' / ') : object.name])}
    onChange={value => setEdge(type, value, true)} empty="Unlinked" />;
  const renderConfiguration = () => {
    switch (item.kind) {
      case 'agent': {
        const modelId = related.find(edge => edge.from === item.id && edge.type === 'agent-uses-deployment')?.to;
        const model = env.objects.find(object => object.id === modelId);
        const evidence = compatibility(item, model?.kind === 'model-deployment' ? model : undefined);
        return <>
        {option('Platform', 'platform', item.platform, platformOptions)}
        {option('Model source', 'modelSource', item.modelSource, [['platform-managed', 'Platform-managed'], ['deployment-ref', 'Linked model deployment']])}
        {item.modelSource === 'deployment-ref' && edgeSelect('agent-uses-deployment')}
        {option('Autonomy', 'autonomy', item.autonomy, ['read-only', 'approved-writes', 'autonomous-writes'])}
        {option('Data sensitivity', 'sensitivity', item.sensitivity, ['public', 'internal', 'confidential', 'regulated'])}
        {option('Identity', 'identity', item.identity, ['delegated', 'application'])}
        {string('Tools and knowledge sources', 'tools', item.tools)}
        {'source' in evidence && <p className="muted">Compatibility: {evidence.status.replaceAll('-', ' ')} · <a href={evidence.source} target="_blank" rel="noreferrer">Microsoft guidance</a></p>}
      </>;
      }
      case 'model-deployment': return <>
        {string('Model identifier', 'modelId', item.modelId)}
        {string('Model version', 'modelVersion', item.modelVersion)}
        {string('SKU', 'sku', item.sku)}
        <Text label="Region" value={item.region} placeholder={env.region} onChange={value => change('region', value || undefined)} />
        {option('Billing mode', 'mode', item.mode, [['payg', 'Pay as you go'], ['provisioned', 'Provisioned capacity']])}
      </>;
      case 'user-group': return <>
        {number('Total population', 'population', item.population, undefined, 1)}
        {number('Intended audience', 'intended', item.intended, undefined, 1)}
        {number('Monthly active users', 'active', item.active, undefined, 1)}
        {number('Monthly interactions', 'interactions', item.interactions, undefined, 1)}
      </>;
      case 'licence-entitlement': return <>
        {string('Product or SKU', 'product', item.product)}
        {option('Procurement state', 'procurement', item.procurement, [['existing', 'Already owned'], ['incremental', 'Incremental'], 'unknown'])}
        {number('Deduplicated seats', 'seats', item.seats, undefined, 1)}
      </>;
      case 'supporting-resource': {
        const meters = catalogue.records.filter(record => record.currency === env.currency && record.region === (item.region ?? env.region));
        return <>
          {string('Resource category', 'category', item.category)}
          <Text label="Region" value={item.region} placeholder={env.region} onChange={value => change('region', value || undefined)} />
          <Select label="Verified Azure retail meter" value={item.meter && meterKey(item.meter)}
            options={[...(item.meter && !meters.some(record => meterKey(record) === meterKey(item.meter!)) ?
              [[meterKey(item.meter), 'Previously selected meter (unavailable)'] as [string, string]] : []),
              ...meters.map(record => [meterKey(record), `${record.product} / ${record.sku} / ${record.unit}`] as [string, string])]}
            onChange={key => {
              const record = meters.find(record => meterKey(record) === key);
              change('meter', record && { meterId: record.meterId, sku: record.sku, region: record.region, unit: record.unit, quantityPerUnit: record.quantityPerUnit, priceType: record.priceType });
            }} empty="Manual billing assumption" />
          {number('Monthly usage quantity', 'monthlyQuantity', item.monthlyQuantity)}
        </>;
      }
      case 'security-policy': return <>
        {option('Control', 'control', item.control, ['identity', 'approval', 'audit', 'dlp', 'budget'])}
        {option('Declared status', 'status', item.status, ['implemented', 'planned', 'absent', 'unknown'])}
        {string('Control notes', 'detail', item.detail)}
      </>;
      case 'usage-profile': return <>
        {number('Monthly executions', 'executions', item.executions, undefined, 1)}
        {number('Model calls per execution', 'calls', item.calls)}
        {number('Input tokens per call', 'input', item.input, undefined, 1)}
        {number('Output tokens per call', 'output', item.output, undefined, 1)}
        {number('Additional retries (%)', 'retries', item.retries, 100)}
        {number('Tool calls per execution', 'toolCalls', item.toolCalls)}
        <p className="muted">Enter calls before retries. Include downstream executions in their own profiles once. Tool consumption can be declared as a supporting resource.</p>
      </>;
    }
  };
  const rows = result.lines.filter(line => line.objectId === item.id || item.kind === 'model-deployment' &&
    env.relationships.some(edge => edge.type === 'agent-uses-deployment' && edge.to === item.id && edge.from === line.objectId && line.category === 'Inference'));
  const issues = result.issues.filter(issue => issue.id === item.id);

  return <aside ref={panel} className="panel inspector" aria-labelledby="inspector-title">
    <header className="inspector-header"><span className="subtle-label">{kindLabels[item.kind]}</span><h2 id="inspector-title">{item.name}</h2></header>
    <div className="tabs" role="group" aria-label="Inspector sections">
      {['Configuration', 'Usage', 'Dependencies', 'Costs'].map(label => <button key={label} type="button" aria-pressed={tab === label} onClick={() => setTab(label)}>{label}</button>)}
    </div>
    <div className="inspector-content" key={tab}>
      {error && <p role="alert" className="notice">{error}</p>}
      {issues.map(issue => <p className="notice" key={issue.message}>{issue.message}</p>)}
      {tab === 'Configuration' && <><Text label="Object name" value={item.name} onChange={value => change('name', value)} />{renderConfiguration()}</>}
      {tab === 'Usage' && (item.kind === 'agent' ? <>
        {item.platform === 'copilot-studio' ? number('Monthly Copilot credits', 'credits', item.credits) : edgeSelect('agent-uses-usage')}
        <p className="muted">Enter monthly assumptions for this workload. Connections do not automatically multiply traffic.</p>
      </> : item.kind === 'model-deployment' ? <>
        {number('Provisioned capacity units', 'capacity', item.capacity)}
        {number('Billable hours per month', 'billableHours', item.billableHours, 744)}
        <Field label="Allocate fixed cost by declared input tokens"><input type="checkbox" checked={!!item.allocationBasis}
          onChange={event => change('allocationBasis', event.target.checked ? 'input-tokens' : undefined)} /></Field>
      </> : renderConfiguration())}
      {tab === 'Dependencies' && <>
        {related.length === 0 && <p className="muted">This object has no linked dependencies.</p>}
        {related.map(edge => {
          const other = edge.from === item.id ? edge.to : edge.from;
          return <div className="dependency" key={JSON.stringify(edge)}>
            <div><small>{edgeLabels[edge.type]}</small>{other === env.id ? <p>{env.name}</p> : <button onClick={() => select(other)}>{name(other)} <ArrowUpRight size={13} /></button>}</div>
            <button className="icon-button" aria-label={`Unlink ${name(other)}`} onClick={() => update({ ...env, relationships: env.relationships.filter(item => item !== edge) })}><Link2 size={16} /> Unlink</button>
          </div>;
        })}
        {options.length > 0 && <>
          <Select label="Relationship type" value={link} options={options.map(type => [type, edgeLabels[type]])}
            onChange={value => { setLink(value); setTarget(''); }} />
          {link && <><Select label="Target" value={target} options={
            edgeKinds[link as EdgeType][1] === 'environment' ? [[env.id, env.name]] :
              env.objects.filter(object => object.id !== item.id && object.kind === edgeKinds[link as EdgeType][1]).map(object => [object.id, object.name])}
          onChange={setTarget} />
          <button className="button" disabled={!target} onClick={() => setEdge(link as EdgeType, target, link === 'agent-uses-deployment' || link === 'agent-uses-usage')}>Link object</button></>}
        </>}
      </>}
      {tab === 'Costs' && <Lines lines={rows} env={env} update={update} compact />}
      <div className="inspector-footer"><button className="button danger" onClick={remove}><Trash2 size={15} /> Delete object</button></div>
    </div>
  </aside>;
}
