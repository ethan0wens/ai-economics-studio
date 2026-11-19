import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, Boxes, ChevronRight, Cloud, Cpu, FileText, Gauge, Plus, ShieldCheck, Users } from 'lucide-react';
import { blankEnvironment, cloneEnvironment, disclaimer, environmentSchema, importEnvironment, kindLabels, maxBytes, maxObjects, removeObject, type Environment, type Kind } from './domain';
import { emptyCatalogue, loadCatalogue, retailDocs, type Catalogue } from './catalogue';
import { formatMoney, governance, ledger, summarize, type Ledger } from './ledger';
import { Coverage } from './coverage-ui';
import { Inspector } from './inspector';
import { basisNames, CostAnalysis, Scenario } from './pricing-ui';
import { Field, FieldHelp } from './fields';
import { hasUnknownPrice, missingInputs } from './inspector-status';
import { download } from './download';
import { CapacityComparisons } from './capacity-ui';
import { LicenceEstate } from './validation-ui';
import { currentRoute, destinations, routeHref, type Destination } from './navigation';
import { Home, Modal, StudioNavigation } from './workspace-ui';
import { GuidedBuilder } from './guided-ui';
import type { Intent } from './guided-state';
import { CostDrivers, EstimateReadiness, EstimateSummary, type EditTarget } from './estimate-ui';
import { openExample } from './examples';
import { LearnMore } from './learn-more';

const Architecture = lazy(() => import('./diagram'));
const Examples = lazy(() => import('./examples-ui').then(module => ({ default: module.Examples })));
const Documentation = lazy(() => import('./documentation-ui').then(module => ({ default: module.Documentation })));
const icons = {
  agent: Activity, 'model-deployment': Cpu, 'usage-profile': Gauge, 'user-group': Users, 'licence-entitlement': FileText,
  'supporting-resource': Cloud, 'security-policy': ShieldCheck,
};
const kinds = Object.keys(kindLabels) as Kind[];
const publicViews = new Set<Destination>(['home', 'documentation', 'examples', 'catalogue']);
type Opening = { env: Environment; kind: 'new' | 'import' | 'example' | 'copy' };
type View = 'guided' | 'advanced';

function Comparison({ env, result }: { env: Environment; result: Ledger }) {
  return <div className="compare-grid">{Object.entries(result.summary).map(([key, summary]) => <div key={key}>
    <h3>{basisNames[key as keyof typeof basisNames]}</h3><strong>{result.lines.length > summary.incomplete ? formatMoney(summary.known, env.currency) : '—'}</strong>
    <small>{result.lines.length > summary.incomplete ? `${formatMoney(summary.annual, env.currency)} per year` : 'No resolved lines'}</small>
    {summary.incomplete > 0 && <small>{summary.incomplete} incomplete</small>}
  </div>)}</div>;
}

function Inventory({ env, catalogue, result, selected, target, select, update, add, remove, clear }: {
  env: Environment; catalogue: Catalogue; result: Ledger; selected?: string; target?: EditTarget;
  select: (id: string) => void; update: (env: Environment) => boolean; add: () => void; remove: () => void; clear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Kind | ''>('');
  const active = env.objects.find(item => item.id === selected);
  const visible = env.objects.filter(item => (!filter || item.kind === filter) && `${item.name} ${kindLabels[item.kind]}`.toLowerCase().includes(query.toLowerCase()));
  return <div className={`builder-grid${active ? ' object-open' : ''}`}>
    <section className="panel padded inventory">
      <div className="section-heading"><h2 tabIndex={-1} id="inventory-heading">Inventory</h2>
        <button className="button" onClick={add}><Plus size={17} aria-hidden="true" />Add object</button></div>
      <div className="inventory-filters">
        <Field field="inventorySearch"><input placeholder="Search objects…" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <Field field="inventoryType"><select value={filter} onChange={event => setFilter(event.target.value as Kind | '')}>
          <option value="">All types</option>{kinds.map(kind => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select></Field>
      </div>
      {visible.length === 0 && <div className="empty"><Boxes size={26} aria-hidden="true" /><h3>{env.objects.length ? 'No matching objects' : 'No objects yet'}</h3>
        {!env.objects.length && <p>Add any object to start a draft, or switch to Guided to build an agent and its workload together.</p>}</div>}
      {kinds.map(kind => {
        const group = visible.filter(item => item.kind === kind);
        const Icon = icons[kind];
        return group.length ? <section className="inventory-group" key={kind}><h3>{kindLabels[kind]} <small>{group.length}</small></h3>
          {group.map(item => {
            const lines = result.lines.filter(line => line.objectId === item.id);
            const status = missingInputs(item, env).length ? 'Draft' : hasUnknownPrice(lines) ? 'Unknown price'
              : result.issues.some(issue => issue.id === item.id) || lines.some(line => line.amounts.current === null) ||
                result.technicalFindings.some(finding => finding.id === item.id && finding.status !== 'compatible') ||
                result.licensingFindings.some(finding => finding.id === item.id && finding.status !== 'Verified') ? 'Needs review' : 'Configured';
            const subtotal = summarize(lines, env.currency).current;
            return <button key={item.id} data-object={item.id} className="object-row" aria-pressed={selected === item.id} onClick={() => select(item.id)}>
              <span className="tile blue"><Icon size={16} aria-hidden="true" /></span><span className="object-name"><strong>{item.name}</strong>
                <small>{env.relationships.filter(edge => edge.from === item.id || edge.to === item.id).length} links</small></span>
              <span className={`status ${status === 'Unknown price' ? 'price-unknown' : status === 'Configured' ? '' : 'warning'}`}>{status}</span>
              {lines.length > 0 && <small>{subtotal.incomplete === lines.length ? 'Unknown' : formatMoney(subtotal.known, env.currency)}</small>}
              <ChevronRight size={15} aria-hidden="true" />
            </button>;
          })}
        </section> : null;
      })}
    </section>
    {active ? <div className="inventory-editor"><button className="button back-inventory" onClick={() => {
      clear();
      requestAnimationFrame(() => (Array.from(document.querySelectorAll<HTMLButtonElement>('[data-object]')).find(node => node.dataset.object === active.id) ??
        document.getElementById('inventory-heading'))?.focus());
    }}>Back to inventory</button><Inspector key={active.id + (target?.id === active.id ? ':' + (target.field ?? target.section ?? '') : '')}
      item={active} env={env} catalogue={catalogue} result={result} update={update} select={select} remove={remove} focus={target?.id === active.id ? target : undefined} /></div>
      : <aside className="panel empty"><h2>Object inspector</h2><p>Select an object to edit its configuration, usage and connections.</p></aside>}
  </div>;
}

export default function App() {
  const [workspace, setWorkspace] = useState<Environment>();
  const blank = useMemo(blankEnvironment, []);
  const env = workspace ?? blank;
  const [dirty, setDirty] = useState(false);
  const [exported, setExported] = useState(false);
  const [estimateChanged, setEstimateChanged] = useState(false);
  const [route, setRoute] = useState(currentRoute);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<View>('guided');
  const [intent, setIntent] = useState<Intent>();
  const [selected, setSelected] = useState<string>();
  const [generated, setGenerated] = useState<ReadonlySet<string>>(() => new Set());
  const [target, setTarget] = useState<EditTarget>();
  const [returnView, setReturnView] = useState<{ page: Destination; mode: View; step: number }>();
  const [modal, setModal] = useState<'add' | 'delete' | 'settings' | null>(null);
  const [opening, setOpening] = useState<Opening>();
  const [catalogue, setCatalogue] = useState(emptyCatalogue);
  const [candidate, setCandidate] = useState<Catalogue>();
  const [catalogueNote, setCatalogueNote] = useState('Checking the public catalogue…');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);
  const imported = useRef<HTMLInputElement>(null);
  const main = useRef<HTMLElement>(null);
  const workspaceRoute = useRef<Destination>('builder');
  const navigationStarted = useRef(false);
  const contextField = useRef<string | undefined>(undefined);
  const restoreContext = useRef(false);
  const previousPage = useRef<Destination>(route.page);
  const result = useMemo(() => ledger(env, catalogue.records, undefined, catalogue.inventory), [env, catalogue]);
  const advice = useMemo(() => governance(env), [env]);
  const selectedItem = env.objects.find(item => item.id === selected);
  const fileName = env.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'environment';
  const status = dirty ? 'Unexported changes' : estimateChanged ? 'Estimate changed since export' : exported ? 'JSON copy available' : 'Open in this tab';
  const sourceSnapshot = env.sourceSnapshot;
  const snapshotCurrent = result.lines.some(line => line.amounts.current !== null) ? result.summary.current.known : null;
  const snapshotNote = sourceSnapshot && <p className="muted">Imported estimate {sourceSnapshot.catalogueId?.slice(0, 12) ?? 'without catalogue'} · previous known-cost subtotal {formatMoney(sourceSnapshot.current, env.currency)} · {sourceSnapshot.incomplete} incomplete.
    Recalculated with the applied catalogue · {formatMoney(snapshotCurrent, env.currency)} known · {result.summary.current.incomplete} incomplete.</p>;

  useEffect(() => {
    function routeChange() {
      const focus = document.activeElement?.closest<HTMLElement>('[data-field]');
      const next = currentRoute();
      if (next.page === 'documentation' && previousPage.current !== 'documentation') contextField.current = focus?.dataset.field;
      navigationStarted.current = true;
      setRoute(next);
    }
    window.addEventListener('hashchange', routeChange);
    return () => window.removeEventListener('hashchange', routeChange);
  }, []);
  useEffect(() => {
    const from = previousPage.current;
    previousPage.current = route.page;
    if (!publicViews.has(route.page)) workspaceRoute.current = route.page;
    if (!navigationStarted.current) return;
    if (target && ((route.page === 'builder' && !target.line) || (route.page === 'costs' && target.line))) return;
    if (route.section && route.page === 'documentation') return;
    const frame = requestAnimationFrame(() => {
      if (from === 'documentation' && route.page === 'builder' && restoreContext.current && contextField.current) {
        restoreContext.current = false;
        const field = main.current?.querySelector<HTMLElement>(`[data-field="${CSS.escape(contextField.current)}"] :is(input,select,textarea)`);
        if (field) { field.focus(); return; }
      }
      restoreContext.current = false;
      const heading = main.current?.querySelector('h1');
      heading?.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [route, target]);
  useEffect(() => {
    let alive = true;
    loadCatalogue().then(value => {
      if (!alive) return;
      setCatalogue(value);
      setCatalogueNote(value.fallback ? 'Using the last validated catalogue. The latest check time is unavailable.' : '');
    }).catch(() => { if (alive) setCatalogueNote('The pricing catalogue is unavailable. You can continue editing and review any unresolved charges in Cost Analysis.'); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ''; }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  function navigate(page: Destination) {
    if (window.location.hash !== routeHref(page)) window.location.hash = routeHref(page);
  }
  function update(value: Environment) {
    const checked = environmentSchema.safeParse({ ...value, updatedAt: new Date().toISOString() });
    if (!checked.success) { setError(checked.error.issues[0].message); return false; }
    setError(''); setWorkspace(checked.data); setDirty(true);
    return true;
  }
  function selectObject(id: string, field?: FieldIdLike) {
    setTarget(field ? { id, field, section: ['capacity', 'hours', 'credits', 'creditCategory', 'creditMethod'].includes(field) ? 'Usage' : undefined } : undefined);
    setSelected(id); setMode('advanced'); navigate('builder');
  }
  function edit(target: EditTarget) {
    setReturnView({ page: route.page, step, mode });
    setTarget({ ...target });
    if (target.line) navigate('costs');
    else { setSelected(target.id); setMode('advanced'); navigate('builder'); }
  }
  function returnToReview() {
    if (!returnView) return;
    const returnTo = returnView;
    setTarget(undefined); setReturnView(undefined); setMode(returnTo.mode); setStep(returnTo.step);
    navigate(returnTo.page);
    requestAnimationFrame(() => document.getElementById('readiness-title')?.focus());
  }
  function add(kind: Kind) {
    if (env.objects.length >= maxObjects) { setError(`An environment can hold up to ${maxObjects} objects.`); return; }
    const id = crypto.randomUUID();
    if (update({ ...env, objects: [...env.objects, { id, kind, name: `New ${kindLabels[kind].toLowerCase()}` }] })) {
      setModal(null); selectObject(id);
    }
  }
  function finishOpen(value: Opening) {
    setWorkspace(value.env); setDirty(value.kind === 'copy' || value.kind === 'example');
    setExported(value.kind === 'import'); setEstimateChanged(false); setSelected(undefined); setTarget(undefined); setReturnView(undefined);
    setIntent(undefined); setGenerated(new Set()); setMode('guided'); setStep(value.kind === 'new' ? 0 : 4); setOpening(undefined); setError('');
    if (value.kind === 'import') setToast('Environment imported. Costs have been recalculated with the applied catalogue.');
    navigate('builder');
  }
  function requestOpen(value: Opening) {
    if (dirty && workspace) setOpening(value);
    else finishOpen(value);
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > maxBytes) throw new Error('Choose an AI Economics Studio JSON export of 2 MB or less.');
      requestOpen({ env: importEnvironment(await file.text()), kind: 'import' });
    } catch (reason) {
      const detail = reason instanceof SyntaxError ? 'The file is not valid JSON.' :
        reason instanceof Error ? reason.message : 'The file could not be read.';
      setError(`Could not import this environment. ${detail} Choose a valid JSON export from the studio.`);
    }
  }
  function exportJson() {
    download(JSON.stringify({ ...env, sourceSnapshot: { catalogueId: catalogue.manifest.catalogueId,
      checkedAt: catalogue.manifest.lastCheckedAt, current: snapshotCurrent, incomplete: result.summary.current.incomplete,
      currentKnown: result.summary.current.known, annualKnown: result.summary.current.annual, forecastKnown: result.summary.forecast.known,
      licenceEstate: { existing: result.licenceEstate.existing, proposed: result.licenceEstate.proposed },
    } }, null, 2), `${fileName}.json`, 'application/json');
    setDirty(false); setExported(true); setEstimateChanged(false); setToast('JSON copy downloaded. Use it to reopen this environment later.');
  }
  async function exportPdf() {
    setExporting(true);
    try {
      const { report } = await import('./report');
      const bytes = await report(env, result, catalogue, advice);
      download(new Uint8Array(bytes).buffer, `${fileName}.pdf`, 'application/pdf');
      setToast('Your PDF report is ready.');
    } catch (reason) { setError(`Could not create the PDF. Try again or export JSON to keep your work. ${reason instanceof Error ? reason.message : ''}`); }
    finally { setExporting(false); }
  }
  async function refreshCatalogue() {
    try {
      const next = await loadCatalogue();
      const changed = next.manifest.catalogueId !== catalogue.manifest.catalogueId || next.manifest.lastCheckedAt !== catalogue.manifest.lastCheckedAt;
      setCandidate(changed ? next : undefined);
      setCatalogueNote(changed ? 'An updated, verified catalogue is ready. Apply it to update the retail prices in your estimate.' : next.records.length ? 'You have the latest published catalogue.' : 'Verified retail prices are currently unavailable.');
    } catch (reason) { setCatalogueNote(reason instanceof Error ? reason.message : 'Unable to refresh catalogue.'); }
  }

  const sourcePanel = <section className="panel source-bar">
    <div><span className="tile blue"><Cloud size={17} aria-hidden="true" /></span><div><strong>Microsoft pricing catalogue</strong>
      <small>{catalogue.manifest.catalogueId ? `${catalogue.records.length} published rates · ${catalogue.manifest.lastCheckedAt ?? 'Check time unavailable'}` : 'No verified retail data published'}
        {catalogue.manifest.lastCheckedAt && Date.now() - Date.parse(catalogue.manifest.lastCheckedAt) > 7 * 86400000 ? ' · Stale' : ''}</small></div></div>
    <div className="actions"><a href={retailDocs} target="_blank" rel="noreferrer">Source documentation</a><button className="button" onClick={refreshCatalogue}>Check for updates</button></div>
    {catalogueNote && <p role="status">{catalogueNote}</p>}
    {candidate && <button className="button primary" onClick={() => {
      setCatalogue(candidate); setCandidate(undefined); setEstimateChanged(exported); setCatalogueNote('Catalogue applied. Your customer pricing agreements and forecast assumptions still apply.');
    }}>Apply catalogue</button>}
    {snapshotNote}
  </section>;
  const activeComparison = env.pricingOverrides.length > 0 || env.forecast.percent !== 0 || env.forecast.exceptions.length > 0;
  const workspaceHeading = route.page !== 'home' && !publicViews.has(route.page);
  const editActions = <div className="builder-tools">
    <div className="mode-control" role="group" aria-label="Builder mode">
      <button className="button" aria-pressed={mode === 'guided'} onClick={() => { setMode('guided'); setTarget(undefined); }}>Guided</button>
      <button className="button" aria-pressed={mode === 'advanced'} onClick={() => { setMode('advanced'); setTarget(undefined); }}>Advanced</button>
    </div>
    {mode === 'advanced' && <div className="actions"><a href={routeHref('architecture')}>Architecture</a><a href={routeHref('governance')}>Security & Governance</a></div>}
  </div>;
  return <div className="studio ux-studio">
    <a className="skip" href="#main" onClick={event => { event.preventDefault(); main.current?.focus(); }}>Skip to content</a>
    <StudioNavigation page={route.page} />
    <div className="body">
      {workspace && <header className="topbar workspace-top">
        <button className="workspace-name" aria-label={`Settings for ${env.name}`} onClick={() => setModal('settings')}>{env.name}</button>
        <span className={`save-state ${dirty ? 'dirty' : ''}`}>{status}</span>
      </header>}
      <main id="main" ref={main} tabIndex={-1} className={route.page === 'home' ? 'home-main' : undefined}>
        {workspaceHeading && <header className="page-heading"><div><h1 tabIndex={-1}>{destinations[route.page]}</h1>
          {route.page === 'costs' && <p>See your estimated costs, review what needs confirming and check how each charge was calculated.</p>}
          {route.page === 'builder' && <p>Build your AI solution and estimate the cost of agents, usage and supporting services.</p>}</div>
          {route.page === 'builder' && workspace && editActions}</header>}
        {route.page !== 'home' && error && <div role="alert" className="notice error">{error}
          <button className="button" onClick={() => setError('')}>Dismiss</button></div>}
        {returnView && (route.page === 'costs' || route.page === 'builder') && <button className="link-button return-link" onClick={returnToReview}>Back to estimate checks</button>}
        {route.page === 'home' && <Home env={workspace} status={status} error={error} create={name => requestOpen({ kind: 'new', env: { ...blankEnvironment(), name } })}
          importFile={() => imported.current?.click()} resume={() => navigate(workspaceRoute.current)} />}
        {workspaceHeading && !workspace && <section className="panel padded empty workspace-empty"><h2>Open an environment</h2>
          <p>Start a new environment or reopen one you previously exported as JSON.</p><div className="actions">
            <a className="button primary" href={routeHref('home')}>Create environment</a>
            <button className="button" onClick={() => imported.current?.click()}>Import existing</button>
          </div></section>}
        {workspace && route.page === 'builder' && <>
          <EstimateSummary {...{ env, result, catalogue }} compact />
          {mode === 'guided' ? <GuidedBuilder {...{ env, catalogue, result, update, step, setStep, intent, setIntent, selected }}
            select={setSelected} advanced={selectObject} generated={generated} remember={id => setGenerated(current => new Set([...current, id]))} review={<div className="page-stack">
              {snapshotNote}<EstimateReadiness env={env} result={result} edit={edit} /><div className="actions">
                <a className="button primary" href={routeHref('costs')}>Open Cost Analysis <ArrowRight size={17} aria-hidden="true" /></a>
                <button className="button" disabled={exporting || !env.objects.length} onClick={exportPdf}>{exporting ? 'Generating PDF…' : 'Generate PDF'}</button>
                <a className="button" href={routeHref('reports')}>Reports & Export</a></div>
            </div>} /> : <Inventory {...{ env, catalogue, result, update, selected, target }} select={id => selectObject(id)}
              clear={() => { setSelected(undefined); setTarget(undefined); }} add={() => setModal('add')} remove={() => setModal('delete')} />}
        </>}
        {workspace && route.page === 'costs' && <div className="page-stack">
          <EstimateSummary {...{ env, result, catalogue }} />
          <EstimateReadiness env={env} result={result} edit={edit} />
          <CostDrivers env={env} result={result} />
          <LicenceEstate result={result} currency={env.currency} />
          <CostAnalysis key={target?.line ?? 'ledger'} env={env} result={result} update={update}
            checkedAt={catalogue.manifest.lastCheckedAt} focusLine={target?.line} />
          <details className="panel padded assumption-details" open={activeComparison || undefined}><summary>Compare pricing assumptions</summary>
            <p className="muted">Compare verified Microsoft retail prices, your current estimate and a separate forecast based on your assumptions.</p>
            <Comparison env={env} result={result} /><Scenario env={env} update={update} />
            <CapacityComparisons rows={result.capacityComparisons} currency={env.currency} />
            <LearnMore guide="agreement">Contractual pricing</LearnMore>
            {' · '}<LearnMore guide="forecast">Forecast assumptions and exceptions</LearnMore>
          </details>
          {sourcePanel}
        </div>}
        {workspace && route.page === 'architecture' && <Suspense fallback={<p role="status">Preparing diagram…</p>}>
          <Architecture env={env} result={result} select={id => selectObject(id)} /></Suspense>}
        {workspace && route.page === 'governance' && <section className="panel padded"><h2>Advisory assessment</h2>
          <p className="muted">{advice.length} advisory checks based on the controls you entered. Ruleset 1.0.0.</p>
          {!advice.length && <a href={routeHref('builder')}>Add an agent to assess controls</a>}
          {advice.map(item => <article className="finding" key={item.id + item.control}><div><button className="link-button" onClick={() => selectObject(item.id)}>{item.object}</button>
            <h3>{item.title}</h3><p>{item.why}</p><a href={item.source} target="_blank" rel="noreferrer">Microsoft guidance</a></div>
            <span className="status warning">{item.status} · {item.critical ? 'High priority' : 'Advisory'}</span></article>)}
        </section>}
        {workspace && route.page === 'reports' && <div className="page-stack">
          <EstimateSummary {...{ env, result, catalogue }} />
          {result.summary.current.incomplete > 0 && <a href={routeHref('costs')}>Review unresolved charges before sharing</a>}
          <div className="overview-grid">
            <section className="panel padded report-options"><h2>Shareable PDF report</h2>
              <p>Share your estimate with its assumptions, itemised costs, sources and a logical diagram. The report also lists unresolved charges.</p>
              <div className="actions"><button className="button primary" disabled={exporting || !env.objects.length} onClick={exportPdf}>
                <ArrowDownToLine size={17} aria-hidden="true" />{exporting ? 'Generating PDF…' : 'Generate PDF'}</button>
                <a href={routeHref('architecture')}>Architecture</a></div>
              {!env.objects.length && <p className="muted">Add an agent or billable item to generate a report.</p>}
            </section>
            <section className="panel padded report-options"><h2>Editable environment file</h2>
              <p>Export a JSON copy to keep editing later. It includes your configuration, links and pricing assumptions.</p>
              <div className="actions"><button className="button" onClick={exportJson}>Export JSON</button>
                <button className="button" onClick={() => imported.current?.click()}>Import JSON</button>
                <FieldHelp field="importFile" label="Import JSON" requirement="Optional" /></div>
            </section>
          </div>{snapshotNote}
        </div>}
        {route.page === 'catalogue' && <><header className="page-heading"><div><h1 tabIndex={-1}>Pricing Catalogue</h1>
          <p>Find published Microsoft prices and check which products, regions and billing options they cover.</p></div></header>
          <Coverage catalogue={catalogue} result={result} select={id => selectObject(id)} />{sourcePanel}</>}
        <Suspense fallback={<p role="status">Loading…</p>}>
          {route.page === 'examples' && <Examples item={route.item} catalogue={catalogue} open={example => requestOpen({ kind: 'example', env: openExample(example) })} />}
          {route.page === 'documentation' && <Documentation item={route.item} technicalArticle={route.technicalArticle} section={route.section} catalogue={catalogue} hasWorkspace={!!workspace}
            back={() => { restoreContext.current = true; navigate(workspaceRoute.current); }} />}
        </Suspense>
        <footer>{disclaimer}</footer>
      </main>
    </div>
    <input ref={imported} type="file" aria-label="Import Studio JSON file" hidden accept=".json,application/json" onChange={event => {
      void importFile(event.currentTarget.files?.[0]); event.currentTarget.value = '';
    }} />
    {toast && <div role="status" className="toast">{toast}</div>}
    {opening && <Modal title="Replace the open environment?" close={() => setOpening(undefined)}>
      <p><strong>{env.name}</strong> has unexported changes. Export a JSON copy to keep them before opening <strong>{opening.env.name}</strong>.</p>
      <div className="actions"><button className="button" onClick={() => setOpening(undefined)}>Keep editing</button>
        <button className="button" onClick={exportJson}>Export JSON first</button>
        <button className="button danger" onClick={() => finishOpen(opening)}>Replace environment</button></div>
    </Modal>}
    {modal === 'add' && <Modal title="Add an object" close={() => setModal(null)}><p className="muted">Choose what you want to add. You can fill in the details later.</p>
      <div className="add-grid">{kinds.map(kind => {
        const Icon = icons[kind];
        return <button key={kind} className="button" onClick={() => add(kind)}><Icon size={19} aria-hidden="true" />{kindLabels[kind]}<ChevronRight size={15} aria-hidden="true" /></button>;
      })}</div></Modal>}
    {modal === 'delete' && selectedItem && <Modal title={`Delete ${selectedItem.name}?`} close={() => setModal(null)}>
      <p>Linked objects stay in your workspace. The connections to this object are removed.</p>
      <ul>{env.relationships.filter(edge => edge.from === selectedItem.id || edge.to === selectedItem.id).map(edge =>
        <li key={JSON.stringify(edge)}>{env.objects.find(item => item.id === (edge.from === selectedItem.id ? edge.to : edge.from))?.name ?? env.name}</li>)}</ul>
      <div className="actions"><button className="button" onClick={() => setModal(null)}>Cancel</button><button className="button danger" onClick={() => {
        if (update(removeObject(env, selectedItem.id))) { setSelected(undefined); setModal(null); }
      }}>Delete</button></div>
    </Modal>}
    {modal === 'settings' && workspace && <Modal title="Environment settings" close={() => setModal(null)}>
      <form className="settings" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (update({ ...env, name: String(data.get('name')), description: String(data.get('description')), region: String(data.get('region')),
          currency: String(data.get('currency')).toUpperCase() })) setModal(null);
      }}><Field field="environmentName"><input name="name" required maxLength={300} defaultValue={env.name} /></Field>
        <Field field="description"><textarea name="description" maxLength={300} defaultValue={env.description} /></Field>
        <Field field="defaultRegion"><input name="region" pattern="[a-z0-9\-]+" required defaultValue={env.region} /></Field>
        <Field field="currency"><input name="currency" pattern="[A-Za-z]{3}" required defaultValue={env.currency} /></Field>
        <button className="button primary">Save settings</button></form>
      <div className="actions"><button className="button" onClick={() => { setModal(null); requestOpen({ env: cloneEnvironment(env), kind: 'copy' }); }}>Duplicate environment</button>
        <a href={routeHref('home')} onClick={() => setModal(null)}>Create another environment</a></div>
    </Modal>}
  </div>;
}
type FieldIdLike = NonNullable<EditTarget['field']>;
