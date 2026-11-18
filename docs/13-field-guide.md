# Studio field guide

The studio provides contextual help for 58 fields. **Required** describes the inputs needed to complete a configuration or estimate. Drafts can be exported with missing inputs. **Conditional** means the requirement depends on the selected platform, billing mode, or action. **Optional** fields can be left blank.

Essential shows the inputs needed to get started. Detailed adds context and secondary assumptions. Advanced reveals specialist settings where available. Switching levels preserves saved inputs and does not change the estimate.

An **Unknown price** badge means at least one line has a usage quantity but lacks a current amount. A **Draft** badge signals missing configuration or usage inputs. **Needs review** covers other unresolved issues, including compatibility and governance.

## Workspace and inventory

| Field | Requirement | Unit or format | Effect and guidance |
| --- | --- | --- | --- |
| Environment name | Required | Text | Name this planning scenario. The name appears in the workspace and exports. |
| Description | Optional | Short description | Record the scope of this environment. This text does not change calculations. |
| Default region | Required | Azure region code | Enter the region used by objects that have no explicit region. Catalogue matching uses this region for those objects. [Microsoft Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) |
| ISO currency | Required | Three-letter ISO currency code | Enter a code such as GBP. The ledger matches rates in this currency. It does not convert prices from other currencies. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Import JSON | Optional | Studio JSON file | Choose an exported Studio environment file. Import validates the file and replaces the open environment. |
| Search inventory | Optional | Search text | Filter by object name or type. Search does not change the environment. |
| Object type | Optional | One inventory type | Show only objects of the selected type. Choose All types to clear the filter. |
| Object name | Required | Text | Use a name your team will recognise in the inventory and reports. The name does not change costs. |

## Agents and links

| Field | Requirement | Unit or format | Effect and guidance |
| --- | --- | --- | --- |
| Platform | Required | One platform | Choose where the agent runs. The platform determines which model links and usage inputs apply. [Microsoft Foundry connected models](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models) |
| Model source | Required | One model source | Choose platform-managed inference or link a Foundry deployment. Copilot Studio uses the platform-managed path for this estimate. [Microsoft Copilot Studio licensing](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions) |
| Model deployment | Conditional | One inventory deployment | Required for a linked Foundry model. Select the shared deployment this agent uses. Provisioned capacity is counted once. [Microsoft Foundry connected models](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models) |
| Autonomy | Optional | One level | Choose whether the agent reads only, writes after approval, or writes without approval. This informs governance guidance. |
| Data sensitivity | Optional | One classification | Choose the highest sensitivity of data the agent handles. This informs data-protection guidance. [Microsoft Zero Trust guidance](https://learn.microsoft.com/en-us/security/zero-trust/) |
| Identity | Optional | One identity type | Record whether access uses a delegated user identity or an application identity. This records your design assumption without granting permissions. [Microsoft Zero Trust guidance](https://learn.microsoft.com/en-us/security/zero-trust/) |
| Tools and knowledge sources | Optional | Short description | List the tools and data sources the agent uses. Model any billable consumption as a supporting resource. |
| Monthly Copilot credits | Conditional | Credits per month | Enter your measured or planned total for a platform-managed Copilot agent. Use plan-specific evidence and supply a price separately. [Microsoft Copilot Studio licensing](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions) |
| Usage profile | Conditional | One inventory profile | Link a profile for pay-as-you-go token estimates or to allocate provisioned cost by input tokens. Links do not multiply traffic. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Relationship type | Conditional | One relationship type | Choose what the link represents. Model, usage, ownership and policy links have different effects. |
| Target | Conditional | One compatible object | Select the target to enable linking. Only objects compatible with the relationship are listed. |

## Model deployments

| Field | Requirement | Unit or format | Effect and guidance |
| --- | --- | --- | --- |
| Model identifier | Required | Model name or ID | Enter the exact model shown in Foundry. The identifier helps describe the deployment and provides its pricing identity when no SKU is entered. [Microsoft Foundry connected models](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models) |
| Model version | Optional | Version label | Copy the version shown in Foundry. It records which deployment you are modelling. [Microsoft Foundry connected models](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models) |
| SKU | Optional | Exact SKU text | Copy the deployment SKU from your source. When provided, it replaces the model identifier in the model billing identity. [Microsoft Foundry connected models](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/connected-models) |
| Region | Optional | Azure region code | Enter an Azure region code such as uksouth. Leave blank to inherit the environment region. Region is part of the billing identity. [Microsoft Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) |
| Billing mode | Required | One billing mode | Use pay as you go for metered tokens or provisioned capacity for a shared capacity charge. Choose the mode from your deployment records. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Provisioned capacity units | Conditional | Capacity units | Required for a provisioned estimate. Copy the reserved capacity from your contract or deployment. Capacity is multiplied by hours. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Billable hours per month | Conditional | 0 to 744 hours per month | Required for a provisioned estimate. Enter hours for the month or contract period you are modelling. There is no assumed month length. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Allocate fixed cost by declared input tokens | Optional | On or off | Apportion the existing fixed charge by the input-token shares of linked agents. Every agent needs usable input data. The total charge does not change. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |

## Usage profiles

| Field | Requirement | Unit or format | Effect and guidance |
| --- | --- | --- | --- |
| Monthly executions | Required | Whole executions per month | Count how many times the workload runs in an average month. Include downstream runs only in the profile that owns them. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Model calls per execution | Required | Average calls per execution | Enter the average number of model requests made by one run before retries. One run may make several requests. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Input tokens per call | Required | Whole tokens per request | Enter the average tokens sent to the model, including prompt and context. Use token counts rather than words or characters. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Output tokens per call | Required | Whole tokens per request | Enter the average tokens generated by the model. Output usage is priced separately from input usage. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Additional retries (%) | Optional | 0 to 100% | Enter retries as extra calls above the base count. For example, 5 means five extra calls per 100 base calls. Blank adds no extra calls. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Tool calls per execution | Optional | Average calls per execution | Record the expected number of tool calls for planning. Enter any billable tool consumption as a supporting resource. |

## User groups and licence entitlements

| Field | Requirement | Unit or format | Effect and guidance |
| --- | --- | --- | --- |
| Total population | Optional | Whole people | Enter the full group size if known. The intended audience is checked against it. |
| Intended audience | Required | Whole people | Enter how many people the group is intended to serve. It must fit within the declared population. No adoption assumption is made. |
| Monthly active users | Required | Whole people per month | Enter measured or planned monthly users. This must fit within the intended audience and does not create usage or seats automatically. |
| Monthly interactions | Optional | Whole interactions per month | Record observed or planned group interactions. This does not populate an agent usage profile. |
| Product or SKU | Optional | Exact product or SKU text | Copy the product or SKU from the agreement. It identifies the licence and helps flag possible duplicate entries. [Microsoft licensing](https://www.microsoft.com/licensing/) |
| Procurement state | Required | One state | Choose already owned, incremental, or unknown. Already-owned seats add zero incremental cost. Unknown procurement keeps the estimate incomplete. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Deduplicated seats | Conditional | Whole seats | Enter unique seats after accounting for overlaps. Incremental seats need a count and a price to produce a cost. [Microsoft licensing](https://www.microsoft.com/licensing/) |

## Supporting resources

| Field | Requirement | Unit or format | Effect and guidance |
| --- | --- | --- | --- |
| Resource category | Optional | Resource label | Describe the supporting service, such as an Azure VM. If you use a manual rate, this label helps identify its billing line. |
| Verified Azure retail meter | Optional | One exact catalogue meter | Select a meter only if it matches the resource, region and currency. Use a manual billing assumption if no matching rate is available. [Microsoft Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) |
| Monthly usage quantity | Required | Meter base units per month | Enter a monthly quantity in the selected meter’s base units. With a manual rate, use the same unit for your quantity and rate. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |

## Security policies

| Field | Requirement | Unit or format | Effect and guidance |
| --- | --- | --- | --- |
| Control | Required | One governance control | Choose the type of safeguard you are recording. Linked policies inform the relevant advisory checks. [Microsoft Zero Trust guidance](https://learn.microsoft.com/en-us/security/zero-trust/) |
| Declared status | Required | One known or unknown state | Record whether the safeguard is implemented, planned, absent, or unknown. This is your declaration for advisory reporting. |
| Control notes | Optional | Short description | Record the evidence or assumptions behind the declared status. Notes do not change costs. |

## Pricing and ledger

| Field | Requirement | Unit or format | Effect and guidance |
| --- | --- | --- | --- |
| Global price change (%) | Optional | −100 to 10,000% | Enter a hypothetical change. For example, 20 means a 20% increase. The current estimate stays unchanged. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Apply forecast to fixed contracts | Optional | On or off | Enable this only if you want fixed agreements to move in the forecast. It does not change their current contractual rates. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Apply to | Required | Object or environment | Choose whether the rule applies to this pricing owner or all matching meters in the environment. A deployment-owned rule can affect its linked agents. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Price agreement | Required | One agreement type | Use catalogue pricing, a percentage discount, an agreed fixed rate, or intentional zero when the item is included. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Fixed contractual rate | Conditional | Currency per billed unit | Enter the positive amount in the billing unit shown on this line. A fixed rate can supply a current estimate when retail pricing is unknown. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Agreement discount (%) | Conditional | 0 to 100% | Enter the reduction from a verified retail rate. For example, 15 means 15% off. A discount cannot supply a missing retail price. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Agreement reason | Conditional | Short explanation | Required when overriding retail pricing. Describe why this price applies, especially for intentional zero. Avoid confidential contract details. |
| Agreement effective date (UTC) | Optional | Calendar date in UTC | Set the first day the agreement applies. Leave blank to apply immediately. The rule starts at midnight UTC. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Forecast exception (%) | Optional | −100 to 10,000% | Set a different forecast change for this meter or object. Leave blank to use the global change. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Exception treatment of fixed contracts | Optional | Inherit, apply, or keep fixed | Choose how to treat fixed rates for this exception. The choice applies only when an exception percentage is entered. [Studio pricing methodology](https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md) |
| Filter by object, category or meter | Optional | Search text | Filter the visible ledger lines by a matching name, category, component or SKU. Totals are unchanged. |
| Price status | Optional | One visible status | Show lines with the selected pricing status. Unknown means the current amount cannot be computed. Totals are unchanged. |
