# Worked financial reconciliations

Every rate, customer allowance, reservation quote and usage figure in this chapter is **fictional test data**, denominated in GBP unless stated otherwise. Use the calculated amounts to reproduce the implementation, and use the applied catalogue or customer evidence when modelling actual plans. The comparable fixtures explicitly supply valuation time, exact offering identities, billed units and expected results.

## Foundry PAYG with cached input

Fixture A executes 20,000 times, with 2 requests per run and 10% retries. The result is 44,000 calls. Each request has 1,500 uncached input, 500 cached input and 400 output tokens. All three fictional rates are per 1,000 tokens.

| Charge | Arithmetic | Monthly GBP |
| --- | --- | --- |
| Input | 66,000,000 / 1,000 × 0.002 | 132.00 |
| Cached input | 22,000,000 / 1,000 × 0.0005 | 11.00 |
| Output | 17,600,000 / 1,000 × 0.008 | 140.80 |
| Search | 720 search-unit-hours × 0.20 | 144.00 |
| Blob | 51,200 × 0.02 + 8,800 × 0.015 | 1,156.00 |
| Security logs and identity | 80 × 2 + 30 × 5 | 310.00 |

Total £1,893.80 per month and £22,725.60 annualised. Cached traffic is distinct from the 1,500 uncached tokens. The storage threshold applies only to units in the second band. This is fixture A in [enterprise scenarios](../../fixtures/enterprise-scenarios.ts).

## Copilot Credits and a shared pack

Fixture B declares 18,000, 19,000 and 5,000 credits in inventory order. The first agent has a fictional eligible 2,000-credit allowance. Remaining credits are 16,000, 19,000 and 5,000. A single 25,000-credit pack allocates 16,000 first and 9,000 second. The remaining 10,000 and 5,000 credits cost £180 at £0.012 per credit. Add £160 for the pack, £690 for 30 seats, £1 for 20,000 Key Vault operations at £0.50 per 10,000, and £3 for the explicitly linked prompt's token usage. The current estimate is £1,034.00 monthly and £12,408.00 annualised. An already-owned licence also has £1,000 separate existing spend. [Fixture B and its assertions](../../tests/enterprise.test.ts).

## Provisioned throughput with a reservation

Use fixture C's 45 PTUs and 400 hours, and the fictional 12-month £36,000 quote used in [the provisioned regression](../../tests/provisioned.test.ts). Full usage is 18,000 PTU-hours. An exclusive 30-PTU allocation covers 12,000 PTU-hours. The uncovered 6,000 × £0.40 gives £2,400. The £3,000 monthly commitment and £200 of supporting charges give £5,600.00 current and £67,200.00 annualised. The retail basis uses full capacity at £0.40 plus £200, or £7,400.00. A separate same-model PAYG check comes to £3.77 and leaves the reservation and ledger unchanged.

## Shared capacity and rounding

Remove that reservation in fixture C. The deployment contributes **one** 18,000 PTU-hour charge of £7,200. Three distinct profiles have 100,000, 200,000 and 300,000 weighted input tokens respectively. Their weights sum to 600,000. Allocation yields £1,200.00, £2,400.00 and £3,600.00. The two shared resources add £120 and £80. The total is £7,400.00 monthly and £88,800.00 annualised.

For a minor-unit boundary, [the shared-charge unit test](../../tests/ledger.test.ts) uses one £50.01 current charge and weights in a 1:2 ratio. Rounded cumulative totals are £16.67 and £50.01, so the individually reported amounts are £16.67 and £33.34. Their sum equals the rounded ledger line.

## Existing and incremental licensing

Fixture D declares 500 owned E3 seats and £12,000 monthly existing spend. Linked Copilot groups of 80 and 50 with 30 overlaps give 100 distinct seats. New costs are 100 × £22, 25 Agent 365 seats × £10, and 20 E7 upgrades × £75, or £3,950. The dated replacement retires £12,000 × 20 / 500 = £480, leaving £11,520 retained. Proposed licence spend is £15,470. Separately, 7,000 billable credits × £0.02 adds £140 to the ledger. Current new charges are £4,090.00, annualising to £49,080.00. Proposed environment spend including retained licences is £15,610.00 monthly. [Fixture D](../../fixtures/enterprise-scenarios.ts).

## Contract discounts and price forecasting

Fixture F has five lines. All displayed prices use the fixture's exact billed units. The input rate is discounted by 15%. The output owner selects explicit retail in place of the environment discount. Search's owner-specific 20% discount takes precedence over the 10% environment rule. Forecast exceptions set Search to −10% and opt the fixed seats into +5%, with the fixed VM unaffected.

| Charge | Retail GBP | Current GBP | Forecast GBP |
| --- | ---: | ---: | ---: |
| Input tokens | 16.00 | 13.60 | 16.32 |
| Output tokens | 15.00 | 15.00 | 18.00 |
| VM | 144.00 | 86.40 | 86.40 |
| Search | 180.00 | 144.00 | 129.60 |
| Seats | 250.00 | 200.00 | 210.00 |
| Monthly sum | 605.00 | 459.00 | 460.32 |

Current annualised spend equals £5,508.00. The same assertions also cover the two basis differences on export and the PDF. [Fixture F](../../fixtures/enterprise-scenarios.ts) and [browser financial reconciliation](../../tests/e2e/enterprise.spec.ts).

## AI Adoption and Business Case

The [editable example](#/examples/ai-adoption-business-case) uses the applied Microsoft catalogue. This independent regression instead pins [fictional rates](../../fixtures/adoption-business-case.ts) for GPT-4.1 mini Global Standard in UK South at £0.20 per 1,000 input tokens and £0.50 per 1,000 output tokens. These amounts are solely test data.

The accepted workload is 1,000 executions per month × one request. Each request produces 1,500 input and 300 output tokens. The input line is 1,500,000 ÷ 1,000 × £0.20 = £300.00. The output line is 300,000 ÷ 1,000 × £0.50 = £150.00. The accepted AI estimate is £450.00 monthly, or £5,400.00 annualised, with zero unresolved charges under the fixture. If the output rate is absent, the accepted known subtotal is £300.00 with one unresolved charge.

Independently, 200 × 50% gives 100 active users. Gross capacity is 100 × 20 tasks × 12 minutes ÷ 60 = 400 hours monthly. Realised capacity is 400 × 60% = 240 hours. At £25 per realised hour the assumed economic equivalent is £6,000 monthly or £72,000 annualised. Cashable savings, one-off implementation and additional operating costs are unknown. No ROI or net benefit is calculated.

Adoption on its own leaves projected AI expenditure unknown. The illustrative link of ten monthly interactions per active user yields the workloads below. Apply the same token rates and units per case. The accepted ledger remains £450.00 monthly throughout the comparison.

| Adoption | Active users | Monthly runs | Input / output tokens | Gross / realised monthly hours | Projected AI spend monthly / annualised | Economic equivalent monthly / annualised |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 25% | 50 | 500 | 750,000 / 150,000 | 200 / 120 | £225 / £2,700 | £3,000 / £36,000 |
| 50% accepted | 100 | 1,000 | 1,500,000 / 300,000 | 400 / 240 | £450 / £5,400 | £6,000 / £72,000 |
| 75% | 150 | 1,500 | 2,250,000 / 450,000 | 600 / 360 | £675 / £8,100 | £9,000 / £108,000 |

Both PDFs show the accepted AI estimate of £450.00 monthly and £5,400.00 annualised, with the accepted economic equivalent and cashable savings status shown separately. Full Report identifies the rate and accepted assumption sources. Its explicit illustration opt-in adds monthly hypothetical rows without altering these totals. JSON retains the accepted 50% adoption, 1,000 monthly executions, fictional provenance and snapshot, and excludes the comparison and inclusion choice. The [walkthrough](#/documentation/example-ai-adoption-business-case) follows the same steps in the workspace.

## Reproduce these results

```sh
npx vitest run tests/ledger.test.ts tests/enterprise.test.ts tests/provisioned.test.ts
npm run build
npm run test:e2e -- tests/e2e/enterprise.spec.ts
```

The browser scenario injects the fictional catalogue and fixed date, exercises the visible workspace and extracts PDF text to reconcile its numbers. The fixture also includes a multi-region scenario whose £3,594.00 known subtotal excludes one incompatible inference charge. Evaluate the unresolved count alongside money. See [verification guidance](07-verification-and-tests.md).
