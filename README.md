# AI Economics Studio

AI Economics Studio is a free, independent, Microsoft-first planning tool for modelling hypothetical AI environments and estimating costs. Build an inventory, link agents and shared model deployments, enter usage and agreement assumptions, and export a logical diagram, PDF report or versioned JSON.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Name an environment on **Home** or preview a fictional example. **Environment Builder** opens in Guided mode, where you can choose platforms, add agents, enter usage and see the estimate update. Advanced opens the same inventory and its settings. **Cost Analysis** shows known costs, unresolved items, the cost ledger and the fields that need attention. Use **Reports & Export** for a PDF or to save editable JSON. **Documentation** offers searchable instructions and **Pricing Catalogue** shows the scope and evidence behind the rates. Cloud accounts and credentials are needed for production deployment.

```sh
npm run typecheck
npm run lint
npm test
npm run pricing:validate
npm run evidence:validate
npm run docs:validate
npm run build
npx playwright install chromium
npm run test:e2e
```

See the [field guide](docs/13-field-guide.md) for configuration inputs, units and requirements. See [source coverage](SOURCES.md) for the pricing coverage matrix, exact Azure mappings, commercial review dates and remaining evidence gaps, and the [operations runbook](docs/12-operations.md) for publishing, incident response and checks.

See the [Stage 2 delivery notes](docs/30-stage-2-ux-delivery.md) for navigation, example reconciliations and documentation maintenance.
Use the [product language guide](docs/31-product-language.md) when editing the interface, help, documentation or reports.

See the [licensing and technical evidence guide](docs/18-licensing-and-technical-evidence.md), [enterprise financial reconciliations](docs/19-enterprise-financial-validation.md), [UK licensing review](docs/21-uk-licensing-gap-review.md) and [provisioned sizing and Foundry review](docs/22-ptu-and-foundry-review.md) for current coverage and test results. See [catalogue maintenance](docs/23-maintenance-automation.md) for schedules, source rules and recovery.

## Technical documentation

Read the [seven-section technical reference](docs/technical/README.md) for architecture, schemas, financial calculations, Microsoft evidence, catalogue maintenance, deployment and testing. The same articles are available in the studio under **Documentation → Technical Documentation**. Start with the [source traceability matrix](docs/technical/traceability.md) for an audit or the [maintenance guidance](docs/technical/maintenance.md) for a contribution.

## Locked architecture

- **UI**: React + TypeScript + Vite, light-first Cloud Professional design system.
- **Delivery**: Cloudflare **Workers Static Assets** (no runtime Worker script), deployed by GitHub Actions on changes merged to `main`.
- **Pricing**: public, versioned catalogue; scheduled GitHub Actions discover published rates within reviewed Microsoft product and SKU families. The static inventory includes manual-rate and unsupported configurations. Scheduled Microsoft source reconciliation verifies UK commercial offers and technical evidence independently. The Pricing Catalogue shows the latest published health report. Failed updates preserve the last verified release.
- **Compute and privacy**: all app state, TCO, validation, diagrams and PDF generation in the user's browser. No login, telemetry, persistent environment storage, data collection, application server or database.
- **Saving**: users explicitly export/import versioned JSON; no `localStorage`, `sessionStorage`, IndexedDB or automatic cloud saves for environment data.
- **Financial accuracy**: latest verified published rates by default; user-fixed contract prices, retail percentage discounts and forecast adjustments; never use zero when price is unknown. An unverified cost is visibly **incomplete**.
- **Workflow**: solution-first Guided builder with a running estimate and an Advanced inventory with no fixed object creation order. Both views support incomplete drafts.
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
