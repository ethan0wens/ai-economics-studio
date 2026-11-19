# Product language guide

Write for an IT lead, architect or finance reviewer who understands the decision they need to make. Start with the outcome and tell the reader what to do next. Use short sentences, direct verbs and specific nouns. State the evidence behind a claim. An estimate can support a decision and has a defined scope.

## Spelling and names

Use British English in user-facing copy. Use *licence* as a noun and *license* as a verb, and prefer *modelling*, *optimise*, *organisation*, *annualised* and *itemised*. Use sentence case for actions, field labels and prose headings. Keep Microsoft Foundry, Copilot Studio, Copilot Credits and other official product names intact. Preserve code, schema fields, article IDs, URLs and Azure identifiers. Show a readable region name in summaries. Keep the exact Azure code available in editable inputs and technical references.

## Financial terms

| Use | Meaning |
| --- | --- |
| Estimated monthly cost | Charges the studio can calculate for the entered monthly assumptions. Identify it as a **known-cost subtotal** when any charge is unresolved. |
| Annualised estimate | Twelve months at the same monthly usage and pricing. A price forecast is a separate comparison. |
| Costs still to confirm | Charges excluded from the subtotal because an input, rate or applicable configuration needs confirmation. Show an unknown amount as unknown. |
| Verified Microsoft retail price | A public price verified for the matching product, market or region, currency and billing unit. |
| Customer pricing agreement | A customer-entered fixed rate, retail-linked discount or intentional zero with a documented reason. |
| Existing spend, new spend and proposed spend | What the customer already pays, the new charges, and the estimate for the proposed scope including the existing spend that continues. Qualify which scope is shown. |
| Measured, planned and illustrative usage | Observed consumption, a customer’s planning input, and demonstration values. Keep these terms distinct. |

Say **monthly runs** when explaining executions, and **requests per run** when explaining model calls. Keep precise terms such as *model configuration*, *deployment*, *meter*, *provisioned throughput unit (PTU)* and *licence entitlement* where they affect the result. Explain the term in context, including any unit the user needs to enter. Use **Number of users requiring a licence** when asking for a seat count, with guidance to count each person once across overlapping groups.

## Actions, warnings and privacy

Lead with a verb that describes what happens. Use **Create environment**, **Import existing**, **Continue building**, **Review**, **Export JSON** and **Generate PDF**. A PDF is for sharing or review. A JSON export is the editable copy the user can reopen.

Write warnings in the order the user needs them. State what needs confirming, why it affects the estimate, then name a supported next action. Keep missing input, unknown price and incompatible configuration distinct. Use the established severity and link to the affected field or charge. Offer a customer-specific rate only when the charge supports it.

| Prefer | Avoid |
| --- | --- |
| Enter the expected monthly usage so the charge can be calculated. | Missing usage profile relationship. |
| Pricing not currently available. | Rate lookup failed. |
| The known-cost subtotal excludes two unresolved charges. | Your total AI spend. |
| Illustrative example. Usage is for demonstration. | Typical customer usage. |

Use this privacy copy on Home. “No account required. Your environment stays in this browser tab until you leave or reload. Export it to keep a copy.” Explain in documentation that the browser loads public catalogue assets and prepares estimates and PDF files locally. Keep claims about storage and sharing grounded in the application’s behaviour.

## Future changes

Use the same action wording in the interface, screenshots, field help and instructions. Give articles task-oriented headings and keep stable slugs and anchors when titles change. Review nearby validation, empty states, accessible names, narrow layouts and PDF wording whenever a concept changes. Preserve billing rules, dated evidence, disclosures and machine-readable contracts. Run browser and financial reconciliation checks for any visible label or report wording that tests rely on.
