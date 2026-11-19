# 06 — UI/UX and design system

## Approved direction: Cloud Professional with Economic Signal

Professional, restrained, light-first SaaS tooling; do not imitate the Azure Portal. Visually consistent with PDF report. Tokens in `design/tokens.json` are authoritative. See the [Economic Signal specification](../design/brand/README.md) for the supplied mark, Home and navigation treatments, browser icons and report identity.

- Canvas `#F7F9FC`, white surface `#FFFFFF`, deep navy primary text `#17243B`, blue action/selection `#2563EB`, border `#E2E8F0`, muted text `#56667C`.
- Semantic success `#16836B`, warning `#D97706`, critical `#DC3545`. Unknown/unpriced is neutral, not a fake success or automatic failure.
- Typography **Inter or Geist** with safe system fallback; self-host only licence-compliant assets if included, do not load Google fonts at runtime. Use tabular numerals for currency, usage and token counts.
- Rounded card/panel corners 8–12px; subtle borders and restrained shadows; spacious desktop, compact mobile; no excessive gradients/glassmorphism; no colourful summary/recommendation boxes.
- Use a consistent, accessible cost category palette for model inference, platform orchestration/credits, licensing, supporting services and governance. Category colours also appear in the chart legend, diagram and PDF; always include a textual label/icon, never convey meaning by colour alone.
- Dark mode is **deferred**, but use tokenized CSS variables that support it later.

## Navigation (MVP)

`Home | Environment Builder | Cost & Value Analysis | Environment Review | Reports & Export | Documentation`

Pricing Catalogue is a separate reference link. Environment Review groups Overview, Architecture, Technical fit and Controls.

Keep current environment name and `Not exported` status visible. Prominent `Export JSON`, `Add object` and contextual `Import JSON` where appropriate. Show independent project disclaimer without overwhelming primary content.

## Environment Builder — inventory first

Desktop:

```
┌───────────────────────────────────────────────────────────────────────┐
│ Sidebar  │ Environment title / Import / Export JSON / Add object      │
│          │ [Known monthly subtotal] [Incomplete costs] [Object count]│
│          ├────────────────────────────────┬──────────────────────────┤
│          │ Search / filter                │ Inspector (selected item)│
│          │ Model deployments              │ Configuration            │
│          │   - GPT Production             │ Usage                    │
│          │ Agents                         │ Dependencies             │
│          │   - HR Knowledge Agent [draft] │ Costs                    │
│          │ User groups                    │ Contextual actions       │
│          │ Resources / licensing / policy │                          │
└───────────────────────────────────────────────────────────────────────┘
```

Mobile: collapsible navigation, inventory then inspector as full-width drawer/page, keyboard/screen-reader-friendly, no horizontal overflow for key forms. No fixed creation order: `Add object` can create any category at any time. Empty state invites creation/import, not step 1 of a wizard.

Object rows include icon, name, platform/type, small status, dependency indicator and cost or unknown status. Incomplete objects use calm neutral/amber messages; do not colour everything red.

Inspector tabs and flows:

- **Configuration**: name, platform, region, SKU/model mode, source and licensing. Agent model-source choices depend on actual supported platform integration. Existing deployment selector shows name, model, region, billing/capacity and compatibility; create-new inline action is optional convenience, never mandatory order.
- **Usage**: input/output tokens, calls, users/interactions, retries, consumption units; all assumptions clearly user-entered or marked illustrative.
- **Dependencies**: clickable list of linked objects; explain missing links, compatible candidates and safe unlink/rebind actions.
- **Costs**: current baseline, contract override type/amount, scenario, live line item table, provenance and unknown states. Readable costs not hidden in tooltips.

Use clear dialogs for deletions/relationship detach. Preserve keyboard focus after mutations. Don't auto-delete dependents.

## Pricing override interaction

Each line/rate shows `Source: Latest catalogue` by default and an `Edit price` action. Editor offers: `Catalogue`, `Discount (%)`, `Fixed contractual rate`, `Included at £0 (requires explanation)`. A separate `Forecast` control offers global percentage plus per-item exceptions. Show current retail, present-day contract, future forecast and maths. Highlight overrides, allow reset to catalogue and explain catalogue refresh behavior. No invalid blank value treated as zero.

## Other pages

- **Overview**: known monthly cost, incomplete cost count, annual run-rate, category chart, major drivers, incomplete objects list. If incomplete, do not claim definitive TCO.
- **Architecture**: clean top-down logical diagram `User groups → Agents → Model deployments → Supporting resources`, with a governance/security band; select diagram nodes to open inventory inspector, export as SVG/report image. Avoid network icons suggesting actual deployment.
- **Cost Analysis**: ledger with filters by object/category/month/source, baseline vs contractual vs projected comparison, price-provenance details, shared-charge allocation explanation.
- **Security & Governance**: summary of recommendations, rule rationale, applicability and action; advisory not certified compliance.
- **Reports & Export**: concise export configuration, PDF preview (if practical), JSON save/import, price catalogue version and assumptions.

## Accessibility and interaction

Target WCAG 2.2 AA where feasible: semantic inputs and tables, keyboard navigation, focus rings, dialogs, screen reader labels, contrast, colour + text state, chart alternatives, reduced motion. Formatting UK default but currency/region configurable where catalogued. Display dates with timezone and source certainty.

## Initial UX restrictions

No first-visit login prompt, no automatic sample environment masquerading as user's data, no tutorial gating, no dark theme implementation until product basics complete. Sample/demo content only on explicit user action and conspicuously labelled **illustrative**.
