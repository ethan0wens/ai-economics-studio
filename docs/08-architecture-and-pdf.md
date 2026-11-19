# Architecture and browser-generated PDF

## Choose a report

**Executive Summary** is a short stakeholder report. It covers the modelled environment, monthly and annualised estimates, pricing bases, known cost drivers and items requiring review. **Full Report** is the default. It adds a contents page, logical architecture and registers, financial line items and evidence for technical, licensing and governance findings.

Both formats use the same applied workspace and ledger snapshot as Cost Analysis and JSON export. Temporary usage previews stay outside the report. Generation and download run locally in the browser. The file records an estimate for planning and review.

## Read the financial pages

Retail baseline uses exact published rates. Current estimate incorporates applicable customer agreements and declared rates. Price forecast changes rates using the configured assumptions at the same usage. Annualisation applies the modelled monthly usage and rates for 12 months. Existing and incremental licences have separate scopes. Proposed environment spend includes retained licences where declared.

The category chart shows shares of known monthly costs. Unresolved charges are excluded from the bars and percentages and shown as counts. A partial result is labelled a known-cost subtotal. When every charge is unresolved, the subtotal reads **Unknown**. A zero known subtotal has no share bars. A provisioned-versus-PAYG comparison evaluates modelled expenditure at the declared usage. Throughput and suitability require separate validation.

In the Full Report, each ledger charge has an identifier that connects its itemised row to billing units, price bases, agreement treatment, source, effective date and relevant allocation or tariff detail. Shared fixed deployment costs have a single charge. Numbered references resolve to deduplicated plain-text addresses. Report generation, catalogue refresh and evidence review dates describe separate events.

## Read the logical architecture

The PDF and interactive SVG use the same projection of typed environment objects and relationships. Arrows in the PDF point from the source to the target. Type labels, shared markers and review states carry meaning alongside colour. Long labels point to the complete names in the component register. Dense environments use a grouped relationship overview followed by a complete component and relationship register at readable size. Environment-level links also appear in the register.

The diagram represents a declared plan. Validate actual deployment topology, network connectivity, security boundaries and compatibility independently. On the web, click or use the keyboard to inspect nodes. The web view also provides an accessible table.

## Layout and accessibility

The Economic Signal vector mark, navy cover, compact page headers, Cloud Professional colours, embedded fonts, A4 portrait and landscape templates, repeated table headings and numbered pages give both formats consistent print layouts. Text is selectable and searchable. Full Report provides a printed contents page. This format has limited screen-reader table semantics and carries neither tagged PDF structure nor PDF/UA certification. Some unsupported scripts and emoji appear as a replacement glyph. The editable JSON retains the original characters.

The [technical reference](technical/01-workspace-flow.md#diagrams-and-report-flow) explains implementation and the [report audit](34-pdf-report-redesign.md) gives visual review commands.

## Accepted value and illustrative comparisons

Accepted value assumptions appear as a distinct potential-outcomes section in both formats. Known AI expenditure and unresolved charges come from the existing ledger. Productivity capacity, economic equivalent and declared cashable savings have separate rows. Full Report includes the customer assumptions and their provenance, the method and separately declared costs.

In Explore changes, use Include comparison in Full Report to add one illustrative adoption comparison. This explicit choice is temporary. It applies to the current environment and price catalogue, stays outside JSON and is available to remove before downloading. The report labels the monthly results and any customer-assumed usage link.
