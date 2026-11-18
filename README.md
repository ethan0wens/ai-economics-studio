# AI Economics Studio

AI Economics Studio is a free, independent, Microsoft-first planning tool for modelling hypothetical AI environments and estimating costs. Build an inventory, link agents and shared model deployments, enter usage and agreement assumptions, and export a logical diagram, PDF report or versioned JSON.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

The studio starts with an empty workspace. Add an object of any type, then use the inspector to set its configuration, usage and relationships. In **Cost Analysis**, open a line to see its billed unit, sources, rate assumptions and forecast. Cloud accounts and credentials are only needed for production deployment.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

See the [field guide](docs/13-field-guide.md) for configuration inputs, units and requirements. See [source coverage](SOURCES.md) for the pricing coverage matrix, exact Azure mappings, commercial review dates and remaining evidence gaps, and the [operations runbook](docs/12-operations.md) for publishing, incident response and checks.

## Locked architecture

- **UI**: React + TypeScript + Vite, light-first Cloud Professional design system.
- **Delivery**: Cloudflare **Workers Static Assets** (no runtime Worker script), deployed by GitHub Actions on changes merged to `main`.
- **Pricing**: public, versioned catalogue; scheduled GitHub Actions updates from Microsoft's public Azure Retail Prices API for curated/mapped meters; separately curated Microsoft licence and consumption rules. Failed refreshes must not replace a good catalogue.
- **Compute and privacy**: all app state, TCO, validation, diagrams and PDF generation in the user's browser. No login, telemetry, persistent environment storage, data collection, application server or database.
- **Saving**: users explicitly export/import versioned JSON; no `localStorage`, `sessionStorage`, IndexedDB or automatic cloud saves for environment data.
- **Financial accuracy**: latest verified published rates by default; user-fixed contract prices, retail percentage discounts and forecast adjustments; never use zero when price is unknown. An unverified cost is visibly **incomplete**.
- **Workflow**: inventory-first Environment Builder with **no fixed object creation order**. Incomplete drafts are allowed and visibly identified.
- **Current scope**: Microsoft Foundry/Foundry Agent Service, Copilot Studio, relevant Microsoft licensing, Azure supporting services and security/governance; future provider-neutral extension points only, not AWS/other provider implementation.

## Product specification

| File | Role |
|---|---|
| `AGENTS.md` | Non-negotiable implementation instructions to Codex |
| `PREREQUISITES.md` | Original handover and Cloudflare/GitHub deployment prerequisites |
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

## Independence and disclaimers

The product is independent of and not endorsed by Microsoft. All estimates depend on explicit assumptions and published/entered rates, are **not invoices, quotes, licensing advice or compliance certifications**, and must show source provenance and gaps.
