# Stage 1 · Revised MVP scope

## Product outcome

Enable an enterprise IT or cloud practitioner to model a Microsoft AI environment, understand its likely costs and export a defensible estimate.

The first useful result is a priced estimate for at least one agent or billable item, with any remaining gaps stated alongside the known subtotal. A draft with no price is still useful when it identifies the next input or evidence needed. Users can verify the amount, its billing unit, the source and the assumptions, then share a PDF or save their editable environment as JSON.

## Scope decisions

| Existing capability | Decision | Product behaviour |
| --- | --- | --- |
| Overview dashboard and donut chart | **Defer** default dashboard. **Remove** the duplicate first-screen chart and inventory summary when Home ships. | Home handles entry and resumption. Spend categories and drivers belong in Cost Analysis. The ledger remains the detailed reference. |
| Environment create, resume and rename | **Core MVP** | Explicit creation, a named session, quick rename and a single open workspace. |
| Import and export environment JSON | **Core MVP** | Home makes import discoverable. Workspace keeps JSON download within reach. Reports explains reopening and recalculation. |
| Duplicate and reset | **Simplify** | Offer Duplicate and Start new in the workspace menu. Use the same replacement safeguards as import. Use Start new in place of a second reset action. |
| Environment description, billing region and currency | **Simplify** | Name first. Show inherited defaults visibly during agent setup and allow editing in Settings. Separate Azure billing region, actual deployment region and UK commercial market. |
| Foundry Agent Service and Copilot Studio | **Core MVP** | Explain each platform in plain language and support Foundry, Copilot Studio and combined planning. Show each agent the applicable model and usage path. |
| Model catalogue picker and PAYG deployment | **Core MVP** | Let users search named models, then distinguish version, billing mode, region and price coverage. Preserve exact identity and compatibility. |
| Custom model IDs, geographic restrictions, modality, API features and classic setup | **Advanced** | Keep editable in Advanced and reveal any portion required by a Guided choice or a readiness action. |
| Shared deployments | **Core MVP** | Offer “Use an existing deployment” beside “Create a deployment”. Explain that shared fixed capacity is charged once and each metered workload has its own usage. |
| Usage and standalone usage profiles | **Simplify** | Enter usage beside its agent with a monthly unit and explanation. Retain standalone profiles, reuse and any-order editing in Advanced. |
| Illustrative usage presets | **Core MVP addition** | Offer an explicit, inspectable starting point. Keep fields blank until the user selects a preset. Show exactly what will change if a preset replaces inputs. |
| Cached input, retries, tool calls and downstream invocations | **Advanced** | Group under advanced usage or relationships. Expose the relevant input when the imported or current model already uses it. Keep invocation links descriptive and prevent double-counted traffic. |
| Copilot monthly credit total | **Core MVP** | Explain the credits unit and ask the user for measured or planned monthly credits. Microsoft pricing follows the existing retail resolver. |
| Copilot activity breakout, prepaid packs, included credits and external prompt models | **Advanced** | Reveal these in the applicable agent or supporting service. Preserve explicit eligible allocation, meter and endpoint conditions. |
| Supporting services | **Simplify** | Optional by default. Pick an exact service and enter monthly base units. Support an evidenced manual rate when the exact rate is unknown. |
| New and already-owned licences | **Core MVP** | Ask whether the licence is a new purchase, already owned or unknown and show the relevant quantity. Keep existing monthly spend separate from incremental costs. |
| Groups, seat deduplication, ownership, overlaps and replacements | **Advanced** | Keep scope, assignment and effective dates editable. Make clear that a possible overlap alone leaves existing spend in place. |
| Licence prerequisites and included rights | **Simplify** | Surface the actionable caveat near the affected licence and in estimate readiness. Preserve verified, conditional and unverified evidence with sources. |
| Exact pricing, unknown rates and manual amount | **Core MVP** | Automatically use the applicable verified rate. Label unknown costs explicitly. A user can enter an evidenced rate from the unresolved cost. |
| Agreement discount, fixed rate and included-at-zero | **Advanced** | Simple manual rate remains available from a pricing gap. Put discounts, dates, scope, intentional zero with rationale and restoring retail behind “Pricing agreements”. |
| Forecast and item exceptions | **Advanced** | Place scenario changes in “Compare pricing assumptions”. They remain independent of current totals, contracts and environment objects. |
| Provisioned capacity | **Advanced** | A chosen provisioned deployment reveals PTUs and monthly billable hours. Constraints and missing capacity remain visible from readiness. Keep reservation quotes, allocation, estimates of throughput and PAYG comparison in Advanced. |
| Technical compatibility | **Simplify** | Show evidenced incompatibility and meaningful deployment caveats in context and in readiness. Keep exact evidence status, dates and source. Pricing records establish rates, and compatibility rules establish the technical result. |
| General object relationships | **Simplify** | Put common actions next to the task, such as attach a deployment or assign a licence. Keep the generic relationship editor in Advanced, with outgoing direction and detach behaviour explained. |
| Cost Analysis | **Core MVP** | Known monthly and annual figures, readiness and major drivers appear first. Keep line detail, scopes, quantities, exact sources and audit trail. |
| Logical architecture and SVG | **Defer** standalone navigation. **Advanced** workspace view. | Place “View architecture” in Builder and Reports. Keep the keyboard-operable diagram, text relationship list, SVG and PDF diagram. |
| Security & Governance | **Defer** standalone navigation. **Advanced** advisory view. | Keep policy editing and modelled findings in Advanced and in report detail. Financial readiness surfaces material effects on the estimate. Expose advisory findings separately with evidence and caveats. |
| Reports & Export | **Core MVP** | Separate “Generate PDF estimate” from “Download environment JSON”. Show the applied catalogue and the limitations of the estimate when exporting a partial draft. |
| Pricing Catalogue and health | **Advanced reference** | Secondary navigation. Keep search, inventory, coverage, freshness and health. Link from pricing gaps. Use Cost Analysis for open environment completeness. |
| Field help, education and examples | **Core MVP** | Inline guidance for high-impact inputs, contextual links to Documentation, a searchable hub and four fictional-assumption examples users can open and edit. |
| Pricing ingestion, rollout and operations | **Defer** from user navigation. | Keep maintained beside source code and link to repository documentation from the hub’s “Project and sources” footer. |

“Defer” applies to placement in the default experience. The Stage 2 design preserves the engine, import and export formats, catalogue identities, report evidence, and advanced capability. Module removals are confined to duplicate presentation with an identified replacement.

## Proposed release checks

- A first-time visitor can name an environment, choose one or both platforms and reach either a known subtotal or a clear missing-input action using Guided controls.
- Users can open Advanced immediately and create a valid draft in any order. Switching modes leaves objects, edges, agreements, forecast and selected catalogue intact.
- Users can distinguish missing usage, missing retail, conditional evidence and optional blanks without interpreting object counts or colours.
- A known subtotal that excludes unresolved charges carries the same warning in Cost Analysis and the PDF. A genuine £0 includes its basis.
- Users can distinguish what a new solution adds from what their organisation already pays. Cost Analysis exposes existing, incremental and proposed spend with separate scopes and reconcilable totals.
- A previously saved JSON file with advanced relationships, agreements and forecasts remains editable and re-exportable. Existing scenario, catalogue and report checks remain release gates.
