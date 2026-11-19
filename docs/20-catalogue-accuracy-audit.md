# Catalogue accuracy audit

Baseline at `9ee9162`, checked on 19 November 2026. The published manifest last checked at 10:35 UTC identifies 365 rates and 367 configurations, including 39 UK seat offerings with 25 priced. The evidence registry contains 15 entitlement rules. The retained model/version/SKU/region grid is 144 combinations, with 49 compatible, 43 conditional, 14 incompatible and 38 unverified.

## Provisioned billing before this change

The current ledger multiplies declared PTUs by monthly billable hours and the selected PTU-hour rate. Global, Regional and Data Zone tariff identities are independent. The generic Azure OpenAI billing offer does not determine an actual model version. Shared capacity produces one line regardless of linked agents. Optional allocation uses declared input token shares and cumulative rounding. It does not size capacity.

Compatibility currently has a general quota and minimums message. The editor accepts fractional or below-minimum PTUs. A technically invalid capacity plan can display a known cost. The ledger does not represent a separate reservation commitment or compare an explicit alternative PAYG workload. It does not support a throughput guarantee, tenant-specific quota, lifecycle dates or a break-even calculation.

## Licensing and evidence review plan

Use the stable UK offering IDs and carry all previous scope entries forward. Research the 14 unpriced IDs against official UK offer pages, Product Terms, and relevant licensing and feature descriptions. Treat unavailable standalone offers, sales-led pricing, promotional starting prices, and failed source retrieval as different outcomes. A provider price entry requires the exact subscription, monthly-equivalent billing unit, GBP price, term and VAT treatment. Existing expenditure, replacement, assignment and overlap mechanics remain separate.

Recheck the retained model grid against exact version, mode and region cells. Publish source-backed additions with provenance and keep unresolved prior cells visible. A pricing meter establishes a tariff only. Review lifecycle independently. Capture PTU minimums, increments and throughput references for the exact scope documented by Microsoft. Keep reservation price evidence and alternative token assumptions separate from hourly PTU tariffs.
