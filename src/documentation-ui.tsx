import { regionName } from './presentation';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, Search } from 'lucide-react';
import { articles, documentationVersion, topics, type Article } from './documentation-content';
import { documentationReference } from './documentation-reference';
import { compatibilityLabels } from './compatibility';
import { CatalogueHealth } from './catalogue-health-ui';
import type { Catalogue } from './catalogue';
import { startingArticles } from './help-links';
import { routeHref, technicalHref } from './navigation';
import { DocumentationNavigation, RelatedTechnical, TechnicalDocumentation, technicalSearch } from './technical-ui';

function searchArticles(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return articles.map(article => {
    const first = [article.title, article.id, ...(article.aliases ?? [])].join(' ').toLowerCase();
    const trail = article.sections.find(section => terms.every(term =>
      [section.title, ...section.paragraphs, ...(section.steps ?? [])].join(' ').toLowerCase().includes(term)));
    const corpus = [first, article.topic, article.intro, ...article.sections.flatMap(section => [section.title, ...section.paragraphs, ...(section.steps ?? [])])]
      .join(' ').toLowerCase();
    const matches = terms.every(term => corpus.includes(term));
    const score = terms.reduce((sum, term) => sum + (first.includes(term) ? 4 : corpus.includes(term) ? 1 : 0), 0);
    return { article, score, matches, trail };
  }).filter(item => item.matches).sort((a, b) => b.score - a.score);
}

export function Reference({ kind, catalogue }: { kind: Article['reference']; catalogue: Catalogue }) {
  const data = useMemo(() => documentationReference(catalogue), [catalogue]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const stamp = <p className="muted">{data.id ? `Applied catalogue ${data.id.slice(0, 12)} · Azure checked ${data.checkedAt?.slice(0, 10) ?? 'date unavailable'}`
    : 'The published pricing snapshot is currently unavailable.'}</p>;
  if (kind === 'units') return <section className="doc-reference"><h2>Units in the applied inventory</h2>{stamp}<ul>{data.units.map(unit => <li key={unit}>{unit}</li>)}</ul></section>;
  if (kind === 'models') {
    const needle = query.trim().toLowerCase();
    const matches = data.models.filter(model => [model.label, model.model, model.version, model.mode, model.region, regionName(model.region)].join(' ').toLowerCase().includes(needle));
    const cells = needle ? data.regional.filter(cell => [cell.model, cell.version, cell.sku, cell.region, regionName(cell.region)].join(' ').toLowerCase().includes(needle)) : [];
    return <section className="doc-reference">
      <h2>Where you can use a model</h2>{stamp}
      <p className="muted">{data.evidenceCounts.map(row => `${row.name} ${row.total}`).join(' · ')} · {data.activeSizing} current sizing rules.</p>
      <label className="plain-label">Find a model, version or region<input type="search" value={query} onChange={event => {
        setQuery(event.target.value); setPage(0);
      }} placeholder="e.g. GPT-4.1 or UK South" /></label>
      <p role="status" className="muted">{matches.length} billing configurations{needle && ` and ${cells.length} reviewed regional entries`}. Search by region name or Azure code.</p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Model billing table">
        <table><caption>Model billing configurations</caption><thead><tr><th scope="col">Configuration</th><th scope="col">Version</th><th scope="col">Mode and billing region</th><th scope="col">Pricing</th></tr></thead>
          <tbody>{matches.slice(page * 20, page * 20 + 20).map(item => <tr key={item.id}><th scope="row">{item.label}</th>
            <td>{item.version}</td><td>{item.mode} · {regionName(item.region)}</td><td>{item.price}</td></tr>)}</tbody>
        </table>
      </div>
      {matches.length > 20 && <div className="actions"><button className="button" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page + 1} of {Math.ceil(matches.length / 20)}</span><button className="button" disabled={(page + 1) * 20 >= matches.length}
          onClick={() => setPage(page + 1)}>Next</button></div>}
      {cells.length > 0 && <div className="table-wrap" role="region" tabIndex={0} aria-label="Regional evidence table"><table><caption>Exact regional evidence · showing up to 20 matches</caption>
        <thead><tr><th scope="col">Model and version</th><th scope="col">Mode and actual region</th><th scope="col">Status</th></tr></thead>
        <tbody>{cells.slice(0, 20).map(row => <tr key={`${row.model}|${row.version}|${row.sku}|${row.region}`}>
          <th scope="row">{row.model} · {row.version}</th><td>{row.sku} · {regionName(row.region)}</td>
          <td><a href={row.source} target="_blank" rel="noreferrer" aria-description="External Microsoft evidence">{compatibilityLabels[row.status]}</a><br /><small>Reviewed {row.reviewed}</small></td></tr>)}</tbody></table></div>}
    </section>;
  }
  return <section className="doc-reference"><h2>Public pricing coverage</h2>{stamp}<p>{data.records} published price records.</p>
    <div className="table-wrap" role="region" aria-label="Pricing coverage table" tabIndex={0}>
      <table><caption>Coverage from the applied inventory</caption><thead><tr><th scope="col">Family</th><th scope="col">Scoped</th><th scope="col">Fully priced</th>
        <th scope="col">Partial</th><th scope="col">Unpriced</th><th scope="col">Unsupported</th></tr></thead>
        <tbody>{data.coverage.map(row => <tr key={row.family}><th scope="row">{row.family}</th>
          <td>{row.scoped}</td><td>{row.complete}</td><td>{row.partial}</td><td>{row.unknown}</td><td>{row.unsupported}</td></tr>)}</tbody>
      </table>
    </div>
    {kind === 'coverage' && <CatalogueHealth manifest={catalogue.manifest} />}
  </section>;
}

export function Documentation(props: {
  item?: string; technicalArticle?: string; section?: string; catalogue: Catalogue; hasWorkspace: boolean; back: () => void;
}) {
  if (props.item === 'technical') return <TechnicalDocumentation key={props.technicalArticle ?? 'technical-index'} item={props.technicalArticle} section={props.section}
    hasWorkspace={props.hasWorkspace} back={props.back} catalogueReference={kind => <Reference key={kind} kind={kind} catalogue={props.catalogue} />} />;
  return <UserDocumentation {...props} />;
}

function UserDocumentation({ item, section, catalogue, hasWorkspace, back }: {
  item?: string; section?: string; catalogue: Catalogue; hasWorkspace: boolean; back: () => void;
}) {
  const article = articles.find(article => article.id === item);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const results = searchArticles(query).filter(row => !category || row.article.topic === category);
  const technicalResults = query.trim() && !category ? technicalSearch(query) : [];
  const resultCount = results.length + technicalResults.length;
  const [copyNote, setCopyNote] = useState('');
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const heading = section && document.getElementById(`doc-${section}`);
      const title = document.getElementById('doc-title');
      if (heading) heading.focus();
      else { title?.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    });
    return () => cancelAnimationFrame(frame);
  }, [item, section]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopyNote('Article link copied.'); }
    catch { setCopyNote('Copy the article link from the address bar.'); }
  }

  if (article) return <article className="doc-article">
    <nav className="doc-crumb" aria-label="Documentation breadcrumb">
      <a href={routeHref('documentation')}><ChevronLeft size={15} aria-hidden="true" /> Documentation</a><span>{article.topic}</span>
      {hasWorkspace && <button className="link-button" onClick={back}>Back to workspace</button>}
    </nav>
    <header><h1 id="doc-title" tabIndex={-1}>{article.title}</h1><p>{article.intro}</p><small>{documentationVersion}</small></header>
    <details className="guided-disclosure" open><summary>In this article</summary>
      <ul>{article.sections.map(heading => <li key={heading.id}><a href={routeHref('documentation', article.id, heading.id)}>{heading.title}</a></li>)}</ul>
    </details>
    {article.sections.map(heading => <section className="doc-section" key={heading.id} aria-labelledby={`doc-${heading.id}`}>
      <h2 id={`doc-${heading.id}`} tabIndex={-1}>{heading.title}</h2>
      {heading.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {heading.steps && <ol>{heading.steps.map(step => <li key={step}>{step}</li>)}</ol>}
    </section>)}
    {article.reference && <Reference key={article.id} kind={article.reference} catalogue={catalogue} />}
    {article.tool && <a className="button primary" href={routeHref(article.tool.page, article.tool.item)}>{article.tool.label}</a>}
    {article.sources && <section className="doc-section"><h2>External Microsoft sources</h2><ul>{article.sources.map(([label, href]) =>
      <li key={href}><a href={href} target="_blank" rel="noreferrer" aria-description="External Microsoft evidence">{label}</a></li>)}</ul></section>}
    <section className="doc-section"><h2>Related articles</h2><ul>{article.related.map(id => <li key={id}>
      <a href={routeHref('documentation', id)}>{articles.find(item => item.id === id)?.title}</a></li>)}</ul></section>
    <RelatedTechnical guide={article.id} />
    <button className="link-button" onClick={() => void copyLink()}>Copy article link</button><span role="status">{copyNote}</span>
  </article>;
  if (item) return <div className="doc-index"><h1 id="doc-title" tabIndex={-1}>Article unavailable</h1>
    <p>Search Documentation or browse by topic to find the guidance you need.</p><div className="actions">
      <a className="button primary" href={routeHref('documentation')}>Search documentation</a>
      <a className="button" href={routeHref('documentation', undefined, 'topics')}>Browse topics</a></div></div>;

  return <div className="doc-index">
    <header><h1 id="doc-title" tabIndex={-1}>Documentation</h1><p>Learn how to build an environment, understand its costs and share your estimate.</p></header>
    <DocumentationNavigation area="guides" />
    <div className="doc-search panel padded">
      <label className="plain-label">Search documentation<span className="search"><Search size={16} aria-hidden="true" />
        <input onChange={event => setQuery(event.target.value)} type="search" value={query} placeholder="Try Copilot Credits, PTU or already owned" /></span></label>
      <label className="plain-label">Filter by topic<select value={category} onChange={event => setCategory(event.target.value)}>
        <option value="">All topics</option>{topics.map(topic => <option key={topic}>{topic}</option>)}
      </select></label>
    </div>
    {query.trim() || category ? <>
      <p className="muted" role="status">{resultCount} {resultCount === 1 ? 'result' : 'results'}</p>
      {results.length ? <ul className="doc-results">{results.map(({ article, trail }) => <li key={article.id}>
        <a href={routeHref('documentation', article.id, query.trim() && trail ? trail.id : undefined)}>{article.title}</a>
        <p className="muted">User Guide · {article.topic} · {trail?.title ?? article.intro}</p>
      </li>)}</ul> : null}
      {!!technicalResults.length && <ul className="doc-results">{technicalResults.map(({ article, heading }) => <li key={article.id}>
        <a href={technicalHref(article.id, heading?.id)}>{article.title}</a>
        <p className="muted">Technical Documentation · {article.sectionTitle} · {heading?.title ?? article.summary}</p>
      </li>)}</ul>}
      {resultCount === 0 && <p>Try a different term, or browse all topics.</p>}
      <button className="button" onClick={() => { setQuery(''); setCategory(''); }}>Clear search and filters</button>
    </> : <>
      <section className="doc-start"><h2>Start here</h2><ul>{startingArticles.map(id =>
        <li key={id}><a href={routeHref('documentation', id)}><BookOpen size={17} aria-hidden="true" />{articles.find(article => article.id === id)?.title}</a></li>)}</ul></section>
      <section aria-labelledby="doc-topics"><h2 id="doc-topics" tabIndex={-1}>Browse topics</h2><div className="doc-topics">
        {topics.map(topic => <details key={topic} className="panel padded"><summary>{topic}</summary>
          <ul>{articles.filter(article => article.topic === topic).map(article =>
            <li key={article.id}><a href={routeHref('documentation', article.id)}>{article.title}</a></li>)}</ul></details>)}</div></section>
    </>}
    <div className="doc-meta"><span>{documentationVersion}</span><a href="https://github.com/ethan0wens/ai-economics-studio" target="_blank" rel="noreferrer">Source repository on GitHub</a></div>
  </div>;
}
