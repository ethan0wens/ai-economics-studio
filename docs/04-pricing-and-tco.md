# 04 — Financial calculation engine and override precedence

> See the [technical reference](technical/03-ledger-methodology.md) for current implementation and procedures. This document also records earlier design decisions.

## Principles

Use a pure TypeScript calculation engine and decimal arithmetic, unit-labelled prices and a structured **cost ledger**. A cost ledger is computed from the environment, not stored as the source of truth. The same ledger feeds dashboard, PDF and exports. Costing must be **auditable and reproducible**, with currency, source and assumptions attached to each line.

## Pricing pipeline for one meter

1. **Retail baseline (`R`)**: latest validated public catalogue rate for **exact** SKU, region, billing unit and currency. If absent or unmapped, status = `unknown`; do not use 0.
2. **Contract adjustment (`C`)**:
   - `catalogue`: `C = R`.
   - `retail-discount-percent d`: `C = R × (1 - d)` with `0 ≤ d ≤ 100`, source retail rate must be present.
   - `fixed-price F`: `C = F`, valid non-negative value in matching unit/currency; independent of R if R unavailable, but still disclose missing retail baseline.
   - `intentional-zero`: C=0 ONLY with explicit human reason and a pricing state identifying it as contractual/included, not unknown.
3. **Future retail scenario (`s`)**: factor `s` is percent change, e.g. +20%=0.20. Per-meter/per-object factor **replaces** the global factor, does not automatically stack. By default an item inherits global `s` unless explicitly disabled for that item.
4. **Forecast-effective rate (`E`)**:
   - catalogue: `E = R × (1+s)`.
   - retail percentage discount: `E = R × (1+s) × (1-d)` (assumption: negotiated percentage discount remains tied to list price).
   - fixed price: `E = F` **unless** `applyToFixedContract=true` explicitly, when `E = F × (1+s)`.
   - intentional zero: `E = 0`; never automatically inflate included entitlements.
5. **Current effective rate** is `C` without forecast. Show **retail baseline, contract-adjusted current and scenario forecast** separately. Display unknown retail baseline even if a fixed rate supplies current total.

**Do not blindly apply discounts twice**: only one agreement override strategy per meter/scope. Scope specificity: object-level explicit override beats environment-level override for the same meter; per-meter explicit override beats provider/category default; show effective provenance. Price overrides need unit normalization before use.

## Rates and unit consistency

Catalogued records include `meterId`, `provider`, `sku`, `region`, `currency`, `priceType`, `unitLabel`, `quantityPerUnit`, `retailPrice`, `effectiveStartAt`, `lastCheckedAt`, `sourceUri`, `verification`, and supported integration/billing status. Example billing units: 1M input tokens, 1M output tokens, one Copilot Studio credit, seat/month, GB/month, hour, one instance/month. Preserve source's original unit and convert using audited conversion functions; never assume every item is £/1M tokens.

Base calculations (illustrative **formulas**, no assumed source rates):

- `modelInputCost = inputTokens / 1_000_000 × inputRatePerMillion`.
- `modelOutputCost = outputTokens / 1_000_000 × outputRatePerMillion`.
- `requests = monthlyExecutions × modelCallsPerExecution × (1 + retryFraction)` **only if** calls and retries are not already included in token estimates.
- `monthlyInputTokens = requests × inputTokensPerCall`, equivalent for output.
- `supportCost = sum(usageQuantity × verifiedMeterPrice/normalizedUnit)`.
- `monthlySeatCost = incrementalBillableSeatCount × verifiedMonthlySeatPrice` for an incremental licensing plan; existing cost displayed separately as allocated/baseline, not silently newly purchased.
- `monthlyFixedCapacity = (verifiedCapacityUnits × publishedUnitPrice × billableHours)` **or** fixed published monthly price, depending on actual meter. Never add consumption for traffic already covered under the same provisioned unit without evidence.
- `annualProjection = 12 × monthlyCost` only when displaying **steady-state run rate** and label as such, or use month-specific assumptions for true year-one cashflow.

**Platform and model billing** must be independently identified. For Copilot Studio, do not presume every invocation also pays Foundry inference: charge model tokens only on a validated separate billing path. Licence entitlements, included platform credits, PAYG consumption and tool charges need precedence rules to avoid overlap; if unknown, item is `unknown` rather than guessed.

## Ledger and allocation

A ledger line has: `lineId`, `objectId`, `category`, `costComponent`, `meter`, `period`, `usageQuantity`, `rateSource`, `retailUnitRate`, `contractUnitRate`, `forecastUnitRate`, `retailAmount?`, `currentAmount?`, `forecastAmount?`, `currency`, `priceStatus`, `warnings`, `allocatedToAgentIds?`.

Fixed model deployment capacity and shared resources are **charged once** in environment total. Agent/department allocations are informational, not extra costs. For shared fixed charges, offer allocation by explicit percentage or measured usage fraction with an `unallocated` remainder; validate allocations sum to 100% if total assigned. Do not silently divide equally without displaying assumption.

Output both `knownSubtotal` and `incompleteLineCount`, plus known annual run-rate. An 'estimated total' badge may appear only when **all required priced items** are resolved. Unknown costs must not be added as zero into definitive totals.

## Forecast and contract examples — test-only

If retail baseline £1,000/month, forecast increase +20%, contract discount 15%: retail projection £1,200; forecast contract £1,020. Present-day contract amount £850. With a fixed £700 contract price, forecast stays £700 unless user opts into applying +20% to fixed rate, yielding £840.

Do not use these figures as real Microsoft prices. Include tests covering override survival across catalogue updates, scope precedence, zero validation, discounts, negative rates, currency mismatch, missing rate, shared allocation, and forecast reset.

## Decimal/rounding requirements

Internally use a decimal math library or exact scaled amounts. Rates may be much smaller than £0.01/token; retain high precision through multiplication and allocation. Round only display and at explicitly documented ledger boundaries, using consistent currency minor units. Reconciliation test: sum of ledger lines equals reported known subtotal after declared rounding policy. Use formatting from `Intl.NumberFormat`, with GBP default.

## Historical reproducibility

Exports capture `catalogueId`, `catalogueLastCheckedAt`, source effective dates and optionally the exact applied price snapshot (data only, no user secrets). On re-import display 'Recalculated using catalogue V' and compare with captured figure when available. Forecasts and fixed agreement overrides persist.
