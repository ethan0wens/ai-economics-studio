import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { catalogueCoverage } from '../src/coverage';
import { maintenanceHealthSchema, type MaintenanceHealth, type ReviewGroup } from '../src/catalogue-health';
import { inventorySchema } from '../src/offerings';
import { compatibilityEvidence } from '../src/compatibility';
import { entitlementRules } from '../src/entitlements';
import { capacityEvidence } from '../src/provisioned';
import { validate, retailPage } from './pricing';
import { curatedPrices } from './commercial-pricing';
import { inventoryPlan, retailOrigin, retailPath } from './discovery';
import { claimMatches, claimsOnPage, defenderSuiteBase } from './microsoft-claims';
import { offerSources, reconcileOffer } from './maintenance-commercial';
import { reconcileTechnical, renew, type RecordChange, type RecordIssue } from './maintenance-technical';
import { capabilitySource, lifecycleSource, productTerms, regionSource, reservationSource, sizingSource, sourceReader } from './microsoft-source';

const dataDirectory = new URL('../catalogue/', import.meta.url);
const pricingDirectory = fileURLToPath(new URL('../public/pricing/', import.meta.url));
const reservationTariffs = new URL(retailPath, retailOrigin);
reservationTariffs.search = new URLSearchParams({ 'api-version': '2023-01-01-preview', currencyCode: "'GBP'",
  '$filter': "priceType eq 'Reservation' and productName eq 'Azure OpenAI'" }).toString();
async function readData(name: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(name, dataDirectory), 'utf8'));
}
async function writeData(name: string, data: unknown) {
  const dest = new URL(name, dataDirectory);
  const temp = new URL(`.${name}.${process.pid}.tmp`, dataDirectory);
  await writeFile(temp, JSON.stringify(data, null, 2) + '\n');
  await rename(temp, dest);
}

export async function maintenance(weekly: boolean, at: string, request = fetch) {
  const prior = maintenanceHealthSchema.parse(await readData('maintenance.json'));
  const active = new Set<ReviewGroup>(weekly ? ['commercial', 'licensing', 'compatibility', 'ptu', 'lifecycle', 'reservations'] : ['commercial']);
  const report: MaintenanceHealth = {
    ...prior, reviewedAt: weekly ? at : prior.reviewedAt,
    sources: prior.sources.filter(source => !active.has(source.group)),
    changes: prior.changes.filter(change => !active.has(change.group)),
    unresolved: prior.unresolved.filter(issue => !active.has(issue.group)),
    discovered: weekly ? [] : prior.discovered,
  };
  const checks = new Map<ReviewGroup, number>();
  const check = (group: ReviewGroup) => checks.set(group, (checks.get(group) ?? 0) + 1);
  const read = sourceReader(request);
  const seenSource = new Set<string>();
  const issues = new Map<string, MaintenanceHealth['unresolved'][number]>();
  const oldIssues = new Map(prior.unresolved.map(row => [`${row.group}:${row.id}:${row.kind}`, row]));
  const issue: RecordIssue = (group, id, kind, source, detail) => {
    const key = `${group}:${id}:${kind}`;
    const previous = oldIssues.get(key);
    issues.set(key, {
      group, id, kind, source, detail, firstSeen: previous?.firstSeen ?? at,
      occurrences: previous ? previous.occurrences + Number(Date.parse(at) - Date.parse(prior.reviews[group]?.attemptedAt ?? at) >= 4 * 3_600_000) : 1,
    });
  };
  const change: RecordChange = (group, id, kind, detail) => report.changes.push({ group, id, kind, detail });
  const source = async (group: ReviewGroup, url: string) => {
    const page = await read(url);
    const base = new URL(url);
    base.hash = '';
    const key = `${group}:${base.href}`;
    if (seenSource.has(key)) return page;
    seenSource.add(key);
    report.sources.push({ group, url: base.href, state: page.html ? 'retrieved' : 'unavailable', checkedAt: at,
      digest: page.html ? createHash('sha256').update(page.html).digest('hex') : undefined });
    if (!page.html) issue(group, base.href, 'source', base.href, `Source retrieval failed (${page.error}).`);
    return page;
  };

  const { inventory } = inventoryPlan();
  const records = new Map(curatedPrices.map(rate => [rate.offeringId, rate]));
  const offers = inventory.filter(offer => offer.kind === 'licence-entitlement' || offer.id === 'copilot-credit-pack-gb');
  for (let offset = 0; offset < offers.length; offset += 5) {
    await Promise.all(offers.slice(offset, offset + 5).map(async offer => {
      const old = records.get(offer.id);
      const urls = offerSources(offer, old);
      if (!urls.length) return;
      const pages = await Promise.all(urls.map(url => source('commercial', url)));
      const observations = pages.flatMap(page => {
        if (!page.html) return [];
        const candidate = reconcileOffer(offer, page, at, old);
        const exact = candidate.record ?? reconcileOffer(offer, page, at, old, [page.url]).record;
        return [{ candidate, page, exact }];
      });
      const active = observations.flatMap(value => value.exact ? [value.exact] : []);
      const signatures = new Set(active.map(value => [value.price, value.review?.term].join('|')));
      const primary = observations.find(row => row.exact);
      const url = urls[0];
      if (signatures.size > 1 || observations.some(item => item.candidate.issue?.includes('Contradictory public'))) {
        issue('commercial', offer.id, 'ambiguous', url, 'Exact UK source records disagree about the standard price or commitment.');
      } else if (primary) {
        const confirmation = [...new Set(active.map(value => value.source))].filter(value => value !== primary.page.url);
        const next = reconcileOffer(offer, primary.page, at, old, confirmation);
        if (next.record) {
          check('commercial');
          if (weekly) records.set(offer.id, next.record);
          if (next.change) change('commercial', offer.id, next.conditional || (confirmation.length > 0 && !primary.candidate.record) ? 'conditional' : 'automatic',
            weekly ? next.change : `${next.change} Queued for the weekly review.`);
          return;
        }
        issue('commercial', offer.id, 'ambiguous', url, next.issue ?? 'Exact UK offer unresolved.');
      } else if (observations.length) {
        const details = observations[0].candidate.issue;
        issue('commercial', offer.id, old ? (details?.includes('SKU changed') ? 'ambiguous' : 'unmapped') : 'unpriced', url, details ?? 'Exact UK offer unresolved.');
      }
      if (old?.review && Date.parse(old.review.expiresAt) < Date.parse(at)) {
        issue('commercial', offer.id, 'expired', url, 'The last observed rate has expired and remains historical.');
      }
    }));
  }
  let expiry: Array<{ group: ReviewGroup; id: string; reviewBy: string; source: string }> = [];
  const registerExpiry = (rows: Array<{ id: string; reviewBy: string; source: string }>, group: ReviewGroup) => {
    for (const row of rows) if (row.reviewBy >= at.slice(0, 10) && Date.parse(row.reviewBy) - Date.parse(at) <= 14 * 86_400_000) {
      expiry.push({ id: row.id, reviewBy: row.reviewBy, source: row.source, group });
    }
  };
  if (weekly) {
    // Await the small technical set in parallel, then reconcile cross-source relationships.
    const [regional, capabilities, sizing, lifecycle, reservation, terms] = await Promise.all([
      source('compatibility', regionSource), source('compatibility', capabilitySource), source('ptu', sizingSource),
      source('lifecycle', lifecycleSource), source('reservations', reservationSource), source('licensing', productTerms),
    ]);
    const technical = reconcileTechnical({
      regionHtml: regional.html, capabilitiesHtml: capabilities.html, sizingHtml: sizing.html, lifecycleHtml: lifecycle.html,
      matrix: compatibilityEvidence, sizing: capacityEvidence, discovered: inventorySchema.parse(await readData('discovered.json')),
      inventory, at, issue, change, check,
    });
    const rules = structuredClone(entitlementRules);
    const fragments = new Map<string, Set<string>>();
    for (const [rows, group] of [[rules, 'licensing'], [technical.matrix.integrations, 'compatibility']] as const) {
      for (const row of rows) {
        const page = await source(group, row.source);
        const lines = fragments.get(row.source) ?? (page.html ? claimsOnPage(page.html) : new Set<string>());
        fragments.set(row.source, lines);
        const qualifier = row.id === 'defender-suite-base' && 'kind' in row && row.kind === 'requirement' ? defenderSuiteBase(lines) : undefined;
        const match = row.id === 'defender-suite-base' ? Boolean(qualifier) : claimMatches(row.id, lines);
        if (match && (!('kind' in row) || row.kind !== 'unverified')) {
          if (qualifier && 'kind' in row && JSON.stringify([row.eligible ?? [], row.qualifyingBundles ?? []]) !==
              JSON.stringify([qualifier.eligible, qualifier.qualifyingBundles])) {
            change(group, row.id, 'conditional', 'Microsoft changed the exact, structured Defender Suite prerequisites.');
            Object.assign(row, qualifier, { ...renew(row, at), observedSince: at.slice(0, 10) });
          } else Object.assign(row, renew(row, at));
          check(group);
        } else issue(group, row.id, 'unmapped', row.source, 'The exact rule was not re-established by the approved scoped source check.');
        if (row.reviewBy < at.slice(0, 10) && (!('kind' in row) || row.kind !== 'unverified')) {
          issue(group, row.id, 'expired', row.source, 'Rule evidence expired. It is displayed as unverified.');
        }
      }
    }
    if (terms.html) {
      const key = productTerms;
      const old = prior.sources.find(record => record.url === key && record.group === 'licensing');
      const next = report.sources.find(record => record.url === key && record.group === 'licensing');
      const lines = [...claimsOnPage(terms.html)].filter(line => /microsoft 365|office 365|agent 365|copilot|defender|purview|entra/.test(line)
        && /eligib|licen[cs]e|subscription|prerequisite|included/.test(line));
      if (next && lines.length) next.digest = createHash('sha256').update(lines.sort().join('\n')).digest('hex');
      if (!lines.length) issue('licensing', 'product-terms-scope', 'unmapped', key, 'The current Product Terms response did not establish extractable scoped eligibility clauses.');
      if (lines.length && old?.digest && old.digest !== next?.digest) {
        issue('licensing', 'product-terms-digest', 'unmapped', key, 'Product Terms document changed. Only separately matched claims were renewed.');
      }
    }
    const reservationText = reservation.html ? claimsOnPage(reservation.html) : new Set<string>();
    if ([...reservationText].some(line => /\b(?:one-month|one-year|one month|one year)\b/.test(line) && /reservation/.test(line))) check('reservations');
    try {
      const response = await retailPage(reservationTariffs, request);
      report.sources.push({ group: 'reservations', url: reservationTariffs.href, checkedAt: at, state: 'retrieved' });
      if (response.Items.length || response.NextPageLink) {
        issue('reservations', 'retail-reservation', 'unmapped', reservationTariffs.href, 'Azure returned reservation candidates. Matching scope, term and modelled units still require verification.');
      } else {
        issue('reservations', 'retail-reservation', 'unpriced', reservationTariffs.href, 'The bounded Azure query returned no exact GBP reservation prices. Enter a customer quote for an eligible allocation.');
        check('reservations');
      }
    } catch {
      issue('reservations', 'retail-reservation', 'source', reservationTariffs.href, 'Azure reservation tariff survey did not complete.');
    }
    for (const [rows, group] of [[technical.matrix.regions, 'compatibility'], [technical.matrix.capabilities, 'compatibility'],
      [technical.matrix.lifecycle, 'lifecycle'], [technical.sizing, 'ptu']] as const) {
      for (const row of rows) if (row.reviewBy < at.slice(0, 10)) {
        issue(group, row.id, 'expired', row.source, 'Published evidence expired without an exact source match.');
      }
    }
    await writeData('compatibility.json', technical.matrix);
    await writeData('provisioned.json', technical.sizing);
    await writeData('entitlements.json', rules);
    await writeData('discovered.json', technical.discovered);
    await writeData('commercial.json', [...records.values()]);
    registerExpiry(rules, 'licensing');
    registerExpiry([...technical.matrix.regions, ...technical.matrix.capabilities, ...technical.matrix.integrations], 'compatibility');
    registerExpiry(technical.matrix.lifecycle, 'lifecycle');
    registerExpiry(technical.sizing, 'ptu');
    report.lifecycle = technical.lifecycleList;
    report.discovered = technical.newModels;
  }
  else expiry = prior.expiring.filter(row => row.group !== 'commercial' && row.reviewBy >= at.slice(0, 10));
  registerExpiry([...records.values()].flatMap(rate => rate.review ? [{ id: rate.offeringId!, source: rate.source,
    reviewBy: rate.review.expiresAt.slice(0, 10) }] : []), 'commercial');
  report.expiring = expiry.sort((a, b) => a.reviewBy.localeCompare(b.reviewBy) || a.id.localeCompare(b.id));
  report.unresolved.push(...issues.values());
  const stable = <T extends { group: string }>(items: T[], label: (item: T) => string) =>
    items.sort((a, b) => (a.group + '|' + label(a)).localeCompare(b.group + '|' + label(b)));
  stable(report.sources, row => row.url);
  stable(report.changes, row => row.id);
  stable(report.unresolved, row => row.id + '|' + row.kind);
  for (const group of active) {
    const count = checks.get(group) ?? 0;
    const incomplete = report.unresolved.some(row => row.group === group && ['source', 'expired', 'ambiguous', 'unmapped'].includes(row.kind));
    report.reviews[group] = {
      attemptedAt: at, successfulAt: count && (weekly || group !== 'commercial') ? at : prior.reviews[group]?.successfulAt ?? null, checked: count,
      state: count ? (incomplete ? 'partial' : 'checked') : 'unavailable',
    };
  }
  const output = maintenanceHealthSchema.parse(report);
  await writeData('maintenance.json', output);
  return output;
}

const weekly = !process.argv.includes('--daily');
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = await maintenance(weekly, new Date().toISOString());
  const groups = catalogueCoverage(await validate(pricingDirectory));
  const review = Object.entries(report.reviews).map(([group, result]) => `| ${group} | ${result.state} | ${result.checked} | ${result.successfulAt ?? '—'} |`);
  const summary = [
    '### Microsoft evidence maintenance', '', '| Group | Latest check | Exact observations checked | Latest reconciliation with a successful check |',
    '| --- | --- | ---: | --- |', ...review, '',
    `${report.changes.length} assessed changes, ${report.unresolved.length} unresolved observations, ${report.discovered.length} newly added regional configurations.`,
    `Input snapshot included ${groups.reduce((sum, group) => sum + group.discovered, 0)} configurations. Pricing validation and deployment follow in the publishing run.`, '',
  ].join('\n');
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
  if (process.env.GITHUB_ACTIONS === 'true') {
    const example = report.unresolved.slice(0, 12).map(row => `${row.group}: ${row.id} (${row.kind})`).join(' | ');
    console.log(`::notice title=Evidence maintenance::${report.changes.length} assessed · ${report.discovered.length} new configurations · ${report.unresolved.length} unresolved. ${example}`);
  }
}
