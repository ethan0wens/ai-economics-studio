# Microsoft retail catalogue and billing coverage

The 18 November 2026 baseline contained 17 configurations and 19 verified rate records. The matrix below records that baseline and its billing rules. See the [expanded catalogue](16-catalogue-scope-and-maintenance.md) for the current inventory, its denominator and maintenance instructions.

## Baseline coverage matrix

Azure entries are exact consumption meters in **GBP, UK South**. Commercial UK offers use **GBP and the UK market**, independent of the Azure region. The [retained inventory](../catalogue/retained.json) and [original Azure mapping list](../catalogue/pinned.json) give the exact service, product, SKU, ARM SKU, meter IDs and units. [Azure and commercial discovery evidence](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44411424226) · [Storage and networking evidence](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44410880187)

| Family | Configuration / object | Components and published unit | Source and scope |
| --- | --- | --- | --- |
| Foundry | GPT-4o mini 2024-07-18, Global Standard | Uncached input and output text, each per 1,000 tokens | Azure Retail, separate exact meters. Cached, batch, audio and other modes are outside this offer. |
| Foundry | GPT-4.1 mini 2025-04-14, Global Standard | Uncached input and output text, each per 1,000 tokens | Azure Retail, separate exact meters. Confirm deployment availability independently. |
| Foundry | Azure OpenAI Global Provisioned Managed | Per PTU-hour, once per deployment | Azure Retail. Verify model eligibility, minimum capacity and reservation terms separately. |
| Foundry | Agent execution, tool calls, retrieval and orchestration | Calls generate model token usage; separately billed tools need resource objects | No generic execution or tool fee is inferred. Model unpriced resources with evidence and manual rates. |
| Copilot Studio | Platform-managed pay-as-you-go | Per remaining billable Copilot Credit | Azure Retail. Contact Center Intelligence and other similarly named meters excluded. |
| Copilot Studio | Shared UK monthly 25,000-credit pack | Per purchased pack per month | Microsoft public offer. Explicitly link eligible agents. Other prepaid commitments and included consumption require separate reconciliation. |
| Copilot Studio | External models and specialised tools | No separate automatic model charge | A prompt integration does not establish primary model replacement. Model separately charged resources where applicable. |
| Licensing | Microsoft 365 Business Standard with Copilot | Per user/month, paid yearly, excluding VAT | UK Microsoft public bundle. The standalone Copilot add-on and other base licence requirements are distinct. |
| Licensing | Microsoft Agent 365 | Per user/month, annual commitment, excluding VAT | UK Microsoft public offer. Bundled E7 access, prerequisites and consumption are separate. |
| Licensing | Groups, licence links and existing or incremental seats | Explicit deduplicated seats. Owned seats add zero incremental cost. | Relationships describe assignment. Group population and overlapping groups do not create more seats. |
| Azure | Azure VM D2s v3 (Linux, standard) | Hours | Azure Retail. Windows, Spot and promotional rates excluded. |
| Azure | Azure AI Search Basic and Standard S1 | Search-unit-hours, one offer per SKU | Azure Retail. Enter replicas × partitions × hours. Additional search features may require separate charges. |
| Azure | Hot LRS Blob capacity | GB-month, graduated bands at 0, 51,200 and 512,000 | Azure Retail. Consolidate usage within one billing scope. |
| Azure | Hot LRS Blob writes | Published unit of 10,000 operations | Azure Retail. Enter individual writes. Reads, retrieval, replication and other storage classes are separate. |
| Azure | SQL Database Single Standard S0 | Database-days | Azure Retail, primary database only. Replicas and additional backup or storage are separate. |
| Azure | Internet egress, Internet routing preference | GB, graduated bands at 0, 100, 10,100, 50,100 and 150,100 | Azure Retail. The free band belongs to this precise tariff. Other routes and destinations need their own mapping. |
| Azure | Azure Monitor / Log Analytics and unlisted compute, storage, databases or networking | Manual rate and exact base unit | Log Analytics returned a free band whose billing-account eligibility must be checked. It is not applied to individual workspaces. |
| Security | Sentinel pay-as-you-go log analysis | Billable GB analysed | Azure Retail. Input usage after separately established free benefits. Other ingestion, storage, retention and log types are separate. |
| Security | Microsoft Entra ID P1 and Microsoft Entra Suite | Per user/month, paid yearly, excluding VAT | UK Microsoft public offers. Verify existing coverage and Suite prerequisites separately. |
| Security | Defender, Purview and unlisted Sentinel or Entra plans | Manual licence or resource rows if billable | Policy objects are declarative. They do not imply a service purchase or licence entitlement. |
| Organisational | Usage profiles, groups and relationships | No standalone bill | Workloads feed billable agents. Links describe scope and attribution. |

## Source review

- Automated rates come from the [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices). The provider's effective date differs from the manifest's successful API check. A missing or older-than-seven-days check is flagged. [Azure Search](https://azure.microsoft.com/en-gb/pricing/details/search/) · [Azure Blob Storage](https://azure.microsoft.com/en-gb/pricing/details/storage/blobs/) · [Azure bandwidth](https://azure.microsoft.com/en-gb/pricing/details/bandwidth/) · [OpenAI provisioning](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/provisioned-throughput) · [Sentinel](https://azure.microsoft.com/en-gb/pricing/details/microsoft-sentinel/)
- [Curated commercial prices](../scripts/commercial-pricing.ts) record the observation date, review expiry and terms. The current review expires **17 January 2027 at 23:59 UTC**. Expired records remain auditable and cease to qualify for automatic calculations. To renew them, reopen the same offer and check its exact SKU, rate, market, term, VAT treatment and prerequisites. Record evidence and update the observation and expiry dates. The Azure refresh does not scrape or re-date them. [Copilot Studio UK](https://www.microsoft.com/en-gb/microsoft-365-copilot/microsoft-copilot-studio#Pricing) · [Microsoft 365 Copilot UK](https://www.microsoft.com/en-gb/microsoft-365-copilot/pricing) · [Agent 365 UK](https://www.microsoft.com/en-gb/microsoft-agent-365) · [Entra UK](https://www.microsoft.com/en-gb/security/business/microsoft-entra-pricing)

## Calculation and precedence

1. A selected configuration determines the exact component, SKU, region or market, currency and billed unit. An applicable rate must be unique and effective, and a curated rate must be within its review period. A model identity, version, mode or billing-region change invalidates the old selection. Legacy object-scoped model overrides can be rebound on import when their saved SKU and region match the saved model. Unscoped rules without a model version remain retained for review.
2. Flat cost is monthly base units ÷ published quantity per unit × rate. Token quantity is executions × calls per execution × (1 + retry fraction) × tokens per call, separately for uncached input, output and any explicitly declared cached input. Provisioned quantity is capacity units × billable hours. The charge appears once per deployment. Allocation changes attribution only.
3. Graduated cost sums, over all bands, max(0, min(usage, next boundary) − start boundary) ÷ published quantity per unit × band rate. The last band has no upper limit. The ledger displays a blended unit rate at the entered usage. Duplicate selected copies of the same graduated tariff remain unresolved until consolidated, so a free band is not used twice.
4. Copilot cost is purchased packs × pack price plus residual billable credits × PAYG rate. Each purchased pack supplies 25,000 credits. Explicitly linked eligible agents share one pool in stable inventory order. An agent with multiple usable pack links has unresolved PAYG overage until that ambiguity is resolved. Enter consumed credits before the studio's linked pack, after any separate entitlement already reconciled elsewhere. Use one declared monthly total or a breakdown of already calculated billable credits. Microsoft’s activity-to-credit conversion and separate entitlement reconciliation remain the user’s inputs.
5. Licence cost is incremental, deduplicated seats × monthly per-seat equivalent. Declared owned seats add zero incremental cost. Annual commitments are shown as monthly equivalents with annual run-rate, without a payment schedule. Tax and foreign exchange are outside the estimate. For current ownership, eligibility, bundle and prerequisite modelling see [the enterprise evidence guide](18-licensing-and-technical-evidence.md).
6. An object-owner agreement wins over a matching environment agreement. Restore Microsoft retail explicitly bypasses a wider agreement for that owner. A fixed rate replaces retail, intentional zero requires a reason, and a percentage discount follows the latest applicable retail. An item forecast replaces the global forecast percentage. Fixed rates follow a forecast only with opt-in. Monetary costs round once per ledger line.
7. The dashboard, diagram, PDF and JSON export use this ledger. Catalogue completeness counts a configuration only when every required meter resolves. Environment completeness groups by billable object. Complete resolves all current lines; partial resolves some; unresolved has quantity but no priced line; waiting on configuration has no billable quantity. Retail and customer-supplied flags can overlap on a multi-meter object. Unresolved costs remain outside the known subtotal.

## Worked examples

These fictional inputs test the method. They are not published rates.

| Scenario | Independent calculation |
| --- | --- |
| Inference | 500 executions × 2 calls × 3,000 input and 1,000 output tokens. At £0.20 and £0.50 per 1,000 tokens, costs are £600 and £500. |
| Provisioned capacity | 4 PTUs × 100 hours × £0.25 = £100 for one shared deployment. |
| Graduated egress | 400 GB with 100 free, the next 200 at £0.10, and the final 100 at £0.04 costs £24. A 20% discount gives £19.20. A 10% item forecast gives £21.12. |
| Copilot and seats | A £100 pack covers 25,000 of 30,000 eligible credits. The 5,000 residual at £0.01 cost £50. Five new £10 seats add £50. Five owned seats add zero. Total £200. |

## Maintenance

**Refresh and deploy retail prices** runs daily and by manual dispatch. It rejects missing or ambiguous matches, unexpected units or tier boundaries, and material changes requiring review. A successful validated refresh writes a content-addressed asset, retains the last good version, and deploys to the existing Worker in the same run. An unsuccessful check leaves deployed prices unchanged. The app links to run outcomes because the last successful manifest cannot identify a newer failed run. The deployment guard independently compares public HTML, manifest and catalogue bytes to the build. [Operations runbook](12-operations.md)
