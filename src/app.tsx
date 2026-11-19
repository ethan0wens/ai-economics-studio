import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, Boxes, Braces, Building2, ChevronRight, CircleHelp,
  Cloud, Cpu, FileText, Gauge, GitFork, Layers3, LayoutGrid, Menu, Plus, ShieldCheck, Users, Workflow, X,
} from 'lucide-react';
import { blankEnvironment, cloneEnvironment, disclaimer, environmentSchema, importEnvironment, kindLabels, maxBytes, maxObjects, removeObject, type Environment, type Kind } from './domain';
import { emptyCatalogue, loadCatalogue, retailDocs, type Catalogue } from './catalogue';
import { categories, formatMoney, governance, ledger, summarize, type Ledger } from './ledger';
import { Coverage } from './coverage-ui';
import { Inspector } from './inspector';
import { basisNames, CostAnalysis } from './pricing-ui';
import { Field, FieldHelp } from './fields';
import { hasUnknownPrice, missingInputs } from './inspector-status';
import { download } from './download';
import { CapacityComparisons } from './capacity-ui';
import { LicenceEstate, ValidationDashboard } from './validation-ui';

const Architecture = lazy(() => import('./diagram'));
const pages = [
  ['Overview', LayoutGrid], ['Environment Builder', Boxes], ['Architecture', GitFork],
  ['Cost Analysis', BarChart3], ['Pricing Catalogue', Cloud], ['Security & Governance', ShieldCheck], ['Reports & Export', FileText],
] as const;
type Page = typeof pages[number][0];
const icons = {
  agent: Activity, 'model-deployment': Cpu, 'usage-profile': Gauge, 'user-group': Users, 'licence-entitlement': FileText,
  'supporting-resource': Cloud, 'security-policy': ShieldCheck,
};
const kinds = Object.keys(kindLabels) as Kind[];
const descriptions: Record<Page, string> = {
  Overview: 'Understand the cost, architecture and assumptions behind your Microsoft AI environment.',
  'Environment Builder': 'Add and connect objects in any order. Costs update as you configure them.',
  Architecture: 'Explore the logical relationships in your environment.',
  'Pricing Catalogue': 'Check verified coverage, current environment completeness and source freshness.',
  'Cost Analysis': 'Review monthly costs, pricing evidence and forecast assumptions.',
  'Security & Governance': 'Review declared controls and identify areas that need validation.',
  'Reports & Export': 'Download a report or save an environment you can reopen later.',
};


function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="section-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={18} /></button></div>
    {children}
  </dialog>;
}

function Summary({ result, env }: { result: Ledger; env: Environment }) {
  const { current } = result.summary;
  const values = [
    { label: 'Known monthly subtotal', value: result.lines.some(line => line.amounts.current !== null) ? formatMoney(current.known, env.currency) : '—', detail: 'Current contract basis', Icon: BarChart3, color: 'blue' },
    { label: 'Known annual run-rate', value: result.lines.some(line => line.amounts.current !== null) ? formatMoney(current.annual, env.currency) : '—', detail: 'Monthly subtotal × 12', Icon: Activity, color: 'teal' },
    { label: 'Incomplete costs', value: String(current.incomplete), detail: current.incomplete ? 'Usage or pricing needed' : 'Unresolved ledger lines', Icon: CircleHelp, color: 'amber' },
    { label: 'Environment objects', value: String(env.objects.length), detail: `${env.relationships.length} linked relationships`, Icon: Layers3, color: 'violet' },
  ];
  return <div className="summary-grid">{values.map(({ label, value, detail, Icon, color }) => <section key={label} className="panel metric">
    <div className="metric-top"><span className={`tile ${color}`}><Icon size={17} /></span><span>{label}</span></div>
    <strong>{value}</strong><small>{detail}</small>
  </section>)}</div>;
}

function Comparison({ env, result }: { env: Environment; result: Ledger }) {
  return <section className="panel padded comparison">
    <div className="section-heading"><div><h2>Price comparison</h2><p className="muted">Monthly and annual steady-state subtotals.</p></div></div>
    <div className="compare-grid">{Object.entries(result.summary).map(([key, summary]) => <div key={key}>
      <h3>{basisNames[key as keyof typeof basisNames]}</h3>
      <strong>{result.lines.length > summary.incomplete ? formatMoney(summary.known, env.currency) : '—'}</strong>
      <small>{result.lines.length > summary.incomplete ? `${formatMoney(summary.annual, env.currency)} per year` : 'No resolved lines'}</small>
      {summary.incomplete > 0 && <small>{summary.incomplete} incomplete</small>}
    </div>)}</div>
  </section>;
}

export default function App() {
  const [env, setEnv] = useState(blankEnvironment);
  const [dirty, setDirty] = useState(false);
  const [page, setPage] = useState<Page>('Overview');
  const [selected, setSelected] = useState<string>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Kind | ''>('');
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState<'add' | 'delete' | 'reset' | 'settings' | null>(null);
  const [catalogue, setCatalogue] = useState(emptyCatalogue);
  const [candidate, setCandidate] = useState<Catalogue>();
  const [catalogueNote, setCatalogueNote] = useState('Checking the public catalogue…');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [exporting, setExporting] = useState(false);
  const imported = useRef<HTMLInputElement>(null);
  const main = useRef<HTMLElement>(null);
  const result = useMemo(() => ledger(env, catalogue.records, undefined, catalogue.inventory), [env, catalogue]);
  const advice = useMemo(() => governance(env), [env]);
  const selectedItem = env.objects.find(item => item.id === selected);
  const fileName = env.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'environment';

  useEffect(() => {
    let live = true;
    loadCatalogue().then(value => {
      if (live) {
        setCatalogue(value);
        setCatalogueNote(value.fallback ? 'Using a previous validated catalogue. Its refresh time is unavailable.' : '');
      }
    }).catch(reason => { if (live) setCatalogueNote(`Catalogue unavailable. ${reason instanceof Error ? reason.message : ''}`); });
    return () => { live = false; };
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

  function navigate(next: Page) {
    setPage(next);
    setMobile(false);
    main.current?.focus();
    window.scrollTo(0, 0);
  }
  function selectObject(id: string) {
    setSelected(id);
    navigate('Environment Builder');
  }
  function update(value: Environment) {
    const checked = environmentSchema.safeParse({ ...value, updatedAt: new Date().toISOString() });
    if (!checked.success) { setError(checked.error.issues[0].message); return; }
    setError('');
    setEnv(checked.data);
    setDirty(true);
  }
  function add(kind: Kind) {
    if (env.objects.length >= maxObjects) { setError(`An environment can hold up to ${maxObjects} objects.`); return; }
    const id = crypto.randomUUID();
    update({ ...env, objects: [...env.objects, { id, kind, name: `New ${kindLabels[kind].toLowerCase()}` }] });
    setFilter('');
    setQuery('');
    setModal(null);
    selectObject(id);
  }
  function exportJson() {
    download(JSON.stringify({
      ...env,
      sourceSnapshot: { catalogueId: catalogue.manifest.catalogueId, checkedAt: catalogue.manifest.lastCheckedAt,
        current: result.lines.length > result.summary.current.incomplete ? result.summary.current.known : null, incomplete: result.summary.current.incomplete,
        currentKnown: result.summary.current.known, annualKnown: result.summary.current.annual, forecastKnown: result.summary.forecast.known,
        licenceEstate: { existing: result.licenceEstate.existing, proposed: result.licenceEstate.proposed } },
    }, null, 2), `${fileName}.json`, 'application/json');
    setDirty(false);
    setToast('Environment exported as JSON.');
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > maxBytes) throw new Error('Environment files must be 2 MB or smaller.');
      const data = importEnvironment(await file.text());
      if (dirty && !window.confirm('Replace the current unexported environment with this file?')) return;
      setEnv(data);
      setSelected(undefined);
      setDirty(false);
      setError('');
      setToast('Environment imported and recalculated using the current catalogue.');
      navigate('Environment Builder');
    } catch (reason) { setError(`Import failed. ${reason instanceof Error ? reason.message : 'Unreadable file.'}`); }
  }
  async function refreshCatalogue() {
    try {
      const next = await loadCatalogue();
      const changed = next.manifest.catalogueId !== catalogue.manifest.catalogueId || next.manifest.lastCheckedAt !== catalogue.manifest.lastCheckedAt;
      setCandidate(changed ? next : undefined);
      setCatalogueNote(changed ? 'A different validated catalogue is available.' : next.records.length ? 'You have the latest published catalogue.' : 'The source has no published verified retail data yet.');
    } catch (reason) { setCatalogueNote(reason instanceof Error ? reason.message : 'Unable to refresh catalogue.'); }
  }
  async function exportPdf() {
    setExporting(true);
    try {
      const { report } = await import('./report');
      const bytes = await report(env, result, catalogue, advice);
      download(new Uint8Array(bytes).buffer, `${fileName}.pdf`, 'application/pdf');
      setToast('PDF report generated.');
    } catch (reason) { setError(`PDF generation failed. ${reason instanceof Error ? reason.message : ''}`); }
    finally { setExporting(false); }
  }
  const overviewDistribution = categories.map(category => ({
    category, total: summarize(result.lines.filter(line => line.category === category), env.currency).current,
    known: result.lines.some(line => line.category === category && line.amounts.current !== null),
  }));
  const visible = env.objects.filter(item => (!filter || item.kind === filter) && `${item.name} ${kindLabels[item.kind]}`.toLowerCase().includes(query.toLowerCase()));
  const dependencies = selectedItem ? env.relationships.filter(edge => edge.from === selectedItem.id || edge.to === selectedItem.id) : [];
  return <div className="studio">
    <a className="skip" href="#main">Skip to content</a>
    <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
      <button className="brand" onClick={() => navigate('Overview')}><span className="brand-icon"><Workflow size={23} /></span><span>AI Economics<span className="brand-studio">Studio</span></span></button>
      <div className="workspace">
        <span className="workspace-icon"><Building2 size={17} /></span><span><small>WORKSPACE</small><strong>Local environment</strong></span>
      </div>
      <nav aria-label="Workspace navigation">
        {pages.map(([label, Icon]) => <button key={label} aria-current={page === label ? 'page' : undefined} onClick={() => navigate(label)}>
          <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{page === label && <ChevronRight className="nav-arrow" size={15} />}
        </button>)}
      </nav>
      <div className="rail-footer"><ShieldCheck size={18} /><div><strong>Private by design</strong><small>Your workspace stays in this tab.</small></div></div>
    </aside>
    <div className="body">
      <header className="topbar">
        <div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Toggle navigation" aria-expanded={mobile} onClick={() => setMobile(!mobile)}><Menu size={21} /></button>
          <span>Workspace</span><ChevronRight size={15} /><button onClick={() => setModal('settings')}>{env.name}</button></div>
        <span className={`save-state ${dirty ? 'dirty' : ''}`}><i />{dirty ? 'Not exported' : 'In memory'}</span>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        <div className="page-heading">
          <div><h1>{page}</h1><p>{descriptions[page]}</p></div>
          <div className="actions"><button className="button" onClick={exportJson}><ArrowDownToLine size={16} /> Export JSON</button>
            <button className="button primary" onClick={() => setModal('add')}><Plus size={18} /> Add object</button></div>
        </div>
        {error && <div role="alert" className="notice error">{error} <button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error"><X size={17} /></button></div>}
        {['Overview', 'Environment Builder', 'Cost Analysis'].includes(page) && <Summary result={result} env={env} />}
        {page === 'Overview' && <>
          <div className="overview-grid">
            <section className="panel padded distribution"><div className="section-heading"><div><h2>Cost breakdown</h2><p className="muted">Known monthly cost by category</p></div><button className="link-button" onClick={() => navigate('Cost Analysis')}>View ledger <ArrowRight size={15} /></button></div>
              <div className="distribution-body">
                <div className="chart" role="img" aria-label={`Known cost allocation: ${overviewDistribution.map(item => `${item.category} ${item.known ? item.total.known + ' ' + env.currency : 'unresolved'}`).join(', ')}`}>
                  <svg viewBox="0 0 150 150" aria-hidden="true"><circle className="chart-track" cx="75" cy="75" r="60" /><g transform="rotate(-90 75 75)">{overviewDistribution.map((item, index) => {
                    const total = Number(result.summary.current.known);
                    const ratio = total ? Number(item.total.known) / total : 0;
                    const offset = total ? overviewDistribution.slice(0, index).reduce((sum, entry) => sum + Number(entry.total.known), 0) / total : 0;
                    return ratio ? <circle key={item.category} className={`chart-stroke category-${index}`} cx="75" cy="75" r="60" pathLength="100" strokeDasharray={`${ratio * 100} 100`} strokeDashoffset={-offset * 100} /> : null;
                  })}</g></svg>
                  <div><strong>{overviewDistribution.some(item => item.known) ? formatMoney(result.summary.current.known, env.currency) : '—'}</strong><small>per month</small></div>
                </div>
                <ul className="legend">{overviewDistribution.map(({ category, total, known }, index) => <li key={category}><span className={`category-${index}`} /><span>{category}</span><strong>{known ? formatMoney(total.known, env.currency) : total.incomplete ? 'Unknown' : '—'}</strong></li>)}</ul>
              </div>
            </section>
            <section className="panel padded snapshot"><div className="section-heading"><div><h2>Environment inventory</h2><p className="muted">Objects in this workspace</p></div></div>
              {!env.objects.length ? <div className="empty"><span className="empty-icon"><Boxes size={26} /></span><h3>Your inventory is empty</h3><p>Add an agent, model deployment or any other object to start modelling.</p><button className="button primary" onClick={() => setModal('add')}><Plus size={17} /> Add first object</button><button className="link-button" onClick={() => imported.current?.click()}>Import existing JSON</button><FieldHelp field="importFile" label="Import existing JSON" requirement="Optional" /></div>
                : <><ul className="inventory-summary">{kinds.filter(kind => env.objects.some(item => item.kind === kind)).map(kind => {
                  const Icon = icons[kind];
                  return <li key={kind}><Icon size={16} />{kindLabels[kind]}<strong>{env.objects.filter(item => item.kind === kind).length}</strong></li>;
                })}</ul><button className="link-button" onClick={() => navigate('Environment Builder')}>Open builder <ArrowRight size={15} /></button></>}
            </section>
          </div>
          <Comparison env={env} result={result} />
          <ValidationDashboard env={env} result={result} select={selectObject} />
          <LicenceEstate result={result} currency={env.currency} />
          {result.issues.length > 0 && <section className="panel padded"><h2>Open assumptions</h2><ul className="findings">{result.issues.slice(0, 12).map(issue =>
            <li key={issue.id + issue.message}><button className="link-button" onClick={() => selectObject(issue.id)}>{env.objects.find(item => item.id === issue.id)?.name}</button> · {issue.message}</li>)}</ul></section>}
        </>}
        {page === 'Environment Builder' && <div className="builder-grid">
          <section className="panel padded inventory">
            <h2>Inventory</h2><div className="inventory-filters"><Field field="inventorySearch"><input placeholder="Search objects…" value={query} onChange={event => setQuery(event.target.value)} /></Field>
              <Field field="inventoryType"><select value={filter} onChange={event => setFilter(event.target.value as Kind | '')}><option value="">All types</option>{kinds.map(kind => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</select></Field></div>
            {visible.length === 0 && <div className="empty"><span className="empty-icon"><Boxes size={24} /></span><h3>{env.objects.length ? 'No matching objects' : 'No objects yet'}</h3>{!env.objects.length && <button className="button primary" onClick={() => setModal('add')}><Plus size={16} /> Add first object</button>}</div>}
            {kinds.map(kind => {
              const group = visible.filter(item => item.kind === kind);
              const Icon = icons[kind];
              return group.length ? <section className="inventory-group" key={kind}><h3>{kindLabels[kind]} <small>{group.length}</small></h3>{group.map(item => {
                const lines = result.lines.filter(line => line.objectId === item.id);
                const status = missingInputs(item, env).length ? 'Draft' : hasUnknownPrice(lines) ? 'Unknown price'
                  : result.issues.some(issue => issue.id === item.id) || lines.some(line => line.amounts.current === null) ||
                    result.technicalFindings.some(finding => finding.id === item.id && finding.status !== 'compatible') ||
                    result.licensingFindings.some(finding => finding.id === item.id && finding.status !== 'Verified') ? 'Needs review' : 'Configured';
                const subtotal = summarize(lines, env.currency).current;
                return <button key={item.id} className="object-row" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                  <span className="tile blue"><Icon size={16} /></span><span className="object-name"><strong>{item.name}</strong><small>{env.relationships.filter(edge => edge.from === item.id || edge.to === item.id).length} links</small></span>
                  <span className={`status ${status === 'Unknown price' ? 'price-unknown' : status === 'Configured' ? '' : 'warning'}`}>{status}</span>
                  {lines.length > 0 && <small>{subtotal.incomplete === lines.length ? 'Unknown' : formatMoney(subtotal.known, env.currency)}</small>}<ChevronRight size={15} />
                </button>;
              })}</section> : null;
            })}
          </section>
          {selectedItem ? <Inspector key={selectedItem.id} item={selectedItem} env={env} catalogue={catalogue} result={result} update={update} select={selectObject} remove={() => setModal('delete')} />
            : <aside className="panel empty"><span className="empty-icon"><Layers3 size={24} /></span><h2>Object inspector</h2><p>Select an object to edit its configuration, usage and dependencies.</p></aside>}
        </div>}
        {page === 'Architecture' && <Suspense fallback={<p role="status">Preparing diagram…</p>}><Architecture env={env} result={result} select={selectObject} /></Suspense>}
        {page === 'Pricing Catalogue' && <Coverage catalogue={catalogue} result={result} select={selectObject} />}
        {page === 'Cost Analysis' && <><Comparison env={env} result={result} /><LicenceEstate result={result} currency={env.currency} />
          <CapacityComparisons rows={result.capacityComparisons} currency={env.currency} />
          <ValidationDashboard env={env} result={result} select={selectObject} />
          <CostAnalysis env={env} result={result} update={update} checkedAt={catalogue.manifest.lastCheckedAt} /></>}
        {page === 'Security & Governance' && <section className="panel padded"><h2>Advisory assessment</h2><p className="muted">Ruleset 1.0.0 · {advice.length} applicable checks · {advice.filter(item => item.status === 'Unknown').length} with unknown coverage. Based on declarations only.</p>
          {advice.length === 0 && <div className="empty"><span className="empty-icon"><ShieldCheck size={24} /></span><h3>Add an agent to assess controls</h3><button className="button" onClick={() => setModal('add')}>Add object</button></div>}
          {advice.map(item => <article className="finding" key={item.id + item.control}><div><button className="link-button" onClick={() => selectObject(item.id)}>{item.object}</button><h3>{item.title}</h3><p>{item.why}</p><a href={item.source} target="_blank" rel="noreferrer">Microsoft guidance</a></div><span className="status warning">{item.status} · {item.critical ? 'High priority' : 'Advisory'}</span></article>)}
        </section>}
        {page === 'Reports & Export' && <>
          <div className="overview-grid"><section className="panel padded"><span className="tile blue"><FileText size={19} /></span><h2>Environment PDF</h2><p className="muted">Includes the logical diagram, monthly and annual comparison, itemised ledger, controls and source coverage.</p><button disabled={exporting} className="button primary" onClick={exportPdf}><ArrowDownToLine size={17} />{exporting ? 'Generating PDF…' : 'Generate PDF'}</button></section>
            <section className="panel padded"><span className="tile teal"><Braces size={19} /></span><h2>Environment JSON</h2><p className="muted">Save or restore objects, relationships and price assumptions. Imported files recalculate against the current catalogue. Keep sensitive details out of labels and notes.</p>
              <div className="actions"><button className="button" onClick={exportJson}>Export JSON</button><button className="button" onClick={() => imported.current?.click()}>Import JSON</button><FieldHelp field="importFile" label="Import JSON" requirement="Optional" /></div></section></div>
          <section className="panel padded"><h2>Workspace actions</h2><div className="actions"><button className="button" onClick={() => setModal('settings')}>Edit environment</button><button className="button" onClick={() => {
            if (dirty && !window.confirm('Duplicate the current environment and switch to the copy? Export first if you want to retain the original.')) return;
            update(cloneEnvironment(env)); setSelected(undefined); setToast('Environment duplicated with new object IDs.');
          }}>Duplicate environment</button><button className="button danger" onClick={() => setModal('reset')}>Reset environment</button></div></section>
        </>}
        <section className="panel source-bar">
          <div><span className="tile blue"><Cloud size={17} /></span><div><strong>Microsoft pricing catalogue</strong><small>{catalogue.manifest.catalogueId ? `${catalogue.records.length} published rates · ${catalogue.manifest.lastCheckedAt ?? 'Check time unavailable'}` : 'No verified retail data published'}{catalogue.manifest.lastCheckedAt && Date.now() - Date.parse(catalogue.manifest.lastCheckedAt) > 7 * 86400000 ? ' · Stale' : ''}</small></div></div>
          <div className="actions"><a className="link-button" href={retailDocs} target="_blank" rel="noreferrer">Source documentation</a><button className="button" onClick={refreshCatalogue}>Check for updates</button></div>
          {catalogueNote && <p role="status">{catalogueNote}</p>}
          {candidate && <button className="button primary" onClick={() => { setCatalogue(candidate); setCandidate(undefined); setCatalogueNote('Catalogue applied. Your price overrides were retained.'); }}>Apply catalogue</button>}
          {env.sourceSnapshot && <p className="muted">Imported snapshot {env.sourceSnapshot.catalogueId?.slice(0, 12) ?? 'without catalogue'} · previous known subtotal {formatMoney(env.sourceSnapshot.current, env.currency)} · {env.sourceSnapshot.incomplete} incomplete. Current ledger recalculated.</p>}
        </section>
        <footer>{disclaimer}</footer>
      </main>
    </div>
    <input ref={imported} type="file" aria-label="Import Studio JSON file" hidden accept=".json,application/json" onChange={event => { void importFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    {toast && <div role="status" className="toast">{toast}</div>}
    {modal === 'add' && <Modal title="Add an object" close={() => setModal(null)}><p className="muted">Choose any object to add a draft to your environment.</p>
      <div className="add-grid">{kinds.map(kind => {
        const Icon = icons[kind];
        return <button key={kind} className="button" onClick={() => add(kind)}><Icon size={19} />{kindLabels[kind]}<ChevronRight size={15} /></button>;
      })}</div></Modal>}
    {modal === 'delete' && selectedItem && <Modal title={`Delete ${selectedItem.name}?`} close={() => setModal(null)}>
      <p>{dependencies.length ? 'Deleting this object detaches the following links. The related objects remain in the workspace.' : 'Remove this object from the environment.'}</p>
      <ul>{dependencies.map(edge => <li key={JSON.stringify(edge)}>{env.objects.find(item => item.id === (edge.from === selectedItem.id ? edge.to : edge.from))?.name ?? env.name} · {edge.type}</li>)}</ul>
      <div className="actions"><button className="button" onClick={() => setModal(null)}>Cancel</button><button className="button danger" onClick={() => { update(removeObject(env, selectedItem.id)); setSelected(undefined); setModal(null); }}>{dependencies.length ? 'Detach and delete' : 'Delete'}</button></div>
    </Modal>}
    {modal === 'reset' && <Modal title="Reset environment?" close={() => setModal(null)}><p>This clears the workspace. Export JSON first to keep a copy.</p>
      <div className="actions"><button className="button" onClick={() => setModal(null)}>Cancel</button><button className="button danger" onClick={() => { setEnv(blankEnvironment()); setDirty(false); setSelected(undefined); setError(''); setModal(null); navigate('Overview'); }}>Reset environment</button></div></Modal>}
    {modal === 'settings' && <Modal title="Environment settings" close={() => setModal(null)}><form className="settings" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      update({ ...env, name: String(form.get('name')), description: String(form.get('description')), region: String(form.get('region')), currency: String(form.get('currency')).toUpperCase() });
      setModal(null);
    }}><Field field="environmentName"><input name="name" required maxLength={300} defaultValue={env.name} /></Field>
      <Field field="description"><textarea name="description" maxLength={300} defaultValue={env.description} /></Field>
      <Field field="defaultRegion"><input name="region" pattern="[a-z0-9\-]+" required defaultValue={env.region} /></Field>
      <Field field="currency"><input name="currency" pattern="[A-Za-z]{3}" required defaultValue={env.currency} /></Field>
      <button className="button primary">Save settings</button></form></Modal>}
  </div>;
}
