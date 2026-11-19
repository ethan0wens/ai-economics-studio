# Core interfaces and troubleshooting

Start with the boundary that failed. Reproduce in a clean checkout and keep confidential configuration in the local workspace. Use an illustrative environment or synthetic fixture when opening an issue.

## Maintainer interfaces

| Contract | Important entry points and extension rules |
| --- | --- |
| [Environment and graph](../../src/domain.ts) | `Environment`, `StudioObject`, `Edge`, `Meter`, `Override`, `ForecastException`, `environmentSchema`, `objectSchema`, `importEnvironment`, `graphErrors`, `cloneEnvironment` and `removeObject`. Extend the schema, migrate intentionally, and cover mode switching, exports and old files before changing a field. |
| [Guided state](../../src/guided-state.ts) | `addSolution`, `assignLink`, `reuseDeployment` and `ownUsage` build prospective updates. The editor validates before applying them. |
| [Catalogue](../../src/catalogue.ts) and [offerings](../../src/offerings.ts) | `Catalogue`, `Manifest`, `RetailRecord`, `Offering`, `Component`, `loadCatalogue`, `isCurrentRate`, `resolveOffering`, `offeringMeter` and `applicableOffering`. Exact identities and published units form the compatibility contract. |
| [Ledger](../../src/ledger.ts) | `ledger`, `Line`, `Ledger`, `CapacityComparison`, `financialRates`, `graduatedAmount` and `summarize`. Return derived data without mutating the environment. Use a fixed valuation time and fixtures in tests. |
| [Compatibility](../../src/compatibility.ts) and [entitlements](../../src/entitlements.ts) | `TechnicalFinding`, `LicensingFinding`, `technical`, `deploymentFindings`, `licensing` and `assignedSeatCount`. Source evidence, reviewed scope and confidence are part of the output. Date-sensitive evidence uses explicit validity windows. |
| [Scenario](../../src/scenario.ts), [adoption](../../src/adoption.ts) and [value](../../src/value.ts) | `compareCosts`, `pricePreview`, `compareAdoption`, `valuePlanSchema` and `estimateValue` separate temporary costs and accepted productivity assumptions. |
| [Environment Review](../../src/environment-review.tsx) and [report value](../../src/report-value.ts) | `EnvironmentReview` groups existing evidence and declarations. `valueSummary` and `valueAssumptions` render accepted potential value and the optional Full Report illustration. |
| [Graph](../../src/graph.ts) and [report](../../src/report.ts) | `logicalGraph` and `report` project the model and ledger. A report change needs text and itemised total reconciliation. |
| [Catalogue job](../../scripts/pricing.ts) and [maintenance](../../scripts/maintenance.ts) | `refresh`, `validate`, `retailPage`, `maintenance` and [promotion APIs](../../scripts/worker-release.ts). Rehearse new mappings and guards read-only first. |
| [Technical navigation](../../docs/technical/index.json) and [documentation validation](../../scripts/docs.ts) | Stable article IDs and anchors, Markdown and generated reference tables. See [maintenance guidance](maintenance.md). |

Public asset formats live in [catalogue formats](05-catalogue-contract.md#public-assets-and-contracts). The editable format and diagram/export contracts are covered in [the schema](02-environment-schema.md) and [workspace flow](01-workspace-flow.md).

## Diagnostic guide

| Symptom | Reproduce and resolve |
| --- | --- |
| Setup or dev start fails | Check Node 24, install with `npm ci`, check the working tree and try the configured preview port. Capture the first error rather than follow-on failures. |
| Build fails before Vite | Run pricing, evidence and documentation validation individually. Confirm both manifest assets, evidence contract, article registration and status of generated reference checks. |
| Browser fails to start | Install Chromium via Playwright or use the configured runner browser path. Build before running browser tests. The test runner starts Vite preview unless an external URL is supplied. |
| Import is rejected | Check UTF-8 size, depth, schema version, disclaimer and exact issue paths. Compare endpoint kinds and existence. Use the [validated examples](02-relationships-and-files.md#validated-example-files) as a reference. |
| Unknown price or wrong units | Inspect quantity, meter identity, billing region and scope, then effective date and catalogue health. Distinguish base units from the billed block. Verify multiple tariff components individually. |
| Reconciliation differs | Hold the assessment time and catalogue constant. Compare line quantities, line rounding, scope, rates, applicable agreements and unknown counts before comparing totals. Check retained spend and reservation pricing separately. |
| Unsupported model configuration | Check exact model version, SKU, requested feature and actual deployment region. Available billing alone leaves compatibility open. See [Foundry evidence](04-foundry-and-azure.md#foundry-model-and-deployment-identity). |
| Article or deep link fails | Check the metadata and Markdown file name, heading slug, user guide ID and source symbol. Run docs validation and test the in-app hash route. Maintain the link even when changing a visible title. |
| Azure ingestion or evidence fails | Review the first failing selector, unit, source status, tier or review window. Use the [catalogue runbook](05-catalogue-maintenance.md#operator-procedures). |
| Production verification fails | Confirm whether the previous version was restored. Compare build bytes and expected manifest/logged candidate. Investigate the failed browser journey before retry. [Release recovery](06-security-and-operations.md#deployment-and-rollback). |
| PDF fails or omits a glyph | Keep the workspace open and export JSON. Retry with a small reproducible file and standard characters if necessary. Check the generated page count, extracted text and available fonts. |

For module and fixture changes see [regression guidance](07-verification-and-tests.md#financial-regression-method). For marketing or billing claims, use the documented evidence and currency rather than an approximate rate.
