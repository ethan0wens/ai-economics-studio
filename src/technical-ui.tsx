import { useEffect, useState, type ReactNode } from 'react';
import { BookOpen, ChevronLeft, Search } from 'lucide-react';
import { articles as userGuides } from './documentation-content';
import { technicalArticles } from './technical-library';
import { technicalEntries, technicalSections } from './technical-content';
import { routeHref, technicalHref } from './navigation';
import { ReadingRegion, TechnicalMarkdown } from './technical-markdown';
import { environmentReference, verificationCommands } from './technical-reference';

export function technicalSearch(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return technicalArticles.flatMap(article => {
    const prominent = [article.title, article.summary, article.sectionTitle, ...article.aliases].join(' ').toLowerCase();
    const content = prominent + ' ' + article.markdown.toLowerCase();
    if (!words.every(word => content.includes(word))) return [];
    const heading = article.headings.find(heading => words.every(word => heading.title.toLowerCase().includes(word)));
    const score = words.reduce((sum, word) => sum + (prominent.includes(word) ? 4 : 1), 0);
    return [{ article, heading, score }];
  }).sort((a, b) => b.score - a.score);
}

export function DocumentationNavigation({ area }: { area?: 'guides' | 'technical' }) {
  return <nav className="documentation-areas" aria-label="Documentation areas">
    <a className="button" aria-current={area === 'guides' ? 'page' : undefined} href={routeHref('documentation')}>User Guides</a>
    <a className="button" aria-current={area === 'technical' ? 'page' : undefined} href={technicalHref()}>Technical Documentation</a>
  </nav>;
}

export function RelatedTechnical({ guide }: { guide: string }) {
  const related = technicalEntries.filter(article => article.guides.includes(guide));
  return related.length > 0 && <section className="doc-section"><h2>Technical Documentation</h2><ul>
    {related.map(article => <li key={article.id}><a href={technicalHref(article.id)}>{article.title}</a></li>)}
  </ul></section>;
}

function GeneratedReference({ kind }: { kind: 'schema' | 'relationships' | 'commands' }) {
  const model = environmentReference();
  if (kind === 'schema') return <section className="doc-reference">
    <h2 id="doc-generated-reference" tabIndex={-1}>Generated schema reference</h2>
    <p>Environment schema <code>{model.version}</code> · {model.maxObjects} objects · {model.maxBytes.toLocaleString('en-GB')} UTF-8 bytes per import.</p>
    <ReadingRegion label="Generated object fields"><table><caption>Object kinds and fields from the executable schema</caption>
      <thead><tr><th scope="col">Object kind</th><th scope="col">Fields</th></tr></thead>
      <tbody>{model.objects.map(item => <tr key={item.kind}><th scope="row"><code>{item.kind}</code></th>
        <td>{item.fields.map(field => <code key={field}>{field} </code>)}</td></tr>)}</tbody>
    </table></ReadingRegion>
  </section>;
  if (kind === 'relationships') return <section className="doc-reference">
    <h2 id="doc-generated-reference" tabIndex={-1}>Generated relationship reference</h2>
    <ReadingRegion label="Generated relationship directions"><table><caption>Allowed relationship endpoints</caption>
      <thead><tr><th scope="col">Relationship</th><th scope="col">Source</th><th scope="col">Target</th></tr></thead>
      <tbody>{model.relationships.map(row => <tr key={row.type}><th scope="row"><code>{row.type}</code></th>
        <td>{row.from}</td><td>{row.to}</td></tr>)}</tbody>
    </table></ReadingRegion>
  </section>;
  return <section className="doc-reference">
    <h2 id="doc-generated-reference" tabIndex={-1}>Generated command reference</h2>
    <ReadingRegion label="Generated validation commands"><table><caption>Local commands from package.json</caption>
      <thead><tr><th scope="col">Run</th><th scope="col">Package script</th></tr></thead>
      <tbody>{verificationCommands().map(command => <tr key={command.name}><th scope="row"><code>{command.invoke}</code></th><td><code>{command.script}</code></td></tr>)}</tbody>
    </table></ReadingRegion>
  </section>;
}

export function TechnicalDocumentation({ item, section, hasWorkspace, back, catalogueReference }: {
  item?: string; section?: string; hasWorkspace: boolean; back: () => void;
  catalogueReference: (kind: 'models' | 'coverage') => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const article = technicalArticles.find(article => article.id === item);
  const results = technicalSearch(query);
  useEffect(() => {
    const request = requestAnimationFrame(() => {
      const target = section ? document.getElementById(`doc-${section}`) : null;
      if (target) target.focus();
      else {
        document.getElementById('doc-title')?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
      }
    });
    return () => cancelAnimationFrame(request);
  }, [item, section]);

  const breadcrumb = <nav className="doc-crumb" aria-label="Technical documentation breadcrumb">
    {article || item ? <a href={technicalHref()}><ChevronLeft size={15} aria-hidden="true" /> Technical Documentation</a> :
      <a href={routeHref('documentation')}><ChevronLeft size={15} aria-hidden="true" /> Documentation</a>}
    {article && <a href={technicalHref(undefined, article.section)}>{article.sectionTitle}</a>}
    {hasWorkspace && <button className="link-button" onClick={back}>Back to workspace</button>}
  </nav>;
  if (article) {
    const reference = article.reference;
    return <article className="doc-article technical-article">
      {breadcrumb}
      <header><h1 id="doc-title" tabIndex={-1}>{article.title}</h1><p>{article.summary}</p></header>
      <details className="guided-disclosure technical-contents" open>
        <summary>In this article</summary>
        <ul>{article.headings.map(heading => <li key={heading.id} className={heading.depth === 3 ? 'technical-subheading' : undefined}>
          <a href={technicalHref(article.id, heading.id)}>{heading.title}</a></li>)}
          {reference && <li><a href={technicalHref(article.id, 'generated-reference')}>Generated reference</a></li>}
        </ul>
      </details>
      <div className="technical-prose"><TechnicalMarkdown tokens={article.body} file={article.file} title={article.title} /></div>
      {(reference === 'models' || reference === 'coverage') ?
        <div id="doc-generated-reference" tabIndex={-1} role="region" aria-label="Generated catalogue reference">{catalogueReference(reference)}</div> :
        reference && <GeneratedReference kind={reference} />}
      <nav aria-label="Related documentation" className="technical-related">
        <section className="doc-section"><h2>Related technical articles</h2><ul>{article.related.map(id =>
          <li key={id}><a href={technicalHref(id)}>{technicalEntries.find(entry => entry.id === id)?.title}</a></li>)}</ul></section>
        <section className="doc-section"><h2>User Guides</h2><ul>{article.guides.map(id =>
          <li key={id}><a href={routeHref('documentation', id)}>{userGuides.find(guide => guide.id === id)?.title}</a></li>)}</ul></section>
      </nav>
    </article>;
  }

  return <div className="doc-index technical-index">
    {breadcrumb}
    <header><h1 id="doc-title" tabIndex={-1}>{item ? 'Technical article unavailable' : 'Technical Documentation'}</h1>
      <p>{item ? 'Search the reference or choose a section below.' : 'Architecture, financial methods, evidence and operations for maintainers and reviewers.'}</p></header>
    <DocumentationNavigation area="technical" />
    <div className="panel padded doc-search"><label className="plain-label">Search technical documentation
      <span className="search"><Search size={16} aria-hidden="true" /><input type="search" value={query} placeholder="Try ledger, schema or Cloudflare deployment"
        onChange={event => setQuery(event.target.value)} /></span></label></div>
    {query.trim() ? <>
      <p className="muted" role="status">{results.length} {results.length === 1 ? 'result' : 'results'}</p>
      {results.length ? <ul className="doc-results">{results.map(({ article, heading }) => <li key={article.id}>
        <a href={technicalHref(article.id, heading?.id)}>{article.title}</a>
        <p className="muted">Technical Documentation · {article.sectionTitle} · {heading?.title ?? article.summary}</p>
      </li>)}</ul> : <p>Try a different term or clear the search to browse all sections.</p>}
      <button className="button" onClick={() => setQuery('')}>Clear technical search</button>
    </> : <>
      <nav aria-label="Technical sections" className="technical-section-links"><ol>
        {technicalSections.map(group => <li key={group.id}><a href={technicalHref(undefined, group.id)}>{group.title}</a></li>)}
      </ol></nav>
      <div className="technical-groups">{technicalSections.map((group, index) => <section className="panel padded technical-section" key={group.id} aria-labelledby={`doc-${group.id}`}>
        <h2 id={`doc-${group.id}`} tabIndex={-1}>{index + 1}. {group.title}</h2><p>{group.summary}</p>
        <ul>{group.articles.map(article => <li key={article.id}>
          <a href={technicalHref(article.id)}><BookOpen size={17} aria-hidden="true" />{article.title}</a>
          <p className="muted">{article.summary}</p>
        </li>)}</ul>
      </section>)}</div>
    </>}
  </div>;
}
