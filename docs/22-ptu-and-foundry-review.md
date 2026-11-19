# Provisioned capacity and Foundry review

19 November 2026. Published baseline verified from the public Worker during the [hosted evidence review](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44510383189). No changes to the Worker name or static delivery architecture were needed.

## Capacity and billing

[Microsoft’s sizing table](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/provisioned-throughput-sizing#deployment-parameters-and-throughput-values-by-model) identifies the model version, mode, minimum and scale increment independently of the hourly tariff. The studio scopes each sizing entry to positive region evidence. For example, GPT-4.1 (2025-04-14) requires at least 15 PTUs in steps of five for the documented Global and Data Zone configurations. Its Regional provisioned requirement is 50 PTUs in steps of 50. GPT-4.1 mini and GPT-5 mini require 25 in steps of 25 for the reviewed Regional configurations. The [dated sizing catalogue](../catalogue/provisioned.json) stores exact model versions, deployment SKUs, regions, and published reference throughput. The editor flags invalid counts and excludes the capacity amount from known TCO. Missing or expired sizing evidence does not establish a minimum.

An unreserved deployment costs PTUs × billable hours × its exact hourly rate. The fixed charge appears once and allocations use declared input shares. Where the user provides an exclusive customer reservation allocation, the commitment is the quoted total divided by the evidenced one-month or one-year term. Covered monthly PTU-hours equal the smaller of deployed and allocated PTUs × user-confirmed covered hours. The remaining PTU-hours continue at the exact hourly rate. The retail comparator retains the full unreserved quantity, while current and forecast show the commitment and the uncovered hourly charge separately. A changed quote scope, incomplete allocation or duplicated allocation reference stays unresolved. After the declared term the model returns to hourly billing. Contract discounts and scenario adjustments for uncovered hourly usage retain the existing precedence. The commitment does not inherit a forecast change.

The [official reservation billing documentation](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/provisioned-throughput-billing) describes matching by product, scope and time, including cross-region benefits of some Global reservations. This tool accepts only a user-priced, exclusive allocation for the modelled deployment. It does not infer applicability, dynamically allocate tenant-wide capacity, or apply an automatic discount. Bounded GBP Azure Retail API searches for OpenAI Reservation records returned no rows. No reservation tariff has been promoted to verified retail. Use Azure’s pricing calculator or a customer quote for the exact reservation. [Reservation tariff search](https://github.com/ethan0wens/ai-economics-studio/actions/runs/44512435158)

A selected PAYG alternative must be the same model and exact version. The comparison uses one distinct usage profile per linked agent and current verified retail input, output and applicable cached-input rates. Cost amounts round per workload component. This is a comparison for the declared monthly demand. The alternative billing location is displayed. Actual deployment location, throughput and latency still need independent review. Where the sizing source supplies both factors, peak normalized TPM equals declared uncached input TPM plus declared output TPM × the published weight. Multiplying the reference input TPM per PTU by selected PTUs supplies a comparison point only. Missing peak observations or a model-specific formula keeps feasibility unverified. A modelled headroom or shortfall is conditional on workload shape, cache behaviour, quota and available capacity.

## Compatibility and lifecycle

The previous 144 combinations remain in the reference scope. The audit below shows the outcome for each of the 38 previously unverified cells. Exact table marks establish positive or negative evidence. A missing row or location remains unverified. Newly researched combinations come from published model/version and region cells. This does not create a rectangular grid for newer models whose modes or locations are absent from the evidence. Technical capability records cover model inputs and outputs, and relevant API support. Embedding and speech evidence is separate from the existing workload billing objects. A model-level capability does not establish support for a particular agent or tool.

Newer GPT versions with positive standard deployment evidence are selectable. Release placement and billing region are distinct. The exact token price remains unknown unless the Azure feed supplies an independently validated meter. Existing offering IDs, including historical billing labels, are unchanged. A saved model can record its actual version separately. The selected SKU does not by itself establish legal data residency. Microsoft describes Global, Data Zone and Regional processing scope in the deployment guidance. Confirm the service, region, modality and terms for the intended deployment. [Regional model tables](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability) · [Processing scope by deployment type](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types)

The lifecycle review records dates separately from a listed regional availability cell. Examples include o1, o3, o3-mini and o4-mini scheduled for retirement on 19 November 2026, plus the published retirement dates for older GPT-4o and GPT-4.1 versions. The tool surfaces lifecycle findings and keeps historical billing references usable for saved environments. Check Microsoft’s schedule exceptions and effective dates before migration. [Model retirement schedule](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule)

## Prior unverified combinations

| Model and exact version | Deployment SKU | Region | Recheck |
| --- | --- | --- | --- |
| deepseek-v3.2 · 1 | `DataZoneProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| deepseek-v3.2 · 1 | `DataZoneStandard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| deepseek-v3.2 · 1 | `ProvisionedManaged` | eastus2 | Unverified. Exact mode, region or version cell missing from reviewed table. |
| deepseek-v3.2 · 1 | `ProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| deepseek-v3.2 · 1 | `ProvisionedManaged` | westeurope | Unverified. Exact mode, region or version cell missing from reviewed table. |
| deepseek-v3.2 · 1 | `Standard` | eastus2 | Unverified. Exact mode, region or version cell missing from reviewed table. |
| deepseek-v3.2 · 1 | `Standard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| deepseek-v3.2 · 1 | `Standard` | westeurope | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1 · 2025-04-14 | `DataZoneProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1 · 2025-04-14 | `DataZoneStandard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1-mini · 2025-04-14 | `DataZoneProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1-mini · 2025-04-14 | `DataZoneStandard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1-nano · 2025-04-14 | `DataZoneProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1-nano · 2025-04-14 | `DataZoneStandard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1-nano · 2025-04-14 | `Standard` | eastus2 | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1-nano · 2025-04-14 | `Standard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4.1-nano · 2025-04-14 | `Standard` | westeurope | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4o · 2024-05-13 | `DataZoneProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4o · 2024-05-13 | `DataZoneProvisionedManaged` | westeurope | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-05-13 | `DataZoneStandard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4o · 2024-05-13 | `ProvisionedManaged` | eastus2 | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-05-13 | `ProvisionedManaged` | uksouth | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-05-13 | `ProvisionedManaged` | westeurope | Published unavailable cell |
| gpt-4o · 2024-08-06 | `DataZoneProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4o · 2024-08-06 | `DataZoneProvisionedManaged` | westeurope | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-08-06 | `DataZoneStandard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4o · 2024-08-06 | `ProvisionedManaged` | eastus2 | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-08-06 | `ProvisionedManaged` | uksouth | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-08-06 | `ProvisionedManaged` | westeurope | Published unavailable cell |
| gpt-4o · 2024-11-20 | `DataZoneProvisionedManaged` | eastus2 | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-11-20 | `DataZoneProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4o · 2024-11-20 | `DataZoneProvisionedManaged` | westeurope | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-11-20 | `DataZoneStandard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4o · 2024-11-20 | `ProvisionedManaged` | eastus2 | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-11-20 | `ProvisionedManaged` | uksouth | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o · 2024-11-20 | `ProvisionedManaged` | westeurope | Published positive cell. Quota and capacity require confirmation. |
| gpt-4o-mini · 2024-07-18 | `DataZoneProvisionedManaged` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |
| gpt-4o-mini · 2024-07-18 | `DataZoneStandard` | uksouth | Unverified. Exact mode, region or version cell missing from reviewed table. |

The retained grid moves from 49 compatible, 43 conditional, 14 incompatible and 38 unverified to 49 compatible, 54 conditional, 16 incompatible and 25 unverified. The expanded evidence scope contains 376 exact combinations, including 158 compatible, 133 conditional, 60 incompatible and 25 unverified. Lifecycle findings are assessed independently.


## Financial cross-checks

[Independent tests](../tests/provisioned.test.ts) extend the six unchanged enterprise fixtures. With fictional rates, a valid shared Global capacity bill is 45 × 400 h × £0.40 = £7,200. With £200 of shared infrastructure, monthly total is £7,400. A Regional example uses 50 × 400 × £0.60, or £12,200 with the same infrastructure. Ten PTUs and step-invalid 17 PTUs produce an unresolved capacity charge for the reviewed Global GPT-4.1 scope.

The fictional 12-month reservation case makes £36,000 ÷ 12 = £3,000 per month and covers 30 × 400 = 12,000 PTU-hours. The remaining 6,000 hours multiplied by £0.40 cost £2,400. Total provisioned cost is £5,400, with £5,600 across the environment. The hypothetical alternative uses 550,000 uncached input, 50,000 cached input and 330,000 output tokens, giving £3.77 after rounding. The provisioned-minus-PAYG difference is £5,396.23 for those inputs. The browser test checks the same costs in the dashboard, graph, JSON and PDF.

Run `npm run evidence:validate` alongside pricing validation and tests. To renew evidence, rerun the read-only source survey, inspect exact source rows and conflicts, then update UTC review dates in Git only for claims actually reviewed. Pricing refresh never promotes model availability or entitlement evidence.
