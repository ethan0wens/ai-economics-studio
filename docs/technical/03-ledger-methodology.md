# Ledger quantities and cost methodology

The ledger translates a validated plan into a list of monthly charges and three views of each charge. The retail baseline uses matching verified rates. The current estimate applies the customer's pricing rules. The price forecast applies a separate hypothetical percentage. The same itemised ledger feeds the UI, JSON source snapshot and PDF. See [src/ledger.ts](../../src/ledger.ts) and [contracts and licence expenditure](03-agreements-and-licences.md).

## Inputs and outputs

`ledger(env, records, at, inventory)` accepts the environment, verified or fixture rates, an ISO valuation time and offering definitions. Finance first calls technical and licensing evaluation. The rate resolver matches applicable offering, component, exact meter and currency at the valuation time. Custom generic meters identify manual assumptions. Some explicitly configured supporting usage meters can match retail. Compare the exact resolver rules in the [catalogue contract](05-catalogue-contract.md#exact-price-identity).

A `Line` carries its object, pricing owner, component, category, meter, monthly quantity, unit rates, amounts and optional source, applied agreement, reason and allocation. The same deployment can own rates for several agent token lines. The provisioned capacity line instead belongs to the model deployment. `summarize` adds rounded amounts for each basis and counts null amounts independently.

## Usage and token formulas

| Quantity | Calculation | Unit and assumptions |
| --- | --- | --- |
| Monthly executions `E` | Entered in a distinct usage profile | Runs per month. User-group adoption and invocation edges do not generate runs. |
| Base model calls `B` | `E × calls` | Model requests per month before retries. `calls` is an average per run. |
| Requests `R` | `B × (1 + retries / 100)` | Monthly requests. An omitted retry rate is treated as zero. |
| Input `I` | `R × input` | Uncached tokens per month. |
| Cached input `C` | `R × cachedInput` | Emitted when the profile declares positive cached tokens. Requires its own rate. |
| Output `O` | `R × output` | Output tokens per month, with its own meter. |

Input, cached input and output use the applicable component's billed quantity. A shared PAYG deployment prices each agent's own demand, with deployment-scoped overrides. A profile linked to more than one agent produces unresolved usage for affected agents. A provisioned deployment's capacity charge takes the place of per-agent standard inference charges. `toolCalls` supplies planning context. External prompt model use follows the separate Copilot path. See [ledger unit tests](../../tests/ledger.test.ts) and [enterprise reconciliations](../../tests/enterprise.test.ts).

## Copilot credits and supporting resources

```text
G = declared gross Copilot Credits per month
A = eligible customer-declared allowance, applied first
P = linked pack credits allocated from the remaining eligible pool
Billable PAYG credits = G − A − P
```

`declaredCopilotCredits` supplies the monthly total or the sum of entered activity categories. The user supplies credits, including any conversion from activities. A current allowance needs an amount, basis and expiry, and cannot exceed gross demand. An expired allowance leaves gross use in the estimate and raises a finding. Incomplete or inconsistent allowances leave the quantity unresolved. The engine allocates recognised monthly packs by agent inventory order. Each eligible pack contributes its configured credit capacity once. A linked agent using several eligible pools has unresolved overage. Residual units are priced per credit. Fully covered eligible use can yield a known zero even when a PAYG tariff is unavailable.

Supporting resources use an explicit monthly quantity in the selected meter's base unit. Search can use search-unit-hours, compute hours and operations individual requests. A meter may sell a block of those base units. An unattached resource's cost stays in the plan. Shared links add context without duplicating cost. Duplicate resource records for the same graduated catalogue tariff leave usage unresolved until consolidated. [Enterprise tests](../../tests/enterprise.test.ts) exercise credit packs, separate prompt inference, resource bands and scope.

## Provisioned capacity and allocation

For deployment capacity `P` in PTUs and hours `H` in the modelled month, full billable usage is `P × H` PTU-hours. A current exact incompatible configuration leaves quantity unresolved. A dated and correctly scoped customer reservation produces two lines. The commitment is the total quote divided by the term in months. Covered hours are `min(reserved PTUs, P) × coveredHours`. Current and forecast hourly charges use the uncovered PTU-hours, while the retail baseline uses the full hourly quantity. The commitment contributes to current and forecast at the same monthly amount. Duplicate non-inactive allocation references leave the affected commitments unresolved. The expiry at a month boundary clamps the original day to the last available day of the target month.

Input-token allocation uses complete distinct profiles and each agent's monthly uncached plus cached input, including retries. The sum of weights must be positive. For each current fixed line, round each cumulative fractional share of the line total to currency precision, then subtract the amount allocated through the previous agent. The difference approach allocates the entire rounded charge exactly. Allocation affects reporting only.

An optional PAYG comparison uses complete agent profiles and a verified alternative tariff for the same exact model/version in the environment currency. Its billing region can differ. Each required token component is independently priced and rounded at its workload line boundary. The comparison is a cost comparison for the declared monthly demand. [Provisioned tests](../../tests/provisioned.test.ts) cover minimum PTUs, reservation expiry, allocations and actual-versus-billing region.

## Rate normalisation and rounding

Flat charge equals `quantity × rate / quantityPerUnit`. In a graduated tariff, row `i` starts at base units `b[i]`, and consumes at most `max(0, min(quantity, b[i+1]) − b[i])`, with the last band open-ended. Multiply each band quantity by its published rate divided by `quantityPerUnit`, then sum. The price editor shows a blended billed-unit rate at the specified usage. Percentage adjustments affect that cost, and a fixed contract supplies a new flat rate.

With 50 significant decimal digits and half-up rounding, each line rounds once to the currency digits resolved by `Intl.NumberFormat`. For GBP, a fictional £1.005 line is £1.01. Two such resolved lines sum to £2.02. Totals across lines sum these rounded values, and the annualised amount multiplies the known monthly subtotal by 12. £2.02 therefore yields £24.24 at a constant run rate. `formatMoney` keeps large whole values out of floating-point formatting by using a BigInt path. [Ledger tests](../../tests/ledger.test.ts) cover shared minor-unit reconciliation and exact meter scale.

## Unknown and zero

A missing rate, required quantity or compatible configuration can leave a line null. Null rows are excluded from the known-cost subtotal and increase the unresolved count for their basis. Several drafts or descriptive records can produce advice without a billable row. A subtotal alone is therefore not proof of completeness. Recognised zeros include already-owned licence increments, fully covered eligible credits or reservation hours, an applicable zero band, and an intentional zero with a reason. A known zero and an unresolved cost need different disclosures. A missing or expired evidence row changes technical or licensing confidence. Verify the actual blocker and rate identity before treating it as a financial zero.

See the [six worked calculations](03-worked-reconciliations.md) for published-fixture arithmetic and [the limitations register](07-limitations.md) for the scope of the method.

## Assisted usage and sensitivity

Monthly active users × average monthly interactions per user maps to whole monthly `executions`. Average calls per interaction maps to `calls`; input and output tokens per call map to `input` and `output`. These are the same values used for direct entry. The preview applies the profile's existing retry multiplier and counts cached input separately. The ledger calculates the financial amounts when the user applies the quantities.

For an illustrative independent check, 200 × 10 × 2 gives 4,000 calls. Multiplying by 1,500 input and 300 output tokens yields 6,000,000 input and 1,200,000 output tokens. With an explicit 10% retry factor, the figures are 4,400 calls, 6,600,000 input and 1,320,000 output tokens. An existing 100 cached tokens per call adds 440,000 cached tokens. These numbers describe fictional inputs.

**Preview a change in usage** creates a temporary copy of the environment with one validated usage field changed. It invokes the same ledger with the same catalogue and assessment time. Both calculations use the current-price basis including applicable agreements. The interface shows unresolved line counts and exposes a whole-environment difference only when both estimates are complete. A [price forecast](03-agreements-and-licences.md) changes rates separately.
