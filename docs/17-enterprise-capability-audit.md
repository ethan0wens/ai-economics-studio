# Enterprise capability audit

19 November 2026. Baseline `06c2eb0`.

| Area | Observed behaviour | Consequence |
| --- | --- | --- |
| Licence catalogue | Public catalogue includes 20 seat offers and five reviewed per-seat rates. Commercial price records describe terms and expiry. `group-has-entitlement` links describe assignment without a seat count. | A priced product supplies a rate for a declared quantity, without evidence that a prerequisite or capability applies to those users. |
| Existing and proposed licences | `ledger.ts` sets current and forecast to zero for an explicitly owned licence. Monthly retail can still appear on the same line. Duplicate SKUs or multiple assigned groups generate a note. | A comparable retail value can be mistaken for existing spend. Duplicates can still be counted in the proposed total. No eligibility, upgrade, group intersection or overlap calculation exists. |
| Bundling and prerequisites | Agent 365, Microsoft 365 Copilot plans, Entra, Defender and Purview are descriptions and seat tariffs. | Procurement, price, assignment, prerequisites, included capabilities and paid usage require separate decisions. There is no assignment between agents and licence objects. |
| Copilot | Billable monthly credits come from a total or activity breakdown. Linked explicit monthly packs are allocated in stable object-ID order. Several candidate packs yield an ambiguity note, followed by a known full PAYG charge. | Unresolved allocation can overstate certainty. Existing licences and retail price availability establish no included usage. |
| Foundry and Azure | A price-meter match is independent from agent compatibility in principle, but every linked Foundry model currently yields the same unverified message. Model `region` in the editor tracks billing. Azure resource links and governance declarations are descriptive. | No regional architecture evidence, model version/mode check, modal capability check or resource dependency evidence is available. |
| Financial engine | Traces for tokens, retries, graduated tiers, per-owner rate selection and forecast precedence are implemented in `ledger.ts`. Shared provisioned capacity is one line and its allocation uses cumulative rounding. Invocation links do not generate usage. | Shared unit costs and contract precedence can be reconciled independently. Existing tests cover individual components rather than six full enterprise scenarios. |
| Reports | JSON saves assumptions and a partial saved-source subtotal. The PDF, inspector and diagram consume ledger data. | There is no independently inspectable existing-expenditure figure or architecture and licensing evidence summary in the exported report. |

## Implementation boundaries

- Keep commercial evidence, customer assignments, billing rates, and technical availability separate. Model ownership and overlap with explicit seat counts, and verified dependencies as guidance. Unknown eligibility never provisions a new purchase or deducts credits.
- Use a dated scope for compatibility. Require an actual deployment location independently of the billing meter. Use authoritative product capability and regional sources. Preserve drafts and never infer unsupported from a missing row.
- Reconcile six scenarios against separately written calculations. Freeze realistic fictional contract values in test-only fixtures and record authoritative references for meter types and licensing assumptions. Confirm the same ledger reaches JSON, PDF, diagrams, and interactive views.
