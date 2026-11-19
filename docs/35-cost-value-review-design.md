# Cost, value and design review

## Stage 0 retrospective

The original workspace opened an untitled dashboard before users understood how to start. It exposed several object types, reports and technical pages before users could see a priced result. Foundry setup required separate object creation and relationship editing. Cost scope and missing inputs competed with forecasting and governance. The guided redesign established named creation, task-based steps, focused missing-input actions and a small primary navigation.

Integrated productivity and economic-value modelling were outside that release. Guidance and usage previews were added later. Technical fit, licensing, governance, diagram and detailed forecasting were retained in existing modules and advanced or contextual paths. Today usage sensitivity and pricing controls still compete for attention on Costs. Architecture and governance open as unrelated destinations and the detailed evidence can be difficult to find. The PDF solves a similar problem by showing one estimate first and separating technical findings, evidence and assumptions.

| User question | Existing capability to reuse | Placement and change |
| --- | --- | --- |
| What might it cost? | Estimate summary, readiness, cost drivers, itemised ledger, separate existing licence spend | Default Costs view. Keep the immediate answer and concrete next steps. Disclose detailed bases, forecasting and capacity evidence on demand. |
| What if an input changes? | Usage sensitivity and existing ledger, price forecast rules | Explore changes. Choose one type first, then enter an assumption and compare. Existing saved forecast and meter controls retain their validated paths. |
| What value could users gain? | Optional audience data and reporting hierarchy | Potential value. A short draft flow creates an explicitly accepted plan. Decimal formulas use customer inputs only and stay outside the ledger. |
| What changes with adoption? | Existing Foundry workload estimation and Copilot monthly credits | Explore changes after choosing adoption. The user explicitly selects one workload and states the usage relationship. Without a usable link, show productivity only. |
| What did I design? | Logical graph, SVG and inspector | Contextual Environment Review. Show declared links and open the existing editor for changes. |
| What should I check? | Technical and licence findings, governance rules and policy declarations | Technical fit and Controls within Environment Review. Group findings, keep source links and route to the relevant existing input. |
| Can I share or reopen it? | Executive and Full PDF, strict JSON, local download | Keep Reports & Export. Use accepted value data in exports and keep temporary inputs out. |

## Information architecture

Primary destinations stay Home, Environment Builder, Cost & Value Analysis, Reports & Export and Documentation. Pricing Catalogue stays secondary. The existing `#/costs` route remains the default cost view. Cost exploration and value are local views of Costs. Environment Review is contextual from the builder and reports, with compatible architecture and governance links. No action requires visiting the review before seeing or exporting costs.

```text
Home → Create environment → Guided Builder → Costs → Reports & Export
                                 │               │
                                 │               ├─ Explore changes → Choose one change → Compare → Clear
                                 │               └─ Potential value → Draft → Accept assumptions
                                 └─ Review your design → Architecture / Technical fit / Controls → Existing editor
```

## Screen outline and UX checklist

| Screen | First view | Focused action | Detailed evidence |
| --- | --- | --- | --- |
| Costs | Known monthly cost, annualised estimate, gaps, main drivers | Edit a missing input or open a charge | Ledger, agreements, existing expenditure, saved forecast and capacity |
| Explore changes | Choose usage, prices or adoption | Preview one change; compare and clear | Existing forecast and meter details from Costs |
| Potential value | Brief purpose with a single start action, or accepted results | Audience → activity → realisation → optional financial inputs | Explain assumptions, sources, units and separate expense scopes |
| Environment Review | Model scope and distinct questions to check | Choose architecture, technical fit or controls | Graph register, reviewed evidence, declared status and existing inspector links |
| Export | Pick the PDF format or save editable JSON | Explicit download | PDF appendix and optional accepted value methodology |

- A new user can still create a Foundry or Copilot estimate and export without adoption, governance or an Advanced editor.
- Only one exploration form is visible at a time. Comparing and clearing never change active assumptions.
- Value inputs start blank. A value draft cannot change ledger readiness, forecast data or exports.
- Unknown quantities and rates stay distinct from confirmed zero. Whole-environment differences require resolved charges on both sides.
- Keyboard controls announce selection, provide a labelled focus target and follow a clear order. At 320 CSS pixels and equivalent zoom layouts, horizontal scrolling is confined to labelled tables or diagrams.
- Review findings link back to the existing validated editor. Review statuses distinguish observed evidence, conditional findings and declarations rather than scoring the environment.
- Preserve Stage 6.1 security, current Worker and rollback controls.

## Financial and file design

Use a separate value engine and a validated, optional key for accepted value assumptions. Existing v1 files containing no value data remain valid with the same shape. New value keys, numbers and source notes are validated under the same strict boundary and import limits. Report this additive contract explicitly before implementing it. Old app builds may reject a new file that contains the optional key. No migration of an existing declaration, change to ledger formulas or automatic storage is needed.

Stage 3 uses a temporary clone with explicit workload mapping. A single Foundry usage profile may be projected using the existing workload methods. Copilot uses a customer-declared credit relationship without deriving Microsoft rates. Shared deployments, packages, licence terms and agreements continue through the normal ledger.

## Stage 0 gate

The baseline passed type checking, linting, 110 unit tests and 46 Chromium tests with the published catalogue checks enabled. Production build passed pricing, evidence, documentation and asset security validation. The retrospective is an expert review. The new guided paths will need the separate human study described for Stage 6.
