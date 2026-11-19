# Cost and value implementation gates

## Stage 1 · Costs and temporary comparisons

Costs stays the default at `#/costs`. It retains the running estimate, actions, drivers, licence scopes and the itemised ledger. A focused disclosure contains the saved forecast and provisioned-versus-PAYG comparisons. Price agreements and meter exceptions still use the existing line editor.

Explore changes asks for a change type before showing a form. Workload usage previews an eligible input at current rates. Prices uses the existing ledger forecast basis for a global temporary adjustment, preserves current agreements and excludes fixed contract adjustments and saved forecast exceptions from the preview. Both paths report monthly values and unresolved counts. Monthly and annualised differences require priced charges on both sides. JSON and PDF continue to use the accepted environment.

The browser tests exercise keyboard selection, usage on a priced and a partially priced estimate, the temporary price comparison, clearing and unchanged exports. A separate fictional reconciliation holds £286.40 of fixed charges and verifies that a 20% change to £172.60 of adjustable charges adds £34.52 monthly and £414.24 annualised. Type checking, lint, the build, 112 unit tests and 47 Chromium tests passed.

## Stage 2 · Optional value assumptions

Potential value starts with one action and four short steps. Every field can be left blank. Editing or cancelling a draft leaves the accepted plan and cost estimate intact. Explicit acceptance saves a strict optional `valuePlan` to the current environment. JSON imports continue through the existing size and structure checks. Older exports can omit the field. Imported entered assumptions display their import provenance, and explicitly fictional inputs retain their label.

Whole active users equal the intended audience × adoption percentage, rounded half up. Gross hours equal active users × tasks per month × minutes saved ÷ 60. Realised hours multiply gross hours by the declared factor. Economic equivalent multiplies realised hours by the declared hourly value. Cashable savings are independent declarations. Annualised amounts use 12 months before presentation rounding. One-off implementation and additional recurring costs stay separate from AI expenditure. Monetary values retain the currency in the accepted plan.

Type checking, lint, the production build, 116 unit tests and 48 Chromium tests passed. The fictional fixture reconciled 75 active users, 300 gross monthly hours, 180 realised hours and £4,500 monthly economic equivalent. The browser verified unknown realisation, unchanged cost, discarded drafts and provenance after import. No backend or browser storage is involved.

## Stage 3 · Adoption comparisons

Adoption and value is a third change type in Explore changes. It starts from accepted assumptions. Lower and higher percentages are blank until entered. The result keeps workload, AI expenditure, productivity, economic equivalent and declared cashable savings in distinct columns. With no usable link, workload and cost effects are unknown.

The optional link uses one eligible Foundry PAYG workload with a dedicated profile or one platform-managed Copilot Studio workload with a single monthly credit total. Foundry changes executions using the existing usage estimator and keeps calls, tokens and retries. Copilot uses an explicitly entered credit rate per active user with a customer note. It preserves the ledger's existing allowance and shared pack allocation. All resulting costs come from the applied catalogue and existing ledger against a temporary environment. Neither accepted adoption nor the original usage changes.

Type checking, lint, production build and 120 unit tests passed. The browser suite passed 48 existing journeys and identified table overflow in the new mobile case. The table now scrolls inside a labelled region. Both focused journeys passed on the rebuilt production bundle. Fictional tests independently verify Foundry changes of £1,617.10 versus £1,631.29, Copilot credits with shared packs, fixed provisioned capacity and unchanged exports.

## Stage 4 · Environment Review

One contextual review opens from Guided Review, Advanced and Reports & Export. Overview describes the model and the assessed scope. Architecture uses the existing SVG with keyboard nodes, a scrollable register and export. Technical fit groups compatibility and licensing findings by component and opens the relevant existing editor input. Controls groups advisory checks by safeguard and distinguishes declarations, absent, unknown and not assessed scopes. The earlier `#/architecture` and `#/governance` paths still open the appropriate view.

Type checking, lint, build, 120 unit and 50 Chromium tests passed. The new browser journey found an independently verified incompatibility, reached the exact output modality control, inspected the scope of a declared identity policy, identified an unassessed approval check and downloaded SVG. The full suite again passed the mobile adoption reflow case and all cost and PDF reconciliations.

## Stage 5 · Reports and guidance

Accepted value estimates appear after the cost and uncertainty content in both PDFs. Full Report includes the input provenance, methods and separate implementation and operating cost scopes. An explicit comparison action adds one illustrative adoption table to Full Report only. The choice can be removed and is cleared for a different environment or price catalogue. JSON retains accepted assumptions only. Documentation Hub adds guides to value, workload linkage and review, with contextual paths. Home retains the central cost proposition.

Type checking, lint, build, 121 unit tests and 51 Chromium tests passed. The new report fixture keeps £3,594.00 of known monthly AI spend and one unresolved charge alongside £6,000.00 of separately modelled economic equivalent. Raster review inspected the executive table and the detailed provenance page. Browser checks reconciled both formats, confirmed a temporary comparison is excluded by default and verified separate opt-in and unchanged JSON.

## Stage 6 · Usability and release

The final browser suite exercises the original Guided Foundry and Copilot journeys, temporary cost and adoption comparisons, accepted assumptions, contextual review and both PDF formats. The narrow viewport check uses 320 CSS pixels at a device scale factor of 2, verifies keyboard focus and inspects Costs and Technical fit with axe. The check found a keyboard scrolling issue in the licence expenditure table. The region now has a name and can receive focus.

Live smoke includes the value and review journeys in addition to the existing financial, catalogue, documentation and privacy checks. The same account and existing Worker remain the deployment target. The wider release command continues to block under the Stage 6.1 S6-10 condition. The [moderated study materials](37-cost-value-usability-study.md) are prepared and participant sessions remain outstanding.

The final candidate passed type checking, lint, 121 unit tests and 52 Chromium tests. The build passed pricing, evidence, documentation and production asset validation. Both dependency audits reported zero vulnerabilities. The rebuilt accessibility check passed, including the focusable licence table. A production preview requires separate guarded GitHub checks and live verification.
