# 09 — Acceptance matrix, release gates and operational QA

## Mandatory automated acceptance tests

### Domain and object lifecycle

- [ ] Create agents, groups, resources and model deployments in **any order**; incomplete agents can exist without a deployment. Resolve missing link later.
- [ ] Draft status is visible; cost subtotal and count show incomplete required lines instead of definitive £0.
- [ ] Shared compatible deployment can attach to two or more agents; changing model rate updates each agent's variable cost.
- [ ] Shared fixed capacity appears **once** in environment total; agent allocations sum to fixed total without duplicate ledger charges.
- [ ] Attempting to delete a referenced model prompts detachment/cancellation and does not corrupt graph.
- [ ] Invalid relationship, self-loop, orphaned ref and agent invocation cycle are caught with a clear message/explicit bounded behavior.
- [ ] JSON import rejects malformed, unsupported schema, oversized input and dangling links; valid JSON round-trips object values/references and overrides.
- [ ] Duplicating an environment remaps IDs and preserves internal relations and cost equivalence.
- [ ] Browser reload clears non-exported user environment; no background persistence is used.

### Pricing and financial logic

- [ ] Latest validated catalogued rate chosen by exact meter, region, unit, price type and currency; missing/ambiguous status is `unknown` (not 0).
- [ ] Default retail, 15% catalogue discount, +20% future scenario: sample £1,000 monthly retail → £850 current contract → £1,020 scenario forecast.
- [ ] Fixed rate £700 remains £700 despite +20% global forecast unless explicitly opted in → £840.
- [ ] Specific scenario percentage **replaces** global scenario for that meter; nested defaults do not compound silently.
- [ ] Fixed-price override survives an underlying retail price increase and JSON export/import; a retail-linked discount follows the changed retail rate.
- [ ] Explicit £0 requires an explanation; blank/NaN/negative invalid rates are never coerced to 0.
- [ ] Input/output token meters are separate; correct normalisation for £/1M tokens and arbitrary published units; defined rounding matches ledger subtotal.
- [ ] Already-owned licence seats are distinguished from incremental licence purchase; overlapping user groups and seats do not falsely imply unique global adoption.
- [ ] Copilot Studio consumption and Foundry inference are not added together by default without an evidenced separate billable path.
- [ ] Unsupported currency or unverifiable SKU displays unknown, not arbitrary FX or replacement model.

### UI, diagrams, reports, privacy

- [ ] Blank-state, any-order object creation, search/filter, inspector editing, dependencies, warnings and live cost updates work with keyboard-only input.
- [ ] Mobile viewport layout usable; 200% browser zoom and accessible focus/contrast pass targeted checks.
- [ ] Logical diagram updates on graph edits, shows shared deployment and missing links, and node activation selects the object; accessible alternative exists.
- [ ] Both report formats reconcile monthly, annualised, retail, current and forecast amounts and unresolved counts to the open estimate and JSON. Full Report defaults to the comprehensive architecture, ledger, findings and evidence.
- [ ] Check PDF text and media bounds, embedded fonts, metadata, tables, margins, page numbering, readable architecture, unknown-charge visibility and absence of PDF actions. Render the fictional reports for visual review using the [report fixture procedure](34-pdf-report-redesign.md#reproduce-the-visual-review).
- [ ] Keyboard selects the desired format, files download locally and switching workspaces invalidates an in-flight report.
- [ ] No user-configured data sent through fetch/XHR/beacon/analytics; browser storage contains no environment objects; only same-origin static resource fetches in normal operation.
- [ ] No runtime backend, Worker script, auth workflow or database in production output.

### Optional cost, value and design review

- [ ] Complete a Guided Foundry or Copilot estimate without entering value or governance assumptions.
- [ ] Compare usage, prices and adoption without altering accepted pricing or workload. Resolve whole-environment differences only when charges are known.
- [ ] Check optional value inputs, source labels, explicit acceptance, strict v1 imports, separate cashable savings and unchanged ledger totals.
- [ ] Verify Environment Review opens the correct editor fields and preserves old architecture and governance links.
- [ ] Reconcile both report formats. Include an illustrative adoption comparison only after explicit selection in Full Report.
- [ ] Test keyboard access and narrow reflow. Record the [moderated study](37-cost-value-usability-study.md) separately from automated verification.

### CI and catalogue

- [ ] `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` pass from clean checkout; e2e suite runs on CI with browser installed.
- [ ] Refresh script pages through Retail Prices API data, validates mapping/coverage/units and produces versioned catalogue manifest. Mock source responses in tests.
- [ ] Corrupt/empty/disappearing API response does **not** replace last-known-good catalogue and causes a clear failed job.
- [ ] Scheduled refresh **publishes** a valid new catalogue to Cloudflare; test that a `GITHUB_TOKEN` commit alone does not rely on triggering a separate deploy workflow.
- [ ] No deployment secrets available in untrusted PR builds; use scoped Cloudflare token on `main` and manual only.
- [ ] Pricing in app comes from deployed public manifest and its `lastCheckedAt`, not from hypothetical current date.

## Release gates

**Gate A — Technical MVP**: all main UX flows, calculation engine, import/export, report, governance and deployment workflows work with proven tests and explicitly marked test-only fixtures. Missing official prices are allowed only with `unknown` status; never present this as a fully verified live-pricing product.

**Gate B — Community release**: select supported Microsoft models, SKUs, deployment/feature paths and platform meters have dated, official evidence and genuine validated public catalogue records. Unsupported items clearly shown. Pricing/licensing manual content reviewed. Privacy, security, accessibility and PDF reconciliations verified. Public explanatory disclaimer, licence and CONTRIBUTING in place.

Do not block Gate A on unsupported Microsoft catalogued meters, but do not claim Gate B without evidence. Release notes must report breadth of verified billing support and missing coverage.

## Operational runbook

- PR check workflow: run tests/build **without** deployment credentials. On merge to main: deploy static build. On schedule: fetch/match/validate price catalogue, commit when configured, build/deploy in same workflow or trusted reuse, avoid overlapping deploys.
- Check Cloudflare last deployment and live `pricing/manifest.json`; verify version and refresh timestamp actually changed when source changes.
- GitHub scheduled workflows may be disabled after ~60 days of public repository inactivity; add manual dispatch and document re-enabling. No false claim of continuously guaranteed updates.
- Catalogued price changes above reasonable threshold or large coverage drops trigger failure/manual review. On incident, roll back to last-known-good public static catalogue and previous Worker deployment.
- Maintain pinned/controlled dependencies, dependency updates, audit for vulnerable packages, code of conduct, CONTRIBUTING and responsible security contact if desired.

## Codex completion report format

1. Commits/PR link or branch; commands run and pass/fail output summary.
2. Implemented modules/screens with no fake/skeleton actions.
3. Worker deployment URL if credentials provided; otherwise name missing configuration precisely.
4. Price sources, last-good catalogue state, supported/unpriced meters and exact known gaps.
5. Privacy/data network verification and any accessibility or PDF limitations.
6. Manual actions the repository owner must take before Gate B.
