# 05 — Live pricing catalogue, verification and compatibility evidence

## Two separate content pipelines

**A. Azure retail meter catalogue (automated daily)**: a GitHub Action accesses the public [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices). It may request prices by `currencyCode=GBP` (when supported), service, `armRegionName`, SKU and `priceType`. Handle `NextPageLink` until completion, retries/backoff, throttling, source schema changes, dates and units. API is unauthenticated. Versioned canonical JSON is **generated and checked in CI**, then deployed as public static assets. Do not call this API from visitors' browsers.

**B. Microsoft 365/Copilot/Agent/licensing and billing rules (curated)**: tracked structured rules with `sourceUri`, `sourceReviewedAt`, `effectiveFrom`, `verificationState`, and supported billing context. Do not pretend Azure Retail Prices API covers all licences/entitlements or infer licensing from product marketing. Allow custom-entered contractual prices, priced only when explicitly entered and clearly flagged.

## Extremely important: model-to-meter mapping

Azure Retail API does not guarantee every desired model/SKU appears, or that `skuName` strings directly map to products displayed in a model picker. Maintain **explicit curated meter selectors/mappings** to model, region, deployment type and unit. Ambiguous or duplicate matches → `unverified/unknown`; never choose a 'similar' meter or cheapest price. Don't discover availability by price presence alone; maintain compatibility/availability evidence separately. If a specific new model has no verified rate, show user override option and source warning.

## Refresh mechanics and fail-safe publishing

1. Read validated existing catalogue, known meter allowlist, expected minimum record coverage, permitted currency/regions, max plausible rate change thresholds (warn/review rather than silently accept). Load verified official sources.
2. Fetch all pages required for **curated target SKUs**, never download the entire unconstrained retail database into the frontend. Normalize price type, unit, currency, region, source dates and identifiers.
3. Verify unique canonical identities, schema and provenance, no unexpected missing SKUs, no implausible zero/negative/nonfinite prices, no unsupported currency conversion, no massive record dropout. Unmatched records may be omitted with clear coverage report, not guessed.
4. Generate immutable versioned data (`catalogue-<contenthash>.json`) and small `manifest.json` with catalogue schema version, source effective/checked times, app compatibility range, verification summary, record counts and provenance. Keep last-good versions for fallbacks within sensible asset limits.
5. On validation failure, do **not** overwrite current deployed catalogue. CI failure should be observable; preserve latest good published version. On success, commit data if repository rules allow and **deploy in the same GitHub Action execution**. Prevent deploy races with a common concurrency group.
6. The client fetches the manifest with short/no-cache caching, versioned file with immutable caching. On refresh in-session, offer 'New catalogue available' and re-evaluate after user choice; never silently overwrite user-entered rates or wipe their configuration.
7. Surface **last successful ingestion/check**, source rate effective dates, version, number of supported meters and any stale/unknown status. A failed job does not magically change the deployed manifest; avoid implying the user can see a failed run from static hosting unless the failure status is published through a separate safe process. No need for dynamic incident API.

## Currency and regional restrictions

Default is GBP and UK South. Azure Retail API supports currency query, but do not assume every service, meter or licence has a usable GBP rate. Do not invent exchange rates; if modelling an unsupported currency, request user fixed price or show unknown. Do not conflate retail GBP display with actual invoice, tax or contractual FX.

## Microsoft platform billing evidence

- Foundry model deployments need independently verified rates for each supported model and deployment type. If published rates are absent, leave unknown; provisioned throughput needs separate fixed-capacity rule.
- Foundry Agent Service supporting services, tools, storage and orchestration can have independent billing. Only add proven meters; include usage assumptions and usage-free/unknown flags.
- Copilot Studio has platform/licence/credit constructs not identical to token-only inference. **BYOM** integration is contextual and feature-dependent; current official documentation distinguishes models used in prompts/tools from other model selection contexts. Do not claim arbitrary Foundry model deployments can replace any Copilot Studio agent's primary model.
- Microsoft 365/Copilot/Agent 365 licensing and entitlements are curated, not auto-priced from Azure. Include entitlement version and user-understandable source links.
- Provide compatibility state `verified-supported | verified-unsupported | unverified`, with evidence link, last reviewed and restrictions (model family, feature type, geography, SKU, deployment mode).

## Source priorities

1. Microsoft official documented APIs, product-specific billing/licensing documentation and official product/pricing pages, scoped by effective date.
2. Provider-confirmed change announcements, only with source and version.
3. User-entered contract figures for that environment, **never** represented as Microsoft-verified rates.

Never scrape customer portals or use login-only prices. If automated HTML scraping becomes necessary for licence pricing, defer it: rate changes to structured public docs can instead produce a **manual review issue**, not automatic unsupported price changes.

## In-app explainability

For every ledger line display: product, billed unit, currency, region, retail rate/contract override, refresh date, source link, price status. Distinguish **latest successfully imported catalogue** from truly real-time contractual prices. Default is the former.
