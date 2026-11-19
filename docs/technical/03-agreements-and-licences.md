# Contracts, forecasts and licence expenditure

The retail, current and forecast views are calculated independently for each billable line. Agreement scope is the effective pricing owner and exact meter. This matters when a shared deployment owns the rate and several agents own the usage.

## Price precedence

1. Resolve one current verified retail record for the exact meter and currency. The retail baseline stays independent of any pricing agreement.
2. Filter agreements to the environment currency, scope identity and effective timestamp. Choose an exact owner-specific rule ahead of an exact environment rule. The fallback at each scope accepts a compatible legacy Copilot Credits meter for a matched credits offer. A rule for another owner is inapplicable. An explicit owner-specific `retail` rule restores retail at that scope.
3. Apply the selected `retail`, `discount`, `fixed` or `intentional-zero` mode. A discount uses `verified retail × (1 − discount / 100)` and requires verified retail. A fixed rate supplies the entered amount per billed unit. Intentional zero supplies a documented zero rate. Only the selected rule applies, so overlapping percentage discounts cannot stack.
4. Select a forecast exception independently using the same owner and exact-meter order, including the legacy fallback. An exception percentage replaces the global percentage. Its explicit `applyToFixed` overrides the environment flag. Multiply the current rate by `1 + percent / 100` for applicable modes. Fixed rates stay fixed by default and intentional zero stays zero.
5. A missing quantity or meter still prevents pricing by rate alone. Missing retail remains unknown for retail and discounts. Exact fixed or intentional-zero overrides can resolve current cost with a valid meter and quantity.

An agreement is selected at or after its effective timestamp. It is not carried into the retail calculation. Resolved charges are rounded at line level separately for each basis. For example, fictional retail of £1,000 with a 15% discount and +20% forecast gives £850 current and £1,020 forecast. A fictional £700 fixed agreement stays £700 with the default flag and becomes £840 when the same forecast explicitly applies. See `financialRates`, `bill` and `meterKey` in [ledger](../../src/ledger.ts) and [domain](../../src/domain.ts), plus [price cases](../../fixtures/price-cases.json) and [ledger tests](../../tests/ledger.test.ts).

## Distinct seats and licence spend

`assignedSeatCount` uses an explicit number of seats first. Otherwise it sums linked group seats and subtracts declared overlaps when several groups are present. Every linked seat count must be known, and a multi-group derivation needs an overlap count including an explicit zero where appropriate. The result must cover the largest group assignment and fit the supported limit. A declared assignment greater than group population or a group assignment larger than the explicit distinct total blocks pricing the affected seat count.

The calculation also detects potentially duplicate lines of the same normalised product. It compares procurement and purchase pool declarations. Distinct named pools can describe known non-overlapping purchases. The engine lacks a person-by-person identity list. A group, an agent link and an entitlement are separate facts. Inclusion evidence can warn about potentially redundant plans without automatically cancelling the recorded purchase.

New purchases use distinct eligible seat quantity and the exact seat/month tariff or a customer agreement. Already-owned licence lines contribute zero incremental cost, and the separately entered `existingMonthly` contributes to the existing spend scope. Missing spend or blocked declarations remain unresolved there. Procurement marked unknown leaves the prospective rate quantity unresolved.

## Dated replacement and proposed scopes

Evaluate each already-owned licence's incoming replacement links effective on or before the assessment day. Future links have no effect yet. A missing effective date is considered incomplete. A valid replacement requires positive seats, an incremental unblocked source, known existing spend and seats, and no excess claims against either the existing or replacement seat totals.

```text
Retired amount = round(existing rounded monthly amount × replaced seats / existing seats)
Retained amount = existing rounded monthly amount − retired amount
Proposed licence spend = known retained amount + known incremental licence amount
Proposed environment = known retained amount + known current ledger amount
```

An ambiguous effective replacement leaves the affected retained amount unresolved. The existing-spend view still shows the historical amount when known. The return value includes separate incomplete counts for existing, incremental, proposed licences and proposed environment. Independently confirm contract release dates, how invoicing works, and whether any savings apply. The calculation treats valid declarations as planning assumptions.

[Entitlement and spend implementation](../../src/entitlements.ts) owns the seat, replacement and retained calculations. The [enterprise fixture](../../fixtures/enterprise-scenarios.ts) and [enterprise tests](../../tests/enterprise.test.ts) exercise overlapping assignments, effective dates, missing base licences and contract precedence. See [illustrative reconciliations](03-worked-reconciliations.md).
