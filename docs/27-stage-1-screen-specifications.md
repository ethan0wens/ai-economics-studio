# Stage 1 · Screen specifications

Use the Cloud Professional palette and self-hosted Inter. Build around a clear heading, a short explanation where needed, one primary action per task and sufficient room for forms. Keep useful data as lists or accessible tables. Use navy text, solid blue for actions and semantic states with text labels. Keep tabular numerals for amounts. On desktop give the main reading or editing column priority. At narrow widths stack sections, use a full-page editor where appropriate and let tables scroll inside a labelled region. At 320 CSS pixels and 200% zoom the page itself should reflow. Target 44 by 44 CSS pixel touch areas for primary actions and at least the applicable WCAG 2.2 AA minimum for other targets. Focus must stay visible below sticky elements. [Cloud Professional tokens](../design/tokens.json)

## Home

**First-visit copy**

> **Plan and estimate a Microsoft AI environment**
>
> Model the agents, usage and services you expect to run. Review your likely costs and share an estimate with the assumptions behind it.
>
> **Environment name** · e.g. Internal support assistant
>
> **Create Environment** · **Import Existing Environment**
>
> Browse example environments
>
> - **Model your setup** · Plan with Microsoft Foundry, Copilot Studio or both.
> - **Understand the costs** · See the known spend and what still needs evidence.
> - **Share your estimate** · Download a PDF or save an editable JSON file.
>
> Your work stays in this browser tab. Download JSON to reopen it later.

Place the value statement first and the create/import form before the capability summaries. Use a short row or a vertical list for the three summaries. Link the privacy guidance from the local-storage explanation. When a workspace exists, replace the entry form with a resume block showing its name and export state. Keep Start new, Import and Browse examples subordinate. Open the new-name form only when Start new is chosen. A blank or whitespace-only name shows “Enter an environment name” by the input and focus stays there. Use a label and on-submit validation, so Enter works from the name. Send file validation errors to the import action, with details expandable. Home shows entry or resumption with no dashboard content.

**Acceptance** · At 390 × 844, the name, Create and Import are reachable from the first view without going through another panel. A valid create or import opens the intended path. A working draft can go Home and return unchanged. No environment is created until the user acts.

## Guided Environment Builder

Use a single task column. A short labelled step list shows the current step and which others have gaps. Desktop can place the list alongside the active task within the page, with the product rail at the far left. Mobile uses a compact “Step 3 of 5 · Estimate usage” heading and a disclosure for the other steps. Keep “Switch to Advanced” and “Review estimate” available with the same location and wording throughout.

| Step | What appears by default | Conditional states and actions |
| --- | --- | --- |
| Platforms | Foundry, Copilot Studio and Both options, each with one sentence explaining the calculation unit. The optional planning choice can be changed later. | Show editable billing region and currency before choosing rates. Group billing market, billing region and actual deployment region under labels that explain their separate purposes. |
| Agents and models | Each agent’s name and platform. Foundry linked model flow offers **Create deployment** and **Use an existing deployment** in the same task. An agent list allows adding or editing multiple agents. | The model picker searches exact available inventory and discloses version, deployment mode, region and price coverage in its results. Show why an evidenced incompatible option is unavailable and allow an unresolved draft where supported. Selecting a model records its exact offering and does not invent an actual deployment geography. Copilot uses the supported platform-managed path. Explain how specialised external prompt use can be configured in Advanced. |
| Usage | Per agent, explain “workflow runs”, “model requests per run” and “tokens per request” before asking for Foundry values. Show a monthly total with the derived input/output totals where resolvable. Copilot asks for monthly Credits, with a link to Microsoft methods. | Creating usage from the agent creates or updates its linked profile. A reusable profile option is available in Advanced and marks all affected agents before editing. Provisioned models ask for PTUs and monthly billable hours once on the deployment. Show verified sizing constraints and a link to Advanced capacity. Keep cached inputs, retries, Copilot activity breakdown and eligible credits behind **More usage options**. |
| Licences and services | Two sections with **Add licence** and **Add supporting service**, then **Skip for now**. Ask **Already owned**, **New purchase** or **Unsure** and show applicable seats or optional actual existing spend. Services take a selected meter and a quantity with visible base units. | Show eligible prerequisites and unresolved manual prices beside the affected item. Bulk assignments, repeated seats, replacement and precise service scope open Advanced. An empty section says what to add and why. Choosing Skip keeps an existing licence or service. |
| Review | Show known monthly and annual amounts from the same Cost Analysis summary, then readiness, then **Open Cost Analysis** or **Generate PDF estimate**. Display that partial exports retain known gaps. | If there is no priced line, name the next input. If several blockers exist, show the first by task with links to the rest. Validation distinguishes quantity, price and evidence actions. Revisiting a step keeps existing inputs. |

Offer presets only from an explicit **Apply illustrative usage** action. The first Foundry preset proposes 1,000 runs/month, 1 request/run, 1,500 input and 300 output tokens/request. The first Copilot preset proposes 12,000 credits/month as an illustrative entered total. Neither asserts typical traffic, usage conversion or eligibility. Preview exact replacement values before applying to a filled form. Show **Illustrative inputs** on the preset result while the session can substantiate it. Include any user-retained illustrative assumption through a short, user-reviewable environment description. A manual change updates the display of assumptions and never silently overwrites another workload.

**Acceptance** · Users can configure a linked Foundry agent without leaving Guided to create a deployment or usage profile. Copilot shows the credit input immediately after choosing the platform. Required quantities start blank, presets are opt-in, switching away and back preserves values, skipping does not falsely mark anything priced, and the combined environment keeps both usage models distinct.

## Advanced Environment Builder

Reuse the inventory and exact object editor. Use search, type filter and a single contextual **Add** with human labels such as **Model deployment**, **Licence** and **Supporting service**. Keep editing in a single focusable pane. On desktops with adequate width an inventory column and inspector are sufficient. On smaller screens opening an item navigates to a full-width inspector with **Back to inventory** that restores filter, scroll and selected item. Key groups are **Configuration**, **Usage** when relevant, **Connections** and **Costs**. Use local disclosure such as **Deployment details**, **Capacity and reservation** and **Agreement details** instead of a second global detail selector. An active imported value or targeted readiness link reveals its specific section. Common connections appear as field-level “Attach”, “Change” and “Unlink” actions. The general relationship editor remains available under Connections.

Show optional, missing and unknown separately. Use “Needs input” for a draft field and “Rate unavailable” for pricing with entered usage. Keep recovery links for stale or incompatible imported selections. Show the exact impact before changing a shared deployment or unlinking. Delete lists links that will detach and preserves the linked objects. Place Architecture and Security & Governance under **Review this environment**. The diagram retains its keyboard nodes, text alternative and SVG export. Governance remains advisory and links to the relevant declaration or policy.

**Acceptance** · Existing JSON imports with relationships, scoped discounts and forecast exceptions have editable fields in Advanced. An unrelated change or mode switch preserves hidden values. Creating any object first still works. Selecting a particular record on mobile brings its first relevant editable field and title into view. Unlink and delete preserve dependent objects and expose resulting gaps.

## Cost Analysis and Estimate readiness

**First screen.** A single summary presents **Known monthly cost** and **Known annual run-rate**, with the applied pricing basis and timestamp nearby. Say “No priced costs yet” if there are no resolved billable lines. Where anything remains unresolved, show “This estimate excludes 3 unresolved cost lines” or the correct count, next to both amounts and before report actions. A true calculated or deliberately covered zero states its basis. “Annual run-rate” means twelve times the current known monthly figure, with timing and commitments in the detail. When an estate is modelled, open **New costs and existing spend** to show new charges, declared existing licence spend, retained spend after effective replacement, and proposed estate/environment exactly as provided by the ledger. Scope labels must stay directly beside the values.

**Estimate readiness** follows the top summary and appears in builder Review. The groups are:

| Group | Default treatment | Destination |
| --- | --- | --- |
| Missing setup or workload | Lead with affected item and task, such as “Enter monthly credits for Support agent”. Group repeated lines from the same unresolved cause and show the line count. | Focus the exact field or contextual editor. |
| Price unavailable | Show unit and applicable billing scope. Explain that the current total excludes it. | Open the corresponding cost details and manual rate when the billing identity is known. Otherwise go to the missing identity input. |
| Deployment and licensing | Separate evidenced conflicts from conditional and unverified evidence. Label any effect on costs independently. Show the relevant action, such as confirm seat assignment or review an unsupported region. | Open the exact object and subsection, preserving evidence source and review date. |
| Optional advisory | Collapsed advisory and successful evidence summary. A conditional quota check can remain with cost resolved. | Open contextual architecture or Security & Governance as appropriate. |

Show the top three unresolved tasks with **View all** and present each reason, impact, action and dated evidence where available. Link to the affected edit or cost line and allow an immediate return to the readiness list. If there are no unresolved modelled cost lines, say “All entered billable costs are resolved”. Qualification and modelled scope remain visibly distinct from completion.

**Cost drivers and ledger.** Show amounts for inference, orchestration/consumption, licensing, infrastructure and modelled governance where applicable. Use category names users recognise and keep existing source categories in expanded detail. Rank the top three drivers by known current amount, show the denominator and disclose missing components per category. Include exact line filtering below. Each opened line includes basis, quantity, billed unit, price, provenance and agreement. Forecast and contract comparison start collapsed unless the user opens them or has active differences, in which case a short summary states the active adjustments with an “Open comparison” action. Applying filters changes the visible lines and leaves summary totals stable.

**Acceptance** · Empty, all-unknown, partial, explicitly zero and complete cases have distinct language. The same scoped totals and unresolved counts reconcile in Review, Cost Analysis, JSON and PDF. Users can fix a missing Copilot amount from readiness in one navigation action. A known price alongside a conditional licence or quota finding retains both facts. Existing and proposed scopes are legible without opening the raw ledger. Forecast edits leave the current estimate unchanged.

## Reports & Export

Place **Generate PDF estimate** and **Download environment JSON** beside brief descriptions of their purpose. Show environment name, applied catalogue date, monthly/annual known subtotal and unresolved count, plus a link back to readiness. Provide an architecture preview link beside report detail. Enable draft PDFs for incomplete environments and explain what is excluded before generation. With an empty named workspace, advise adding an agent or billable item before creating a PDF. JSON remains a way to save the empty workspace. Announce download initiation and generation errors next to the initiating action. In PDF place the estimate scope, current basis, known amounts and gap count up front, followed by input assumptions, itemised evidence, logical architecture and applicable advisories.

**Acceptance** · The user can distinguish the editable JSON from the PDF, generate both with keyboard alone and reopen the JSON. A draft PDF retains the exact known subtotal and unresolved charges. PDF export leaves the JSON export state intact. Invalid import and failed PDF generation preserve open work.

## Example library

Place a quiet **Browse example environments** link on Home and an **Explore an example** link early in Guided. Preview on a separate screen with the learning objective, objects, assumptions and two tasks to try. Show **Fictional planning inputs** before any amounts. Display a live price preview only through the applied validated catalogue. **Open editable copy** instantiates one fresh environment with unique IDs and uses the replacement guard. Open Review first, with links into the relevant Guided or Advanced editor. Allow rename, modifications and JSON export. Code should use versioned example definitions under application data, with a separate path from test fixtures. A missing offer produces an open pricing gap with its former expected scope. Examples must open cleanly if the pricing definition is missing or expired.

| Example | Objects, links and fictional assumptions | What to try and learn |
| --- | --- | --- |
| **Basic Microsoft Foundry AI assistant** | One Foundry linked agent, one GPT‑4.1 mini Global Standard text deployment (`gpt-4-1-mini-global-uksouth`, version `2025-04-14`, illustrative actual region UK South), one usage profile. Agent links to both. 1,000 runs/month, 1 request/run, 1,500 input and 300 output tokens/request. No additional licence purchase is modelled. | Change runs to 2,000. Inspect the separate 1.5M input and 300k output token quantities before the change, then confirm both double. Find the exact unit and source for each amount. |
| **Copilot Studio business agent** | One platform-managed Copilot agent using UK South PAYG (`copilot-payg-uksouth`), with 12,000 monthly credits entered as a fictional measured total. No external model, prepaid pack or separate allowance is assumed. | Change the total to 15,000 and inspect billed credits. Explore an optional Advanced pack link or documented allowance only when evidence supports it. The standard path has one credit charge and no independent Foundry inference line. |
| **Enterprise AI with existing Microsoft licensing** | One Copilot agent, one user group with a population and intended audience of 200 and 120 active users, an existing 200-seat Microsoft 365 E3 licence line (`m365-e3-gb`), a proposed 40-seat Microsoft 365 Copilot add-on (`m365-copilot-enterprise-gb`) and one Azure AI Search Basic supporting resource (`search-basic-uksouth`) at 240 search-unit-hours/month. Group has access to the agent and links to both licences with 200 and 40 assigned seats respectively. Agent links to the resource. Use 18,000 credits/month and fictional declared existing spend of £4,000/month. The 40 add-on assignments are within the declared E3 coverage. No replacement, included credits or specific Search integration licence is inferred. | Compare incremental spend with the proposed environment including retained E3 spend. Open the licence prerequisite evidence. Lower the base assignment below the full declared group size and inspect the resulting finding. Existing spend remains until an explicit, effective replacement is modelled. |
| **Multiple agents sharing one model deployment** | Two Foundry agents, one shared Global Provisioned deployment (`openai-global-ptu-uksouth`) of GPT‑4.1 `2025-04-14` in UK South, two profiles each linked to its agent. 15 PTUs × 400 monthly hours = 6,000 PTU-hours. The profiles have 6,000 and 2,000 runs respectively, each 1 request/run, 1,600 input and 300 output tokens/request. The profiles are for attribution. No reservation or additional licences are modelled. Customer quota and capacity remain conditional. | Count one fixed charge. Enable the optional allocation and see the cost attributed 75/25 without changing the subtotal. Unlink one agent and inspect the readiness change. Explore rate provenance and precise PTU sizing separately. |

All quantities, group details and customer spend above are fictional. The retained identifiers are reference inputs for testing against the applied catalogue. Resolve any new incompatibility or retirement against current evidence rather than silently substituting another offer or rate. Carry the example’s fictional assumptions in the environment description so they survive JSON export within the existing schema.

**Acceptance** · All four examples have previews and can be opened into fresh, editable copies. An example cannot replace unexported work without user confirmation. Invalid, missing or expired provider evidence remains visible. The shared example creates one capacity line and the enterprise example separates existing and incremental cost. No example or preset silently populates a blank workspace.

## Documentation Hub

Use the audience-facing routes and article inventory in the [Documentation Plan](28-stage-1-documentation-plan.md). The Hub opens with a labelled search and a small set of common tasks and topics. An article opens in a readable column with breadcrumbs, optional heading navigation, related articles and date/version. Use the same left navigation and a single column on mobile, with the topic list in a disclosure or separate index. Preserve workspace state while reading.

**Acceptance** · Search finds “PTU”, “credits”, “SKU” and “already owned” with useful results. A topic and its deep section link can be shared and read without a workspace. Keyboard users can navigate to a heading, follow context links and return to the edited field. Missing article and no-result states offer two concrete ways forward.
