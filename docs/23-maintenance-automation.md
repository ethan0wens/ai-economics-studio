# Catalogue maintenance

## Audit before implementation

Baseline at `2b16979`, with 418 configurations and 377 verified prices. `refresh-pricing.yml` already refreshes the Azure Retail Prices API daily and on dispatch. It pages through bounded, reviewed meter queries, rejects missing or materially changed tariffs, produces immutable catalogue assets, runs regression tests and deploys in the same workflow. It pushed the manifest before live verification. `deploy.yml` independently shipped application changes and both jobs used the same production lock. Both verified public build bytes, and the client could fall back one catalogue generation. Cloudflare rollback required an operator.

`enterprise-evidence.yml` and the pricing discovery/preview workflows produce useful read-only diagnostics. Microsoft UK prices, entitlements, compatibility, PTU sizing and model retirement required editing JSON manually. Diagnostic excerpts never renewed review dates. The build validates associations and the independent financial suite still derives expected amounts from the documented scenarios. The catalogue screen showed Azure freshness and rate coverage but no source-level evidence health or exception history. Failures were visible in workflow logs and annotations.

## Expansion plan

Keep the daily retail refresh and its single writer. Add daily UK offer change detection and weekly claim reconciliation to that run, with dispatch and a read-only rehearsal using the existing evidence survey workflow. Parse exact UK offer cards and published compatibility, sizing and retirement tables. Make rule-specific source checks the basis for renewing entitlement and integration evidence. Track unavailable sources and ambiguous matches separately and retain historical values through their documented expiry.

Run semantic validators, independent financial and browser tests before deploy. Verify the existing Worker, retain its previous active version, compare the served release and pricing snapshot, run public browser checks, and publish the repository snapshot only after verification. On failure restore the previous Worker version and leave the repository snapshot intact. Expose the maintained evidence and unresolved entries as compact static catalogue health data. Use grouped, deduplicated GitHub issues for exceptions requiring action.
