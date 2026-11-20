# 02 — Runtime, repository and deployment architecture

> See the [technical reference](technical/01-system-architecture.md) for current implementation and procedures. This document also records earlier design decisions.

## Data flows and trust boundaries

```
Visitor browser
  │  HTTPS GET only: HTML/CSS/JS, public versioned catalogue, public rule assets
  ▼
Cloudflare Workers Static Assets (CDN; no Worker script)
  │
  └─ All editing, validation, pricing calculations, logical diagram and PDF
     happen IN THE BROWSER; JSON/PDF are user-initiated local downloads.

Public sources → scheduled GitHub Actions (CI only) → validate catalogue
  → commit validated public artefact (if configured) → build → deploy static files

Developer pushes/merges main → GitHub Actions typecheck/test/build → deploy
```

No runtime Azure/Microsoft requests from customers; the public Microsoft Retail API is accessed by CI during refresh. No environment data leaves the browser in the application logic. Browser HTTPS requests to Cloudflare inherently expose ordinary network metadata (such as IP), which must not be misrepresented as zero platform metadata; do not implement application analytics.

## Technology

- React + Vite + TypeScript (`strict`), Tailwind CSS, Lucide icons, accessible primitives. Local/bundled fonts or system font; do not fetch typography from external third-party font hosts.
- In-memory environment store (e.g. Zustand), selectors and debounced calculations for large objects. Pure TS modules for `domain`, `pricing`, `calculation`, `licensing`, `governance`, `compatibility`, `export`.
- Zod (or equivalent) schema validation for imported JSON and catalogue data. Decimal arithmetic with explicitly defined rounding and units. Vitest and Playwright.
- One application project, not a monorepo; modular directories and interfaces support eventual reuse in other deployments without introducing workspace complexity.
- Diagram: deterministic SVG with lightweight automatic graph layout (ELK.js or Dagre, loaded lazily), accessible navigation and meaningful fallback table.
- PDF: lazily loaded browser library (e.g. pdf-lib) and self-rendered structured pages, ensuring readable/selectable text and professionally exported diagram.

## Cloudflare configuration requirements

`wrangler.jsonc` sets `name`, `compatibility_date`, `assets.directory = './dist'` and `assets.not_found_handling = 'none'`. **No `main`, no Worker entrypoint, no runtime bindings and no `run_worker_first`.** Hash-based navigation starts at the root. A static rewrite serves the shell at `/documentation`. Missing asset paths return 404. After building, the guarded deployment invokes Wrangler for the existing Worker and verifies its dashboard-managed Custom Domain. See the [technical deployment reference](technical/06-build-and-deploy.md).

Cloudflare Workers serves static asset requests without metering them as Worker script executions under current terms. Set security headers and sensible cache-control; HTML short/no-cache, hashed JS/CSS immutable, public pricing manifest short freshness and versioned data long immutable. Verify actual `_headers` support and routing against current documentation; avoid setting incompatible headers that block legitimate same-origin assets or PDF/JSON downloads.

Consider content-security-policy with `default-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, appropriate font/img/style allowances; don't claim strict CSP is implemented until exercised in a deployed build. Avoid external telemetry, embedders and script CDNs.

## Two Actions workflows (or one equivalent reusable setup)

**`ci-deploy.yml`**: on `push` to `main`, manual `workflow_dispatch`; checkout, Node stable LTS, `npm ci`, lint/typecheck/tests/build, `wrangler deploy` authenticated with **`CLOUDFLARE_API_TOKEN`** and **`CLOUDFLARE_ACCOUNT_ID`**. Run unit build validations on pull requests with a separate no-secrets check-only workflow or conditional job. Never expose deployment secrets to PR jobs. Normal CI tokens may be `contents: read`.

**`refresh-pricing.yml`** runs on the daily schedule and manual dispatch. It fetches reviewed Microsoft sources, validates exact measures and writes a content-addressed snapshot. A scoped GitHub App publishes only generated data through a protected PR. Its squash merge triggers the single main-branch deployment workflow. A failed source check keeps the previous release. [Protected pricing publication](36-protected-pricing-publication.md)

## Repo structure Codex should create

```
/
  AGENTS.md README.md PREREQUISITES.md CONTRIBUTING.md LICENSE
  docs/ design/ fixtures/ prompts/
  src/
    app/ components/ features/
    domain/ pricing/ calculation/ licensing/
    compatibility/ governance/ report/ diagram/
  public/
    pricing/  (versioned public JSON + manifest)
    _headers   (if compatible with static assets)
  scripts/
    refresh-pricing.ts validate-pricing.ts
  tests/
    unit/ e2e/
  .github/workflows/
    ci.yml deploy.yml refresh-pricing.yml
  wrangler.jsonc package.json package-lock.json
```

The catalogue refresh script runs only in CI; it is not bundled into frontend JavaScript.

## Operating cost/limits

Target **£0 recurring hosting** for public community MVP under provider free allowances. Public standard GitHub Actions runners, Workers Static Assets, no persistent storage, no API consumption in the app. Domain registration or optional paid upgrades excluded. Monitor provider terms, quotas, static asset count (Workers Free published cap) and Actions schedule inactivity. Do not make zero-cost claims an unconditional guarantee.

## Performance budgets and release checks

- Code split heavy graph and PDF modules; keep initial bundle lean. Target 75th percentile LCP <2.5 s on representative mobile broadband, with Lighthouse/accessibility targets recorded rather than faked.
- Recompute changes efficiently, avoid per-keystroke whole-graph recomputation when expensive; graph cycles and object-count limits defended. Run heavy work off main thread **only if measurement warrants it**.
- Serve public pricing from same origin; never request a vast raw Microsoft pricing dataset in the browser.
- Treat all public catalogue assets as untrusted data validated on build and on load.
- No empty `try/catch` hiding fetch or compatibility failures.
