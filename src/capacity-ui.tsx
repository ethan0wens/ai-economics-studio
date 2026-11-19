import { formatMoney, type CapacityComparison } from './ledger';

export function CapacityComparisons({ rows, currency }: { rows: CapacityComparison[]; currency: string }) {
  if (!rows.length) return null;
  return <section className="panel padded">
    <h2>Provisioned and PAYG costs</h2>
    <p className="muted">Monthly comparison for the declared workload. Throughput, latency and quota require separate validation.</p>
    {rows.map(row => <details className="coverage-family" key={row.id}>
      <summary><strong>{row.name}</strong><span>{formatMoney(row.current, currency)} provisioned · {formatMoney(row.payg, currency)} PAYG retail</span></summary>
      <p>{row.offering} · Provisioned minus PAYG {formatMoney(row.difference, currency)}</p>
      {row.detail && <p className="muted">{row.detail}</p>}
      {row.reason && <p>{row.reason}</p>}
      {row.sources.length > 0 && <ul>{row.sources.map(record => <li key={record.meterId}>
        <a href={record.source} target="_blank" rel="noreferrer">{record.component} · {record.currency} {record.price} per {record.unit}</a>
      </li>)}</ul>}
    </details>)}
  </section>;
}
