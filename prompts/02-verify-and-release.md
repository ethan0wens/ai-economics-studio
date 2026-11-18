# Codex task 2 — Independent implementation audit, corrections and release

Review **the actual current repository code and PR** for AI Economics Studio against `AGENTS.md`, `docs/` and `docs/09-acceptance-and-release.md`. This is a verification/repair task, not a fresh redesign. Read full repository state and run tests before deciding what to change.

1. Inspect real execution, not screenshots: verify create-any-order drafts, two agents sharing a model, contract/forecast precedence, money unit normalization, non-duplicated shared fixed charges, unsupported Microsoft combinations and unknown-cost coverage, per-object inspector, import/export and duplication, and browser-generated logical diagram/PDF reconciliation.
2. Fix bugs and missing behaviour in code; ensure types/lint/unit/e2e/build pass. Test keyboard/mobile paths and long reports. Verify no environment data enters localStorage/IndexedDB, cookies, telemetry, application logs or network requests.
3. Audit actual GitHub Actions workflows for permissions and secret exposure. Confirm Workers config has only Static Assets and SPA fallback with **no Worker script**; all deploys require the scoped GitHub secrets. Confirm scheduled pricing refresh validates API pages and known source meters, preserves last-good on failures, and **builds/deploys in same workflow** rather than relying on `GITHUB_TOKEN` to trigger main deploy. Record proof of deployed manifest freshness after a successful refresh if permitted.
4. Validate pricing provenance and real Microsoft SKU coverage. Do not substitute mocked fixture rates for live prices; unverified licence and Copilot Studio rules remain clearly labelled. Include manual prices/scenarios in reports and JSON.
5. If Cloudflare credentials are present, deploy verified main build and return actual `workers.dev` URL. If not, give the repository owner precise missing secret/config steps and DO NOT claim deployment.
6. Preserve locked scope, current design tokens and independence/privacy requirements. Fix what is needed in commits/PR; don't introduce unnecessary services or dependencies.

Return an acceptance checklist with pass/fail/evidence for each major category; actual production URL if deployed; verified source coverage; unresolved blocks to **Gate B — Community release**; and owner-only tasks needed to finish. No fictional test results.
