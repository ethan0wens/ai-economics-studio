import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { EstimateSummary } from './estimate-ui';
import { examples, openExample, type Example } from './examples';
import { routeHref } from './navigation';
import { ledger } from './ledger';
import type { Catalogue } from './catalogue';
import { useMemo } from 'react';

export function Examples({ item, catalogue, open }: { item?: string; catalogue: Catalogue; open: (example: Example) => void }) {
  const example = examples.find(example => example.id === item);
  const data = useMemo(() => {
    if (!example) return;
    const env = openExample(example);
    return { env, result: ledger(env, catalogue.records, undefined, catalogue.inventory) };
  }, [example, catalogue]);
  if (example && data) return <div className="example-preview">
    <a className="learn-more" href={routeHref('examples')}><ChevronLeft size={16} aria-hidden="true" /> All examples</a>
    <header><h1 tabIndex={-1}>{example.name}</h1><p>{example.purpose}</p></header>
    <p className="status warning">Fictional planning inputs</p>
    <div className="actions"><button className="button primary" onClick={() => open(example)}>Open editable copy <ArrowRight size={16} aria-hidden="true" /></button>
      <a href={routeHref('documentation', example.article)}>Read the walkthrough</a></div>
    <EstimateSummary {...data} catalogue={catalogue} />
    <div className="example-details panel padded"><h2>What’s included</h2><ul>{example.assumptions.map(item => <li key={item}>{item}</li>)}</ul>
      <h2>What to try</h2><ol>{example.explore.map(item => <li key={item}>{item}</li>)}</ol></div>
  </div>;
  return <div>
    <header className="page-heading"><div><h1 tabIndex={-1}>Example environments</h1>
      <p>Preview a working estimate, then open a copy to explore or adapt it.</p></div></header>
    {item && <p className="notice" role="status">That example is unavailable. Choose one of the examples below.</p>}
    <div className="example-grid">{examples.map(example => <article className="panel padded example-card" key={example.id}>
      <p className="muted">{example.platform}</p><h2>{example.name}</h2><p>{example.purpose}</p>
      <span className="example-assumption"><Check size={15} aria-hidden="true" />Fictional assumptions</span>
      <a className="button" href={routeHref('examples', example.id)}>Preview <span className="sr-only">{example.name}</span><ArrowRight size={15} aria-hidden="true" /></a>
    </article>)}</div>
  </div>;
}
