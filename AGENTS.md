# Codex agent instructions — AI Economics Studio

This is the **authoritative implementation contract**. Read the README and **all** docs in `docs/` plus `design/tokens.json` and `fixtures/` before implementing. For uncertainty, use explicit `unknown`/`unsupported` states instead of invented features, rates or compatibility. This document overrides convenience shortcuts.

## Mission

Ship the entire **Microsoft-first community MVP** in one coherent development effort, with a testable, accessible React application, rigorous cost engine, automatic validated public pricing refresh, Cloudflare Workers Static Assets deployment and browser-side PDF/JSON exports. Prioritise an end-to-end working vertical slice over shallow decorative features.

## Hard constraints (do not negotiate)

1. One Vite + React + TypeScript application. Keep domain/calculation/licensing/pricing modules separately testable, but **avoid a monorepo or backend** for MVP. Do not set up Express, Functions, database, Firebase, Supabase, Next.js SSR, auth or server-side PDF.
2. Cloudflare **Workers Static Assets only**; use `wrangler` assets pointing to `dist` and SPA fallback. **No Worker entrypoint/script**, paid KV, Durable Objects, R2 or paid infrastructure. No production server processes.
3. No user accounts, telemetry/analytics, credentials, Microsoft tenant access, storage of customer configurations or server-side collection. Do not use browser `localStorage`, `sessionStorage`, IndexedDB or cookies for environment persistence. In-memory state; explicit versioned JSON import/export.
4. No arbitrary outbound network requests carrying user configurations or derived estimates. Pricing files are same-origin static assets. Price ingestion happens only in scheduled CI, not via every visitor's browser.
5. Default latest **validated public retail catalogue** with provenance; support fixed-price overrides, catalogue-linked percentage discounts and future price scenarios. Missing rate is `unknown`, never 0; explicit 0 must be deliberately entered with a rationale. Preserve overrides on refresh and JSON export.
6. Object **creation in any order**; incomplete drafts are first-class and visually neutral/amber, not blocking new objects. Incomplete/invalid objects and unknown costs cannot be presented as complete authoritative TCO.
7. No prepopulated ROI, benefit value, employee time value, minutes saved, productivity or success rates. Any adoption/value analysis is optional, isolated from core TCO and requires user input.
8. No invented Microsoft API billing models, product availability, agent-to-deployment compatibility, entitlements or compliance guarantees. All supported combinations must have evidence or be marked `needs verification`/unsupported.
9. All code, static data, tools and docs must be freely usable; no proprietary asset dependency, paid required service or embedding of restricted customer information.
10. Use the agreed Cloud Professional design tokens; high-quality responsive UI, real forms and useful empty states. Never mask incomplete calculations behind polished fake £ figures. Fixtures are **test-only**.

## Required behavior

- Inventory-first builder: all object groups, search/filter, top TCO/validation strip, right inspector on desktop, sensible mobile layout; contextual create/link flows.
- Agents select platform and supported model source. Existing deployments selectable by name and metadata; shared deployment charges never duplicated. Binding changes recalculate all affected agents.
- Usage/cost ledger is deterministic and transparent, separates fixed shared charges from variable costs; supports platform orchestration, input/output tokens, supporting resources and licensing **only where costed with evidence**.
- Cost views: retail baseline, agreement-adjusted current, forecasted effective, per-agent allocations, monthly/annual and assumptions. Scenario selection never changes core environment objects.
- Governance advisory engine uses explicit rule version, explanation and confidence/coverage. It does not certify compliance.
- Read-only auto-layout logical architecture diagram, synced with objects, keyboard accessible, printable in a professional client-generated PDF. No topology/network or infrastructure-deployed claims.
- Scheduled price ingestion with exact curated meter mapping, paging, currency, timestamps, validation, atomic fail-safe publishing and last-good fallback. A GitHub Actions `GITHUB_TOKEN` commit **cannot be relied on** to trigger another workflow. The protected publisher uses its dedicated GitHub App to open and squash-merge a checked pricing-only PR. The resulting `main` push triggers the sole guarded deployment workflow.
- All prices have source URLs, effective dates, lookup/refresh times, billing units, currency and status. The product's independent-not-Microsoft disclaimer must be visible and exported.

## Build approach

- Implement one coherent vertical slice first: working objects → shared model → cost ledger → browser UI → JSON export/import → diagram and PDF → governance/licensing → CI deployment/price automation. Continue without pausing for routine questions.
- Use measured, minimal dependencies: Tailwind and accessible primitives, lightweight in-memory store, schema validator such as Zod, decimal arithmetic for money, and lazy loaded diagram/PDF libraries. Choose one graph layout system. Do not include React Flow unless its interaction benefit justifies bundle size.
- Keep pure calculation modules DOM-free and thoroughly unit-tested. Add Playwright coverage for top user journeys. Type-check, lint, unit tests and production build must pass before saying 'complete'.
- The React UI should never call Microsoft paid services. Do not use example prices as actual retail rates.
- Provide `npm run dev`, `typecheck`, `lint`, `test`, `test:e2e`, `build`, `pricing:refresh`, `pricing:validate`, `deploy` scripts. Document required local runtime versions and secrets. Add a licence, contributing guide and disclaimer.
- Configure path-stable asset caching, security headers compatible with the actual app and an accessible error boundary. Prefer same-origin static assets, no external fonts or third-party trackers.
- Avoid CORS-dependent client price calls; public Microsoft API is CI-only.
- Define correct release gates: **technical MVP** and **verified community release**. You may finish the former with unpriced unsupported combinations, but you may not claim the latter without source verification.

## Definition of done and reporting

Do not stop after a plan, mockups or a scaffold. Implement code, run checks, commit coherently and return: runnable URL (if deployed), exact scripts/tests/results, price coverage/unknowns, security/privacy checks, assumptions, and any manual steps left. If credentials are absent, complete local functionality and leave a fully configured workflow waiting for `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`; never invent deployment success.

See `docs/09-acceptance-and-release.md` for hard acceptance tests. Keep these specs and README updated if any implementation-level choices change; do not silently change locked architecture or scope.
