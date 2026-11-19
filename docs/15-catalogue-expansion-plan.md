# Catalogue expansion inventory and plan

19 November 2026

The starting point is **17 curated configurations and 19 verified rate records**. This is a useful seed for regression tests. It is an inadequate denominator for overall product coverage.

## Inventory to review

| Family | Inventory | Dimensions and constraints |
| --- | --- | --- |
| Foundry | OpenAI GPT-4o, GPT-4o mini, GPT-4.1, mini and nano; o-series and GPT-5 generation; embeddings and speech; DeepSeek, Llama, Mistral, Cohere, Grok and Anthropic partner models | Record model/version and Global Standard, Data Zone, regional or provisioned as distinct targets. Price input, output and cached input separately where the workload can distinguish them. Keep batch, audio, image, hosted fine-tuning and model-specific commitments explicit. Treat a price meter as billing evidence, with deployment availability and agent compatibility assessed separately. |
| Azure compute and containers | Linux D, E and F sizes; GPU shapes; Azure Kubernetes Service, Container Apps, Functions and Container Instances | VM hours, management tier, vCPU/GB-seconds, executions. Keep OS, Spot, reservation and tier identities distinct. |
| Azure storage and data | Blob Hot/Cool/Cold LRS and ZRS, storage operations, Azure AI Search, Azure SQL, Cosmos DB, PostgreSQL and Redis | Separate capacity, transactions, search units, DTU/vCore hours, request units and replication. Exclude ambiguous graduated, minimum or shared free bands until modelled. |
| Azure networking and operations | Egress, Private Link, NAT Gateway, Azure Monitor, Log Analytics, Application Insights, Event Hubs, Service Bus and Key Vault | Separate time, operations and traffic. Never infer shared grants, routes, costs bundled with other offers or account-level allowances. |
| Commercial licensing and security | Microsoft 365 E3/E5 and Business plans, Copilot add-ons, Agent 365, Entra plans, Defender for Business/Endpoint/Cloud, Purview and Sentinel | UK market initially. Keep commercial evidence, term, price, prerequisite, eligibility and included entitlement separate. Record unpriced offers in the inventory. |
| Copilot Studio | PAYG credits, monthly packs, capacity commitments, user-facing answers, actions, agent flows, and included use | These categories can consume the same credits. Record the consumption dimension without creating separate charges. Apply only the supported linked-pack allocation to eligible usage. |

The initial automatic billing survey targets UK South, West Europe and East US 2 in GBP, with UK commercial pricing separate. Listing a target region is not an availability guarantee. Unconfirmed combinations remain visible with unknown pricing. The same logical configuration can have multiple component meters, so record totals and configuration totals are reported separately.

## Implementation sequence

1. Move the retained configurations into reviewed data. Add independent product and billing templates, with reviewed meter selection rules separate from price rows. Expand reusable templates across named billing regions, including entries for unsupported tariffs and unconfirmed availability. Keep stable configuration keys for scenario export/import and price overrides.
2. Add bounded discovery queries against the official Azure Retail Prices API. Approve narrowly scoped service/product, exact SKU and meter naming rules and original billing units. Consume pagination only on the same API route. Reject ambiguous identities, unknown units, unsupported tiers and future price rows. Never discard the last validated catalogue after an incomplete or suspicious refresh.
3. Generate and version inventory and rates together as separate sections of the static content-addressed asset. A price-feed result must not define the inventory. Keep model compatibility and licence prerequisites separate from price applicability. Add selectors and extend token accounting only where verified component rules and explicit workload inputs support it.
4. Report total inventory, complete, partial, unpriced and unsupported counts by family and region, independently of current-environment completeness. Retain the 17-configuration baseline for comparison. Exercise strict discovery, binding stability, legacy import, prices and overrides, stale/missing data, browser rendering and the live Worker.
5. Verify the hosted feed and deploy through the existing production workflows. Publish the exact observed counts and remaining gaps after checking the live asset and dashboard.

[Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) · [Foundry model catalogue](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/foundry-models-overview) · [Copilot Studio licensing](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing) · [Current source inventory](14-retail-catalogue.md)
