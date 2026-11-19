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
