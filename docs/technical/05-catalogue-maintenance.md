# Catalogue refresh and maintenance runbook

GitHub Actions is the operator for the public Azure and Microsoft evidence pipeline. A scheduled or manual refresh stages data in a clean checkout, builds a candidate, and verifies live assets before publishing the staged repository changes. A refresh never handles user workspaces.

## Inputs and ingestion

The official [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) supplies metered consumption records. [Pricing](../../scripts/pricing.ts) queries a bounded set of pinned selectors and delegates scoped discovery to [discovery](../../scripts/discovery.ts). Requests use `2023-01-01-preview`, exact service, ARM region, SKU or product/meter filters, currency and Consumption type. `retailPage` has bounded retries and timeout. Pagination follows only approved Azure endpoints and the loop is bounded. Ingestion checks product, unit, ARM and published SKU, region, price type, effective date, meter ID and tier shape. Ambiguous, absent or unexpected identities cannot silently map to a nearby tariff.

`inventoryPlan` expands reviewed scope and discovered offerings. Exact Azure OpenAI token discoveries require the recorded version, mode, direction and regional scope. [Commercial reconciliation](../../scripts/maintenance-commercial.ts) extracts exact company/UK offer cards and verifies the terms against reviewed mapping. [Technical maintenance](../../scripts/maintenance-technical.ts) uses exact regional, capability, lifecycle, integration and sizing facts. [Microsoft source parsers](../../scripts/microsoft-source.ts) keep source-specific extraction and authority checks outside the browser. Public narrative can remain unresolved when selectors cannot prove an exact fact.

## Scheduling and promotion

The [refresh workflow](../../.github/workflows/refresh-pricing.yml) runs at 06:17 UTC (06:17 GMT or 07:17 BST), with a Monday full review and a narrower daily review on other scheduled days. Manual dispatch on `main` and relevant pushes take the full path. Both production workflows use the `production-static-assets` concurrency group without cancelling an in-progress run. Read-only jobs on `work` can preview the Azure feed or rehearse the full evidence review.

```diagram
Diagram 4. Catalogue refresh and publication

Read latest main
    │
    ├─ Verify public Microsoft evidence
    ├─ Fetch and map exact Azure tariff pages
    ▼
Validate scope, effective date, units, tiers, identity and history
    │
    ▼
Write immutable candidate and manifest → tests → build static assets
    │
    ▼
Confirm existing Worker and recoverable production → upload candidate
    │
    ▼
Verify live bytes and browser results → push staged data to main
    │
    └─ Failed verification or publish → guarded restore → verify prior bytes
```

The local candidate fails verification on a disappeared known meter, replaced provider meter ID, changed tier starts, zero-to-paid transition or rate movement beyond 50% in either direction. Candidate payload and manifest are written individually via atomic temp-file rename, payload first. Only the current and previous snapshot files remain in the staged asset set. Production changes use the transaction in [build and deploy](06-build-and-deploy.md#production-verification). Evidence failures retain prior claims within their dated review conditions and surface in the maintenance report. Review expiry still affects whether a retained price or evidence row can be used.

## Operator procedures

1. **Investigate an unknown estimate.** Inspect the cost line's quantity, unit, component, currency and billing region. Compare the selected identity and any effective agreement. Confirm the applied manifest and review dates. Check whether the row is unsupported, expired, blocked by configuration or simply unpriced.
2. **Add a candidate configuration.** Locate the exact product, usage component and published unit. Record a source URL, date, model version or SKU, region and currency. Add to the scoped inventory, approved mapped source or dated evidence file as appropriate. Capture an independently priced test or keep the component unpriced until evidence is reviewed. Use [the evidence validator](../../scripts/evidence.ts).
3. **Correct a mapping or format change.** Run read-only discovery or evidence probes on a work branch. Compare provider IDs, terms and base units to the current asset. If a provider identifier or tier actually changes, review the migration against independent test results before submitting a patch. A distinct product or ambiguity stays distinct. Run [pricing and discovery tests](../../tests/pricing.test.ts).
4. **Rehearse refresh.** In an isolated checkout run `npm ci`, then `npm run maintenance:review`, `npm run pricing:refresh` and the build and browser checks. These commands stage public asset changes in that checkout. The work-branch preview also publishes a read-only artifact for review. Dispatch **Refresh and deploy retail prices** from `main` through Actions when authorised.
5. **Review a failed run.** Read the first incomplete stage. The Actions summary, logged HTTP/identity diagnostics and deduplicated exception issues show scoped problems. Inspect current and previous revision IDs before trying again. An upstream change while the candidate is being verified aborts stale publication. A failed update preserves or restores production when the guard confirms it owns the deployment.
6. **Recover.** Follow [incident recovery](06-security-and-operations.md#deployment-and-rollback). If the active rollout changed externally, reconcile the actual version and the saved previous asset bytes before any authorised restore. Recheck the manifest, selected digest and browser flows before resuming normal operations.
7. **Verify production integrity.** Read the public manifest and release health, hash the selected bytes, verify the source provenance and locate the matching test run. Use the read-only commands in [the operations runbook](06-security-and-operations.md#verify-a-published-release).

[Maintenance job and health report](../../scripts/maintenance.ts) · [deduplicated issue reporting](../../scripts/maintenance-notify.ts) · [coverage and provenance](05-catalogue-contract.md).
