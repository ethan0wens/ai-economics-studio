# From workspace changes to exports

The workspace starts empty. Create a named environment on Home, open an editable copy of a built-in example, or import a saved environment file. Examples provide illustrative quantities and declarations and draw retail prices from the applied catalogue.

## Component relationships

```diagram
Diagram 2. Component relationships

main.tsx → App
    ├─ StudioNavigation and Home          create, import and resume
    ├─ GuidedBuilder / Inventory          same Environment and commit path
    │                    └─ Inspector    configuration, usage and relationships
    ├─ EstimateSummary / CostAnalysis      totals, gaps and itemised charges
    ├─ Coverage / CatalogueHealth          published evidence and price scope
    ├─ Documentation / Examples          guides, reference and templates
    └─ Reports / Architecture              shared Ledger and logical graph
```

[Navigation](../../src/navigation.ts) encodes destinations in the URL hash and reads the optional section target. Hash navigation works on static delivery and carries public documentation IDs. [Workspace controls](../../src/workspace-ui.tsx) supply Home and responsive navigation. App changes the active route, restores meaningful focus and warns about dirty work before a replacement or browser unload. Modal controls use native dialogs.

[Guided Builder](../../src/guided-ui.tsx) assists with platform, solution, usage, additional costs and review. [Guided state](../../src/guided-state.ts) constructs prospective environment records and edges. Advanced renders the same inventory through [Inspector](../../src/inspector.tsx), which supports drafts in any order and edits selected fields or relationships. The mode toggle selects an editor. It keeps the active records and advanced fields in the same environment object.

[Cost Analysis](../../src/pricing-ui.tsx) renders existing ledger rows and edits agreement and scenario inputs. [Estimate summary and checks](../../src/estimate-ui.tsx) present known amounts, unresolved charges, compatibility and licensing findings. [Coverage](../../src/coverage-ui.tsx) separates the public product inventory from the completeness of the user's environment. The [Documentation Hub](../../src/documentation-ui.tsx) links user guides to the repository's Markdown reference and derives public tables from the same applied catalogue.

## Environment to ledger

```diagram
Diagram 3. Environment-to-ledger evaluation

Create, import or edit
        │
        ▼
Prospective Environment ── schema and graph checks ──▶ accepted React state
                                                           │
Applied catalogue records and inventory ───────────────────┤
Assessment time ───────────────────────────────────────────┤
                                                           ▼
               technical findings + licence plan → ledger lines
                                      │
                         rounded totals, issues and sources
                                      │
                               UI, JSON and PDF
```

`update` prepares a timestamped value and calls `environmentSchema.safeParse`. A failed parse leaves the active environment in place and shows an error. A successful parse updates the environment and marks it dirty. The next React render derives `ledger(env, records, at, inventory)` from the active objects and currently applied catalogue. The computation also runs after initial catalogue load and explicit adoption. There is no polling or network request for each edit. A catalogue candidate remains separate until the user applies it.

The ledger derives a technical assessment and licence plan first. It evaluates charge quantities and verified rates, applies agreement and forecast choices, rounds each line and summarises it by basis. Derived values do not update the environment configuration. Rendering uses the same result object for Cost Analysis, readiness and the report. The [ledger method](03-ledger-methodology.md) defines the exact formulas and unknown states.

## Diagrams and report flow

- [Logical graph](../../src/graph.ts) uses Dagre to position objects and links. It projects object names, types, connections, draft state, selected finding labels and cost annotations. It represents planned relationships. Use the browser diagram and text register to inspect those relationships and open the corresponding object.
- [Browser diagram](../../src/diagram.tsx) renders the projection as SVG and can download SVG. [PDF architecture](../../src/report-architecture.ts) renders a readable version of the same projection or a grouped view, with full component and relationship registers. Both describe the declared logical plan.
- [Report generation](../../src/report.ts) receives the applied environment, ledger, catalogue and governance snapshot. Both formats share the cover, financial summary and cost drivers. Full Report adds the printed contents, financial appendix, evidence findings and methodology. [Measured layout](../../src/report-layout.ts) handles wrapping, page breaks and repeated column headings. [Financial appendices](../../src/report-appendices.ts) trace charges to the deduplicated source register. The renderer displays ledger amounts and derives chart shares from already calculated amounts.
- Report generation lazily loads the renderer and locally bundled fonts. The export uses an in-memory browser download. Switching or editing the workspace invalidates an in-flight download. Text is selectable. Full Report provides printed page references. PDF/UA, tags and bookmarks are outside this format. Unsupported characters appear as a replacement glyph.
- JSON export serialises the editable environment and a lightweight source snapshot. It preserves original text and restores the editable workspace. Use the report to share the estimate and the JSON to continue editing.

For data interfaces and round-trip behaviour, see [relationships, drafts and versioned files](02-relationships-and-files.md). The [browser workflow tests](../../tests/e2e/studio.spec.ts) reconcile editor totals, shared charges, graph interaction and file exports.

## Guided usage preview

**Estimate usage** still edits the existing usage profile or Copilot agent. Open **Help me estimate usage** to preview an optional Foundry workload or a sum of declared Copilot Credits. Preview and cancel change only component state. Apply calls the same validated environment update as direct entry. The usage profile needs to belong to one agent. Copy a shared profile first. Provisioned pricing continues to use deployment capacity and billable hours. See [quantity derivation](03-ledger-methodology.md#assisted-usage-and-sensitivity).
