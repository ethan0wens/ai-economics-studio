# Stage 1 · Documentation Hub plan

## Purpose and entry points

Documentation is a primary destination in the studio. It answers the next task for a first-time practitioner and gives an evidence trail to a reviewer. It is available before creating an environment. Home links to the quickstart and examples. Field help links to the relevant section of an in-product article. The remaining direct Microsoft links are clearly identified as source material. Articles link to the corresponding public tool view or return location without carrying any environment data.

The hub has nine section indexes with short descriptions. Link “Project and sources” in its footer to repository documentation, reporting issues, source coverage and the licence. Release workflows, contributor setup, internal fixtures, evidence selectors and maintenance failures belong in repository materials. The in-product hub explains what public evidence means for the user's estimate. [Field guide](13-field-guide.md) · [Source and review rules](23-maintenance-automation.md)

## Article inventory and content sources

Slugs below are stable public IDs. A section index links to its articles and exposes common first tasks. The names and paths are proposed for Stage 2.

| Section | Article slug and display title | Required content and maintained source |
| --- | --- | --- |
| Getting started | `quickstart` · Create your first estimate | Four-minute walkthrough from named environment to PDF and JSON. Lead with the two output types. Use one illustrative Foundry agent. [Studio journeys](26-stage-1-information-architecture.md) |
| Getting started | `choose-platforms` · Choosing Foundry, Copilot Studio or both | Explain likely user tasks, billing units and the combined path. Distinguish platform from model and credit from token. [Compatibility guidance](07-governance-and-compatibility.md) |
| Getting started | `save-and-reopen` · Save, import and reopen | JSON only for editable work, replacement decisions, import errors, current pricing and source snapshot differences. [JSON contract](03-domain-model.md) |
| Building environments | `guided-and-advanced` · Two ways to build an environment | Explain freely ordered steps, optional skips, drafts, editing imported advanced inputs and switching views. [Builder specification](27-stage-1-screen-specifications.md) |
| Building environments | `agents-and-models` · Add agents and model deployments | Model pick and reuse. Explain actual deployment versus billing region, version and available price. Include a diagram of the common links. [Foundry review](22-ptu-and-foundry-review.md) |
| Building environments | `foundry-usage` · Estimate Foundry requests and tokens | Runs, calls, input and output, cached tokens, retries and separate workloads. Worked arithmetic with fictional quantities. [Pricing formulas](04-pricing-and-tco.md) |
| Building environments | `copilot-credits` · Estimate Copilot Studio credits | Monthly total vs activity split, eligible usage and pool order, external prompt paths. Link Microsoft’s current conversion tables. [Copilot billing and evidence](18-licensing-and-technical-evidence.md) |
| Building environments | `licences-and-groups` · Add licences and assign seats | New, owned and unknown procurement, distinct seats, assignments, and role and workload assumptions. [Licensing evidence](18-licensing-and-technical-evidence.md) |
| Building environments | `supporting-services` · Estimate Azure supporting services | Exact meter, base quantity vs billed unit, separate components, manual rate and tier scope. [Retail reference](14-retail-catalogue.md) |
| Building environments | `share-and-connect` · Reuse and connect resources | Links and their direction, a shared fixed model charge, separate PAYG usage, dependencies and safe deletion. [Domain model](03-domain-model.md) |
| Understanding costs | `read-your-estimate` · Read the cost summary and ledger | Known monthly, annual run-rate, missing counts, cost drivers, filters, detailed units and report reconciliation. [Calculation method](04-pricing-and-tco.md) |
| Understanding costs | `estimate-readiness` · Resolve gaps before sharing | Four readiness categories with direct task links and examples of priced-but-conditional and unpriced-but-compatible. [Screen specification](27-stage-1-screen-specifications.md) |
| Understanding costs | `existing-and-new-spend` · Separate existing and new costs | Existing, incremental, retained and proposed scopes, effective replacements and declared spend. [Worked reconciliations](19-enterprise-financial-validation.md) |
| Understanding costs | `agreements-and-manual-rates` · Use a contract or manual price | Fixed prices, percentage discounts, scope, dates, intentional zero with reason and restoring current verified retail. [Agreement precedence](04-pricing-and-tco.md) |
| Understanding costs | `forecast-scenarios` · Compare a price forecast | Separate forecast, item exception precedence and fixed-rate opt-in. Show concrete positive and negative changes. [Forecast method](04-pricing-and-tco.md) |
| Worked examples | `example-foundry-assistant` · Basic Foundry assistant | Measured quantities, input/output costs, tutorial edits and editable copy. [Example definitions](27-stage-1-screen-specifications.md) |
| Worked examples | `example-copilot-agent` · Copilot Studio business agent | Credits-only default path and eligible pack or allowance exploration. [Example definitions](27-stage-1-screen-specifications.md) |
| Worked examples | `example-existing-licensing` · Enterprise licensing | Existing/paid costs, coverage prerequisites and an Azure service. [Example definitions](27-stage-1-screen-specifications.md) |
| Worked examples | `example-shared-deployment` · Shared model deployment | One PTU-hour charge, separate workloads and allocation. [Example definitions](27-stage-1-screen-specifications.md) |
| Pricing and evidence methodology | `pricing-sources` · Where prices come from | Azure Retail Prices API, Microsoft UK offers, term/VAT, rates, markets and dates. Distinguish customer-entered values. [Catalogue and evidence](05-catalogue-and-evidence.md) |
| Pricing and evidence methodology | `coverage-and-freshness` · Coverage and catalogue health | Supported denominators and current environment completeness, freshness, expiry and last good fallback. Render current data from validated public assets. [Catalogue coverage](16-catalogue-scope-and-maintenance.md) |
| Pricing and evidence methodology | `licence-evidence` · Understand licensing evidence | Verified inclusion, prerequisites, customer-owned coverage and workload limits. [UK gap review](21-uk-licensing-gap-review.md) |
| Pricing and evidence methodology | `model-evidence` · Understand deployment and capability evidence | Exact model and region, review dates, compatibility states, capacity and retirement. [Foundry evidence](22-ptu-and-foundry-review.md) |
| Technical reference | `billing-units` · Billing units and quantities | Token scales, credits, seat/month, hours, PTU-hours, and graduated bands. Pull current scoped examples from catalogue data and disclose component caveats. [Retail billing scope](14-retail-catalogue.md) |
| Technical reference | `deployment-availability` · Supported offerings and regions | Link searchable catalogue and dated machine-derived summaries for exact versions, geography and evidence status. Explain that a rate does not establish availability. [Model scope](22-ptu-and-foundry-review.md) |
| Technical reference | `ptu-and-reservations` · Size and price provisioned capacity | Model-specific minimum and increments, reference throughput, monthly hours, quote allocation and comparison assumptions. [Provisioned sizing](22-ptu-and-foundry-review.md) |
| Technical reference | `architecture-and-controls` · View architecture and governance | How to read the logical graph and text register, governance based on declarations, source and control scope. [Architecture and PDF](08-architecture-and-pdf.md) · [Governance](07-governance-and-compatibility.md) |
| Technical reference | `environment-file` · Environment file reference | JSON version, limits, object kinds and source snapshot at a practical level. Link source schema and contributor docs for integration details. [Domain model](03-domain-model.md) |
| Troubleshooting | `missing-rate-or-volume` · An amount is missing | Find missing quantity or billing identity, stale data and expired evidence. Use exact source unit and customer price where supported. [Retail rules](14-retail-catalogue.md) |
| Troubleshooting | `import-or-export-problems` · Problems with files and downloads | 2 MB limit, supported schema, broken links, safe cancellation, PDF failure and browser download permissions. [Operations notes](12-operations.md) |
| Troubleshooting | `unexpected-total` · My estimate changed | Current catalogue vs saved snapshot, shared charges, expired agreements, known vs complete and existing cost scope. [Reconciliation](19-enterprise-financial-validation.md) |
| Privacy and limitations | `privacy` · What stays in your browser | In-memory environment, explicit downloads and same-origin public assets, navigation privacy, sensitive content and handling shared files. [Architecture and trust boundary](02-architecture-and-deployment.md) |
| Privacy and limitations | `limits-of-an-estimate` · What the estimate covers | Independent tool, modelled integration and controls, tax/currency/terms limits, quota and throughput and estimate readiness versus a quote. [Scope and terms](01-product-and-scope.md) |
| Glossary and FAQs | `glossary` · Glossary | Stable anchors for token, cached input, SKU, PTU, PTU-hour, Copilot Credit, meter, billing market, run-rate, licence entitlement, estimate readiness and others needed by fields. |
| Glossary and FAQs | `faq` · Frequently asked questions | Why two usage units, how to keep work, when prices change, why numbers are unknown, and how to model a shared deployment or already-owned licence. Link to full articles. |

## Writing and interaction rules

- Each article begins with the question it answers or action it enables. Add prerequisites only where needed, clear steps, a worked example, a genuine limitation or evidence note where needed, and the next action. Use two or three related articles based on the task. Use a page heading, a short contents list for longer articles, visible keyboard focus and meaningful link text. Tables have captions and headers. Illustrative inputs are explicit.
- Search runs locally against titles, aliases, summaries, headings and relevant terms. Prefer title and exact glossary matches, then keyword matches in the body. Include “cost”, “license/licence”, “Copilot credit”, “SKU”, “provisioned units/PTU” and “already owned” as aliases. Results list article, section and a short relevant snippet. A labelled input, Clear search, Enter and normal Tab order are sufficient. A short polite status announces updated result counts. Empty results suggest a matching topic or browsing the index. Search text stays in the tab.
- Desktop has the article column and optional in-page contents. Mobile uses breadcrumbs, one reading column and a collapsed topic/heading index. Targets should remain easy to operate and visible when focused. A missing slug shows “Article unavailable” with **Search documentation** and **Browse topics**, with the title focused. A known legacy slug or heading maps through an explicit alias to the canonical link.
- Deep links use the route and stable heading identifier. Copy article link copies only the public route, with feedback. Contextual links can retain an in-tab back target for the edited field. Documentation opened directly works without a workspace. A link to a Microsoft source is labelled as such. Text explains essential choices without requiring users to open help.

## Contextual help mapping

| Control or reason | In-product deep link | Essential nearby copy |
| --- | --- | --- |
| Home import / retain edits | `save-and-reopen#restore` | JSON restores the editable environment and current prices may differ. |
| Platform and model reuse | `agents-and-models#reuse` | One shared deployment can serve multiple agents. |
| Billing region and actual region | `model-evidence#billing-and-deployment` | Billing market determines the applicable rate, and actual region determines availability. |
| Foundry runs, cached input, token units and retries | `foundry-usage#per-request` | Enter monthly runs and per-request quantities. Include retries once. |
| Monthly credits, plan and allowance | `copilot-credits#monthly-credits` | Enter known or planned credits. Apply an eligible allowance only with a declared basis. |
| PTU capacity and reserved hours | `ptu-and-reservations#capacity-and-hours` | Charge once per deployment. Published sizing and customer capacity are separate. |
| Procurement, seat overlap and replacement | `licences-and-groups#distinct-seats` and `existing-and-new-spend#replacement` | Count distinct seats. Existing spend changes when a documented replacement takes effect. |
| Rate, billed unit or missing source | `billing-units#base-and-billed-units` and `missing-rate-or-volume#rate` | Use the rate’s exact unit. An unknown amount is excluded from known costs. |
| Agreement, zero and scenario exception | `agreements-and-manual-rates#precedence` and `forecast-scenarios#exceptions` | The forecast is independent. An intentional zero needs a reason. |
| Readiness notice, estate and PDF status | `estimate-readiness#partial-estimates` | A partial estimate can be shared with its scope and gaps. |

The shorthand above maps to the actual `?section=` route. Maintain the link at the field registry and readiness reason level. Reuse field labels and units from the registry where practical. Keep source links as article citations or an additional help link. [Current field registry](../src/field-help.ts)

## Versioning, generation and release checks

1. Store authored articles in version-controlled user-doc assets with slug, section, title, description, aliases, search terms, related links, stable heading IDs and a review date. Maintain editorial review and release revision separately from live evidence dates.
2. Generate catalogue-driven coverage, pricing units and exact regional reference snippets from the same validated manifest, inventory and evidence already available to the build. Publish as static data or use the existing same-origin catalogue fetch where live adoption matters. A generated section displays its snapshot ID, review date and caveats. An unavailable snapshot leaves narrative guidance and a clear reference status. Keep the existing pricing and evidence pipeline as the authority.
3. CI validates article schema, identifiers, aliases, heading uniqueness, internal links, help targets and deterministic reference generation. Test no-results and missing articles. Release checks cover overdue authored reviews and pricing claims that copy dynamic figures into prose. Probe allowlisted external source links in a periodic read-only check with throttling, retries and reports. Same-origin link failures and malformed generated data fail the docs check. Changed or temporarily unavailable external sources enter the existing evidence review process when relevant.
4. Keyboard walk the table of contents, related links, search, context return and narrow reflow. Apply automated accessibility checks to search, an article with a table and an empty state. Check the hub makes no customer data requests or browser storage writes. Keep raw catalogue records, mismatched audit claims and live verification dates traceable to public source data. [Acceptance baseline](09-acceptance-and-release.md)
