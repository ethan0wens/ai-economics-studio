import { regionName } from './presentation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { maintenanceHealthSchema, releaseHealthSchema, reviewGroups } from './catalogue-health';
import type { Manifest } from './catalogue';

const payload = z.strictObject({ release: releaseHealthSchema, maintenance: maintenanceHealthSchema });
const names = {
  commercial: 'UK commercial offers', licensing: 'Licensing and entitlements', compatibility: 'Foundry compatibility',
  ptu: 'Provisioned capacity sizing', lifecycle: 'Model lifecycle', reservations: 'Reservation evidence',
};
const dates = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });
const short = (value: string | null) => value?.slice(0, 12) ?? 'Unavailable';
const date = (value?: string | null) => value ? dates.format(new Date(value)) : 'No confirmed review';
const runs = 'https://github.com/ethan0wens/ai-economics-studio/actions/workflows/refresh-pricing.yml';

export function CatalogueHealth({ manifest }: { manifest: Manifest }) {
  const [data, setData] = useState<z.infer<typeof payload>>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${import.meta.env.BASE_URL}pricing/health.json`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]), cache: 'no-cache',
    }).then(async response => response.ok ? payload.safeParse(await response.json()) : undefined)
      .then(parsed => { if (parsed?.success && !controller.signal.aborted) setData(parsed.data); })
      .catch(() => { /* Older or development deployments may not have a release report. */ })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [manifest.catalogueId, manifest.lastCheckedAt]);
  const matched = data && data.release.catalogueId === manifest.catalogueId && data.release.pricingCheckedAt === manifest.lastCheckedAt;
  const retiring = data?.maintenance.lifecycle.filter(row => Date.parse(row.date) - Date.now() < 90 * 86_400_000)
    .sort((a, b) => a.date.localeCompare(b.date)) ?? [];
  return <section className="panel padded" aria-labelledby="catalogue-health-title">
    <h2 id="catalogue-health-title">Catalogue health</h2>
    <p className="muted">Latest Azure refresh {date(manifest.lastCheckedAt)}. Catalogue {short(manifest.catalogueId)}. <a href={runs} target="_blank" rel="noreferrer">GitHub Actions run history</a>.</p>
    {matched ? <>
      <p>Published application {short(data.release.application)} · previous release {short(data.release.previous.application ?? data.release.previous.cloudflareVersion)}</p>
      <div className="coverage-filters">{reviewGroups.map(group => {
        const review = data.maintenance.reviews[group];
        return <div key={group}><strong>{names[group]}</strong><p className="muted">{review ? `${review.state === 'partial' ? 'Partial review' : review.state === 'unavailable' ? 'Review unavailable' : 'Evidence checked'} · ${review.checked} checks of specific configurations` : 'Awaiting scheduled review'}</p>
          <small>{date(review?.successfulAt)}</small></div>;
      })}</div>
      {data.maintenance.expiring.length > 0 && <details className="coverage-family">
        <summary>Evidence due for review in the next 14 days ({data.maintenance.expiring.length})</summary>
        <ul>{data.maintenance.expiring.slice(0, 10).map(row => <li key={`${row.group}|${row.id}`}>{names[row.group]} · {row.id} · {row.reviewBy}</li>)}</ul>
      </details>}
      {data.maintenance.unresolved.length > 0 && <details className="coverage-family">
        <summary>Unresolved evidence ({data.maintenance.unresolved.length})</summary>
        <ul>{data.maintenance.unresolved.slice(0, 12).map(row => <li key={`${row.group}|${row.id}|${row.kind}`}>
          {names[row.group]} · {row.id} · {row.detail} <a href={row.source} target="_blank" rel="noreferrer" aria-description="External Microsoft evidence">Official source</a>
        </li>)}</ul>
        <a href={`${import.meta.env.BASE_URL}pricing/health.json`}>Open the full JSON report</a>
      </details>}
      {data.maintenance.discovered.length > 0 && <details className="coverage-family">
        <summary>Newly discovered regional configurations ({data.maintenance.discovered.length})</summary>
        <ul>{data.maintenance.discovered.slice(0, 10).map(row => <li key={`${row.model}|${row.version}|${row.sku}|${row.region}`}>{row.model} {row.version} · {row.sku} · {regionName(row.region)}</li>)}</ul>
      </details>}
      {retiring.length > 0 && <details className="coverage-family">
        <summary>Retired or approaching retirement ({retiring.length})</summary>
        <ul>{retiring.slice(0, 10).map(row => <li key={`${row.model}|${row.version}|${row.date}`}>{row.model} {row.version} · {row.timing === 'no-earlier-than' ? 'No earlier than ' : ''}{row.date}{row.replacement ? ` · listed replacement ${row.replacement}` : ''}</li>)}</ul>
      </details>}
    </> : <p className="muted">{loading ? 'Checking the published catalogue…' : 'A publication report for this catalogue is currently unavailable.'}</p>}
  </section>;
}
