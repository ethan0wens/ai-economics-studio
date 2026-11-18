# Codex task 1 — Implement AI Economics Studio MVP end-to-end

You are working in the `ai-economics-studio` GitHub repository, which already contains a detailed handover. **This is an implementation task, not a planning or design-only task.**

Before coding, read **every** file in `AGENTS.md`, `README.md`, `PREREQUISITES.md`, `docs/`, `fixtures/` and `design/tokens.json`. Treat `AGENTS.md` and the acceptance tests as binding. Use the files as specification and do not ask me to repeat product decisions already documented.

**Objective:** Build a high-quality, end-to-end, free/open-source, Microsoft-first AI Economics Studio community MVP in this repository. Follow the implementation sequence in `docs/10-delivery-plan.md`, but continue autonomously across all slices. Do not stop at a scaffold, Figma-like UI, static mockup, generic pseudocode, or a planning document. Make real code, working calculations and working exports. Make incremental coherent commits or a single reviewable PR.

**Hard constraints:** React + TypeScript + Vite single project, Cloudflare Workers **Static Assets only**, GitHub Actions deploying on `main` and refreshing verified public Azure retail catalogue daily, no Worker script/backend/database/auth/analytics, no runtime paid services, no browser storage of environments. Environment data stays only in memory until the user explicitly exports/imports JSON. Use a current official Microsoft pricing API **in scheduled CI** with explicit verified meter mappings; do not invent prices. Price overrides include fixed contract rates, catalogue-linked discounts and hypothetical forecasts with exact documented precedence. Unsupported pricing shows `unknown`, never £0. Shared deployments are counted once. Users may create objects in **any order**, with incomplete drafts. Apply approved Cloud Professional styling and build professional browser PDF plus logical diagram. Treat agent/model integration and Microsoft licensing as evidence-bound, not guessed. No monetary ROI assumptions.

**Acceptance criteria:** Implement and run all applicable checks in `docs/09-acceptance-and-release.md`, including financial reconciliation, catalogue failure safety, price refresh deployment in same workflow (do not rely on GitHub-token commits triggering another workflow), privacy/no persistence, JSON round-trip, mobile/keyboard usability and PDF generation. Use realistic user workflows; any test data must be explicitly fictional and must not populate production prices.

**Execution requirements:**

1. Implement `package.json` scripts: `dev`, `typecheck`, `lint`, `test`, `test:e2e`, `build`, `pricing:refresh`, `pricing:validate` and `deploy` with real working commands. Commit a lockfile and use current stable supported libraries.
2. Start with the domain model and price/ledger engine, then build UI and reports on the same validated data structures. All screens need functional actions, not placeholders.
3. Provide explicit source coverage and unknown-rate states. If the official public source does not reliably include a required meter, implement the unpriced state and manual override instead of fabricating data or blocking the entire MVP.
4. Add tests for unknown rate, 15% contract discount plus 20% forecast, fixed contract, shared fixed model charges, exact price units, invalid schemas, import/export, dependencies and report cost reconciliation.
5. Implement Cloudflare static deployment configuration and separate no-secret PR checks. Add daily scheduled pricing refresh and manual dispatch; safeguard last-good catalogue, provenance and deployment freshness. Ensure safe GitHub workflow permissions and concurrency.
6. Add README, CONTRIBUTING, licence (MIT suggested; retain `LICENSE` as owner-reviewable), independent disclaimer, implementation notes and operations runbook.
7. Run checks and fix failures. If production credentials are unavailable, finish the full code and workflow but do **not** claim to have deployed.

**Final answer to me:** concise implementation summary, exact files/modules added, test commands with pass/fail results, how to run locally, what needs GitHub/Cloudflare configuration, whether live deployment actually happened, price coverage and remaining Microsoft evidence gaps, and any acceptance failures. Explicitly distinguish **technical MVP** from **verified community release**. Avoid asking for feedback until you have completed as much as possible.
