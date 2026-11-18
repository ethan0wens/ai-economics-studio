# 10 — Delivery strategy to minimise Codex prompts

## Objective

Aim for **one end-to-end implementation prompt** and at most **one independent verification/deployment prompt**; not a contractual guarantee of finished software. Use `AGENTS.md` and exact tests as continuous guardrails. Codex should not stop after scaffolding, ask to approve routine package selection, or implement hardcoded placeholder figures as though complete.

## Ordered vertical slices within the first prompt

1. **Repo/project foundation**: build scripts, strict types, CSS design tokens, responsive app shell, navigation, error boundaries; licence and CONTRIBUTING; read docs.
2. **Model + schema + in-memory state**: object registry, relationships, draft/invalid states, versioned JSON save/import, duplicate/remap, unsaved warning, tests.
3. **Pricing + ledger**: catalogue schema, fixtures, unknown-price semantics, contract/forecast rules, input/output tokens, shared fixed costs, licence net incremental, aggregation/reconciliation tests.
4. **Inventory-first UI**: object creation any order, lists/filter/search, contextual inspector tabs, live summary, price override/forecast editor, accessible interactions.
5. **Microsoft adapter and source evidence**: explicit supported/unverified model connections; curated meter mappings; licensing source references; safe no-double-counting.
6. **Architecture and governance**: read-only logical graph + accessible table, explanatory rule engine and coverage.
7. **Reports and exports**: professional browser PDF and JSON, same ledger and diagram, source references and incomplete cost labels.
8. **Public catalogue refresh**: CI-only API ingestion, validation/atomic publication; production static manifest with verified real records when possible, otherwise honest explicit unknown coverage. Source snapshot fixture never promoted to retail catalogue.
9. **CI/CD and hardening**: GitHub Actions for PR CI, main deploy and scheduled refresh, Cloudflare static Wrangler config, security headers, privacy and accessibility checks, e2e tests and docs.
10. **Final report**: list evidence, results, blockers and manual prerequisites. If deployment secrets aren't present, complete all code/workflows and stop before claiming it is deployed.

## Scope control and permissions

**Codex may decide**: exact folder structure, suitable accessible component library, store library, decimal package, SVG layout library, PDF package, detailed responsive breakpoints, quality-of-life UI and build script specifics.

**Codex must NOT decide to change**: public/free/no-login/no-storage product model, browser-only compute, Cloudflare Static Assets hosting, GitHub Actions deploy+pricing pipeline, default catalogue plus contract/forecast rates, no fixed object order, Microsoft-first evidence constraints, no invented prices/ROI, report visuals and semantic cost transparency.

When official Microsoft evidence is missing, document gaps and represent them explicitly in UI, rather than inventing rates or stopping development. Focus on a production-quality core with transparent partial source coverage rather than a fake complete price database.

## Verification prompt

Use `prompts/02-verify-and-release.md` after reviewing initial PR. It directs an end-to-end audit with a particular focus on difficult monetary edge cases and deployed refresh verification. Do not ask for 'make it beautiful' in a third open-ended prompt; describe concrete findings if any.
