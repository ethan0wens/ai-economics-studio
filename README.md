# AI Economics Studio — Codex implementation handover

**Version:** 1.0 · **Prepared:** 2026-11-18 · **Status:** Implementation-ready product/architecture specification, **not** an implemented app.

AI Economics Studio is an independent, free, open-source, Microsoft-first community application for designing hypothetical enterprise AI environments and estimating their consumption, licensing, infrastructure and governance implications. It does **not** deploy infrastructure, connect to a customer's tenant or provide contractual price quotes.

## Start here

1. Read [PREREQUISITES.md](PREREQUISITES.md) for mandatory accounts and secure deployment configuration.
2. Put **the contents of this folder at the root** of a new GitHub repository. Do not upload just the ZIP file.
3. Connect that repository to [Codex](https://chatgpt.com/codex) or open it in an editor with Codex.
4. Paste the text in [prompts/01-build-mvp.md](prompts/01-build-mvp.md) as your **first Codex task**. Codex must read [AGENTS.md](AGENTS.md) and all referenced docs before implementation.
5. Review the output using [docs/09-acceptance-and-release.md](docs/09-acceptance-and-release.md).
6. If needed, use [prompts/02-verify-and-release.md](prompts/02-verify-and-release.md) as the second and ideally final task.

**Target: one comprehensive Codex implementation task, then one independent verification/deployment task.** Real-world corrections may still be necessary. Never equate a generated UI with a financially verified release.

## Locked architecture

- **UI**: React + TypeScript + Vite, light-first Cloud Professional design system.
- **Delivery**: Cloudflare **Workers Static Assets** (no runtime Worker script), deployed by GitHub Actions on changes merged to `main`.
- **Pricing**: public, versioned catalogue; scheduled GitHub Actions updates from Microsoft's public Azure Retail Prices API for curated/mapped meters; separately curated Microsoft licence and consumption rules. Failed refreshes must not replace a good catalogue.
- **Compute and privacy**: all app state, TCO, validation, diagrams and PDF generation in the user's browser. No login, telemetry, persistent environment storage, data collection, application server or database.
- **Saving**: users explicitly export/import versioned JSON; no `localStorage`, `sessionStorage`, IndexedDB or automatic cloud saves for environment data.
- **Financial accuracy**: latest verified published rates by default; user-fixed contract prices, retail percentage discounts and forecast adjustments; never use zero when price is unknown. An unverified cost is visibly **incomplete**.
- **Workflow**: inventory-first Environment Builder with **no fixed object creation order**. Incomplete drafts are allowed and visibly identified.
- **Current scope**: Microsoft Foundry/Foundry Agent Service, Copilot Studio, relevant Microsoft licensing, Azure supporting services and security/governance; future provider-neutral extension points only, not AWS/other provider implementation.

## Hand-over map

| File | Role |
|---|---|
| `AGENTS.md` | Non-negotiable implementation instructions to Codex |
| `PREREQUISITES.md` | Before/after upload checklist; Cloudflare/GitHub credentials and controls |
| `docs/01-product-and-scope.md` | Audience, journeys, MVP in/out and honest UX |
| `docs/02-architecture-and-deployment.md` | Runtime, deployment, price-refresh orchestration, cost and privacy |
| `docs/03-domain-model.md` | Environment objects, relationships, validation, JSON schema |
| `docs/04-pricing-and-tco.md` | Pricing precedence, maths, allocation, scenarios and rounding |
| `docs/05-catalogue-and-evidence.md` | API ingestion, licence curation, compatibility evidence |
| `docs/06-ui-design.md` | Styling and detailed workflows/screens |
| `docs/07-governance-and-compatibility.md` | Rules, status and disclaimers |
| `docs/08-architecture-and-pdf.md` | Logical diagram and browser PDF |
| `docs/09-acceptance-and-release.md` | Acceptance matrix, CI, security and release gates |
| `docs/10-delivery-plan.md` | Implementation order and decisions Codex may/not make |
| `docs/11-references.md` | Authoritative source URLs verified at handover |
| `fixtures/*` | **Fictional test-only** inputs and expected results, never production catalogue |
| `design/tokens.json` | Authoritative agreed design tokens |
| `prompts/*` | Copy-and-paste Codex task text |

## Suggested repository scripts after Codex implements the app

`npm ci`, `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`, `npm run pricing:refresh`, `npm run pricing:validate`, `npm run deploy`.

Implement these actual scripts during the first task. `pricing:refresh` must validate and build public static catalogue files **without calling any customer services**. Do not add placeholder scripts that only print success.

## Independence and disclaimers

The product is independent of and not endorsed by Microsoft. All estimates depend on explicit assumptions and published/entered rates, are **not invoices, quotes, licensing advice or compliance certifications**, and must show source provenance and gaps.
