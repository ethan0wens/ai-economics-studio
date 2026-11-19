# Technical documentation

Use this reference to understand, verify, operate and extend AI Economics Studio. The running code, schemas, tests and dated evidence are the technical authority. Open [Technical Documentation in the studio](https://ai-econmics-studio.ethan0wens.workers.dev/#/documentation/technical) for searchable articles and generated references.

## 1. Platform Architecture & System Design

Browser runtime, component boundaries and the environment-to-export lifecycle.

- [System architecture and trust boundaries](01-system-architecture.md). Follow the static delivery path and see why evaluation runs in the browser.
- [From workspace changes to exports](01-workspace-flow.md). Trace the React component tree, derived ledger, diagrams, JSON and PDF.

## 2. Environment Data Model & Configuration

The versioned environment schema, object fields, relationships and import contract.

- [Environment schema and object fields](02-environment-schema.md). Read the top-level contract and the full field reference for every object kind.
- [Relationships, drafts and versioned files](02-relationships-and-files.md). Check cardinality, links and the exact rules for importing and exporting environments.

## 3. Financial Engine & TCO Methodology

Auditable quantities, price precedence, rounding, licence expenditure and worked reconciliations.

- [Ledger quantities and cost methodology](03-ledger-methodology.md). Calculate tokens, credits, resource usage and capacity, then reconcile monthly and annual costs.
- [Contracts, forecasts and licence expenditure](03-agreements-and-licences.md). Trace override precedence, existing spend, distinct seats and dated licence replacement.
- [Worked financial reconciliations](03-worked-reconciliations.md). Follow six independently calculated scenarios and compare them with executable tests.

## 4. Microsoft AI Services & Licensing

What the studio can model, the Microsoft evidence behind it and customer checks.

- [Microsoft Foundry and Azure supporting services](04-foundry-and-azure.md). Review model identity, PTU sizing, deployment evidence and Azure resource billing units.
- [Copilot Studio and Microsoft licensing evidence](04-copilot-and-licensing.md). Understand credit consumption, prepaid allocations, UK offers and licence prerequisites.

## 5. Pricing Catalogue, Evidence & Automation

Immutable snapshot contracts, official sources, ingestion and verification procedures.

- [Catalogue formats, provenance and live coverage](05-catalogue-contract.md). Read the manifest and billing identity, then inspect the currently applied inventory.
- [Catalogue refresh and maintenance runbook](05-catalogue-maintenance.md). Operate the retail and evidence pipeline and recover from a rejected publication.

## 6. Deployment, Security & Operations

Local setup, GitHub release gates, Cloudflare routing and incident response.

- [Local development and Cloudflare deployment](06-build-and-deploy.md). Run the application, review workflow triggers and trace a verified production release.
- [Security, privacy and release recovery](06-security-and-operations.md). Inspect the content policy, understand data boundaries and restore a known-good version.
- [Security & Privacy](06-security-and-privacy.md). Review browser data handling, file boundaries, catalogue integrity and release safeguards.

## 7. Testing, Validation & Technical Reference

Executable verification, core interfaces, troubleshooting and the limitations register.

- [Verification, validation and financial regression](07-verification-and-tests.md). Choose the right test layer, reproduce expected results and add a safe regression scenario.
- [Core interfaces and troubleshooting](07-interfaces-and-troubleshooting.md). Locate the key TypeScript contracts and diagnose failures from imports to production.
- [Limitations and independent review](07-limitations.md). Separate supported modelling, modelling assumptions and gaps in external evidence.

## Maintaining this reference

- [Moderated estimation usability study](usability-study.md). Run task-based sessions with unfamiliar business, architecture and financial reviewers.
- [Technical documentation audit](audit.md). Read the baseline coverage matrix, authority decisions and open evidence gaps.
- [Source traceability](traceability.md). Follow the implementation files, evidence and tests behind each reference section.
- [Maintaining the technical documentation](maintenance.md). Maintain links, references, examples and contributor checks.
- [Product language guide](../31-product-language.md). Use the Studio's British English conventions, financial terms and warning patterns.
- [Contributing](../../CONTRIBUTING.md). Prepare a contribution with reviewed evidence and appropriate tests.
