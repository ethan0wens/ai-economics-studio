# Microsoft Foundry and Azure supporting services

This chapter describes what a studio plan can represent. Microsoft defines availability, capabilities, billing and tenant constraints. Consult the exact dated sources below for a real deployment. Prices in the catalogue identify billing configurations, and customer confirmation remains necessary for availability, quota and performance.

## Foundry model and deployment identity

A Foundry agent uses `platform: "foundry-agent-service"` and `modelSource: "deployment-ref"` for the linked-model cost path. The link points to one model deployment. Selection is exact across model ID, version, deployment SKU and billing mode. `offeringId` binds a component set and currency from the catalogue. A custom configuration can describe other plans and may require manual rates and independent verification.

The scoped inventory covers reviewed Azure OpenAI configurations, including GPT families and selected model variants with exact regional cells. It can also list other discovered Foundry configurations with missing tariffs. Use the generated model table below as the listing of versions, billing modes, regions and price availability. Inspect the separate regional evidence table for the actual deployment. `GlobalStandard`, regional `Standard` and `DataZoneStandard` can be priced as distinct offerings. The three reviewed provisioned SKU families have their own hourly tariff identities. Values may vary by version and billing region. [Offering definitions](../../src/offerings.ts) · [Microsoft regional availability](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability).

| Question | Evidence and modelling input |
| --- | --- |
| What does one token cost? | Match tariff, billing geography, currency, model, version, deployment SKU and component. Input and output prices are independent. A third cached input quantity requires its own applicable tariff or documented manual rate. |
| Can it run in the planned location? | Match actual deployment region, version and deployment SKU to dated exact-region evidence. The billing region is a separate field. |
| Does the model support a capability? | Check requested input/output modality and feature against reviewed capability cells. Integration constraints depend on the agent and API path. A missing row yields unverified evidence. |
| Is it still available? | Use exact scoped lifecycle evidence. An applicable effective retirement can block a priced path while evidence is current. A no-earlier-than notice is advisory. |

The [compatibility module](../../src/compatibility.ts) returns verified compatible, conditionally compatible, verified incompatible or unverified, with source and review date where known. Expired rows become unverified. The finance path suppresses specific known incompatible quantities. A priced line with a conditional or unverified finding still requires review. The [Foundry connected models guide](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models) is an external source for the supported service paths.

## Provisioned capacity and PTU constraints

A provisioned deployment needs its actual model/version for sizing if the billing tariff covers generic capacity. The studio resolves current sizing evidence using model identity, SKU and actual deployment geography. Whole PTUs are required. When an exact reviewed minimum and increment exist, valid capacity meets the minimum and advances in that increment. A missing location, expired row or unreviewed version can leave sizing unverified.

For a supported sizing reference, estimated peak demand is declared uncached input tokens per minute plus weighted output tokens per minute. The comparable capacity is reference input tokens per minute per PTU multiplied by capacity. This is advisory. Microsoft quota, request shape, throughput, latency and real availability require separate checks. A [customer reservation](03-ledger-methodology.md#provisioned-capacity-and-allocation) can price agreed capacity shares and dates. The studio does not derive a customer's quote from a public commitment price.

See [provisioned code](../../src/provisioned.ts), [dated sizing evidence](../../catalogue/provisioned.json), [Microsoft sizing](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/provisioned-throughput-sizing) and [Microsoft provisioned billing](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/provisioned-throughput-billing).

## Supporting Azure services

Use the exact Azure product and billed unit from the applied catalogue. The scoped offer families cover examples such as Azure AI Search, compute VMs and container/serverless usage, storage and operations, Cosmos DB, Key Vault, network transfer and monitoring/security services. Discovery targets and unit mapping define the supported subset. Some product families require multiple dimensions or manual assumptions. Inspect [scope](../../catalogue/scope.json), [reviewed gaps](../../catalogue/gaps.json) and [catalogue contracts](05-catalogue-contract.md).

| Example dimension | Quantity the user supplies | Considerations |
| --- | --- | --- |
| Azure AI Search | Search-unit-hours for the selected tier | Enter the modelled capacity and hours in the matching unit. Private Search integration and deployment availability are separate evidence. |
| VM and compute | Runtime hours or the exact scoped unit | Use actual billable hours. Storage, egress or ancillary services have their own lines where supported. |
| Blob and database | Capacity, individual operations or throughput in the meter's declared base units | A billed block uses `quantityPerUnit`. Graduated bands may require aggregation across the same tariff scope. |
| Key Vault | Monthly operations | Rates can cover blocks such as 10,000 operations. Check the exact operation class. |
| Transfer, monitoring and security | Transfer or ingested GB, or another exact billed dimension | Free first bands and graduated overage apply only when evidenced. Actual network paths, included allowances and retention need customer confirmation. |

The studio records and prices resources. It has no Azure management operation. Agent and deployment links can supply relevance or enable a named compatibility check. Setting an offering ID alone does not establish this integration.
