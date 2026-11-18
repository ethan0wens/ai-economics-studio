# 08 — Architecture view and professional browser-generated PDF

## Logical diagram — scope and semantics

This is a **high-level logical/cost relationship diagram**, not Azure infrastructure topology, deployment configuration, network traffic map or security boundary verification. Derived from environment objects/typed references, not user-authored rectangles.

Suggested layout (top to bottom):

1. User groups and licensed audience (counts are scoped and explicit).
2. Agents (Copilot Studio and Foundry Agent Service distinguishable by label and icon).
3. Shared model deployments (Foundry model, SKU, region, cost status), show multiple incoming agent references without duplicate charges.
4. Azure supporting resources and tool integrations.
5. Governance/security overlays (identity, controls, DLP/monitoring) as separate band or contextual chips; not a claim of enforcement.

Use a single graph data structure to render interactive browser SVG and print/export SVG. Deterministic auto-layout, stable IDs, predictable ordering, smart handling of missing/draft relations, edge grouping, readable labels. Clicking or keyboard activating a node opens its inventory inspector. Provide an accessible hierarchical fallback table. No drag-and-drop topology editor in MVP.

## Approved report aesthetic

Clean executive-grade, light-white pages, navy headings, restrained blue accent and design-token-aligned status/ledger colours. Avoid screenshots of the entire dashboard and cluttered PDFs. The report should resemble a short professional consulting deliverable, not a raw web page.

## Required report sections

1. **Cover/summary**: environment name, generated UTC date, product name, independent disclaimer, price basis, catalogue ID, summary of known cost and incompleteness.
2. **Environment overview**: agent and deployment counts, region, usage/seat assumptions, modelled platforms and price coverage.
3. **Logical architecture**: diagram with legend and shared links, visible unconfigured/draft objects, statement that it is conceptual.
4. **Financial overview**: monthly and annual **run-rate** figures, retail vs contractual current vs forecast, cost category breakdown, known subtotal with missing cost warning.
5. **Detailed ledger**: at minimum cost category, object/meter, usage, rate, basis, effective cost, source/unknown flags and explanations of shared allocations.
6. **Insights and uncertainty**: biggest cost drivers, sensitivity to tokens/users/fixed capacity where supported; no invented financial benefits/ROI.
7. **Governance advisory findings**: top gaps with rationale and provenance, modelled versus verified clarity.
8. **Assumptions and source appendix**: unit math, input estimates, rate provenance/effective dates, contract override explanations, forecast parameters, data limitations, version and generated timestamp.

Use meaningful pagination, page numbers, no clipped labels, selectable text wherever possible, readable charts. Generate entirely in browser; no external PDF API or analytics calls. Lazy-load PDF code and fonts. Validate PDF with a test that confirms download, nonempty bytes, stable page count/range and key textual content; avoid returning a blank PDF on unsupported browsers.

## Reconciliation

Diagram shows same object IDs and relationships used by the engine. PDF financial tables are generated from the **same immutable cost ledger** as the app, not duplicate calculations. The known subtotal matches all included line items after documented rounding. Incomplete/unknown must appear in PDF, not silently excluded.
