# System architecture and trust boundaries

AI Economics Studio is an independent planning application for hypothetical Microsoft AI environments. It accepts an environment and dated pricing evidence, builds an itemised estimate, and produces local downloads for review. Provisioning, actual metering, tenant administration, entitlement enforcement and invoicing belong to the relevant providers and customer systems.

## System boundary

Cloudflare serves the static application and its public data. The browser runs the React application and performs the calculations. GitHub Actions retrieves official source material and publishes reviewed snapshots. The three paths have distinct data and privileges.

```diagram
Diagram 1. System architecture and public data paths

Microsoft public sources ── HTTPS ──▶ GitHub Actions
                                      validate, build and publish
                                                 │
                                                 ▼
                                       Cloudflare Static Assets
                                                 │
                                   HTML, JS, CSS, fonts and public JSON
                                                 ▼
User configuration ──▶ Browser tab ─────────▶ Local JSON, PDF or SVG
                        validate and calculate
```

The browser retrieves the same-origin manifest, catalogue and optional publication health report. The evidence modules are bundled from repository data during build. Official links are navigable references and open at the user's request. The application has no authenticated Microsoft connection or customer-specific API path. Infrastructure can process ordinary HTTP metadata such as IP addresses and request URLs. The hash route and editable environment are handled in the tab. See the [security boundary](06-security-and-operations.md#browser-and-infrastructure-boundaries).

## Entry points and runtime

| Layer | Implemented responsibility | Source |
| --- | --- | --- |
| Static entry | Vite builds the document, application modules, locally bundled Inter fonts and CSS. Wrangler publishes `dist` with SPA asset routing. | [HTML entry](../../index.html), [Vite](../../vite.config.ts), [Wrangler](../../wrangler.jsonc) |
| React | `main.tsx` mounts `App` in Strict Mode. Its error boundary offers recovery by reload. | [Bootstrap](../../src/main.tsx) |
| Workspace state | `App` owns the optional active environment, applied catalogue, replacement dialog, selected object and route. It computes the ledger with `useMemo` from the active environment and catalogue. | [App](../../src/app.tsx) |
| Validation and finance | Zod parses files and proposed updates. Decimal arithmetic evaluates prices, usage, licensing and shared charges. | [Domain](../../src/domain.ts), [Ledger](../../src/ledger.ts), [Entitlements](../../src/entitlements.ts) |
| Public evidence | `loadCatalogue` checks the public manifest, SHA-256 and catalogue schema. Technical and licensing modules use their own dated evidence windows. | [Catalogue](../../src/catalogue.ts), [Technical findings](../../src/compatibility.ts) |
| Local outputs | Lazy-loaded diagram and PDF modules present the shared graph and ledger. The download helper creates a browser-local Blob URL. | [Graph](../../src/graph.ts), [PDF](../../src/report.ts), [Download](../../src/download.ts) |

React and TypeScript implement the interfaces. Tailwind's Vite plugin and the checked-in stylesheet define the presentation. Lucide supplies icons, Dagre computes logical layout, pdf-lib writes PDFs and Zod describes runtime contracts. The operative dependency versions and scripts live in [package.json](../../package.json) and [the lockfile](../../package-lock.json).

## Decisions and trade-offs

- **Browser evaluation.** Keeping calculation inputs and evidence in the browser makes the estimate interactive and allows local review of configuration. Browser memory and computation limit very large files. The import limits and explicit recovery guidance bound that cost.
- **One active in-memory workspace.** A React state update replaces a validated value as a unit. It gives Guided and Advanced a consistent view without state synchronisation between independent editors. Keep a JSON copy to reopen work after a reload.
- **Static publication.** A digest identifies immutable snapshot bytes. A small mutable manifest switches catalogue generations. The client can verify integrity and fall back one generation. Scheduling, source failures and evidence expiry remain observable through CI and the catalogue health report.
- **Deterministic financial evaluation.** Equal validated inputs, rate records, offering inventory and valuation time give equal ledger values. Snapshot comparisons require all four. An export stores summary provenance and assumptions, while historical evidence and public snapshot files must be retained separately if exact historical reproduction matters.
- **Separate evidence and spending reviews.** The cost of a configuration, the technical availability of a deployment and the customer's commercial entitlement are distinct. The UI and PDF display their results so an independent reviewer can assess them together.

The historical [runtime design](../02-architecture-and-deployment.md) records early technology alternatives. Cite this chapter for the implemented state, and follow [workspace flow](01-workspace-flow.md) for component boundaries and the calculation path.
