import { retailDocs } from './catalogue';
import { microsoft } from './microsoft';

export type Requirement = 'Required' | 'Optional' | 'Conditional';
type Source = { label: string; href: string };
type Help = { label: string; requirement: Requirement; units: string; guidance: string; source?: Source };
const source = {
  foundry: { label: 'Microsoft Foundry connected models', href: microsoft.foundry },
  copilot: { label: 'Microsoft Copilot Studio licensing', href: microsoft.copilot },
  retail: { label: 'Microsoft Azure Retail Prices API', href: retailDocs },
  governance: { label: 'Microsoft Zero Trust guidance', href: microsoft.governance },
  licensing: { label: 'Microsoft licensing', href: 'https://www.microsoft.com/licensing/' },
  costs: { label: 'Studio pricing methodology', href: 'https://github.com/ethan0wens/ai-economics-studio/blob/main/docs/04-pricing-and-tco.md' },
} satisfies Record<string, Source>;

function help(label: string, requirement: Requirement, units: string, guidance: string, link?: Source): Help {
  return { label, requirement, units, guidance, source: link };
}

export const fieldHelp = {
  retailOffering: help('Microsoft retail configuration', 'Optional', 'One exact product or billing configuration', 'Choose a reviewed offer to apply its latest applicable Microsoft price. The market or billing region, currency and billed unit must match.', source.costs),
  objectName: help('Object name', 'Required', 'Text', 'Use a name your team will recognise in the inventory and reports. The name does not change costs.'),
  platform: help('Platform', 'Required', 'One platform', 'Choose where the agent runs. The platform determines which model links and usage inputs apply.', source.foundry),
  modelSource: help('Model source', 'Required', 'One model source', 'Choose platform-managed inference or link a Foundry deployment. Copilot Studio uses the platform-managed path for this estimate.', source.copilot),
  linkedDeployment: help('Model deployment', 'Conditional', 'One inventory deployment', 'Required for a linked Foundry model. Select the shared deployment this agent uses. Provisioned capacity is counted once.', source.foundry),
  autonomy: help('Autonomy', 'Optional', 'One level', 'Choose whether the agent reads only, writes after approval, or writes without approval. This informs governance guidance.'),
  sensitivity: help('Data sensitivity', 'Optional', 'One classification', 'Choose the highest sensitivity of data the agent handles. This informs data-protection guidance.', source.governance),
  identity: help('Identity', 'Optional', 'One identity type', 'Record whether access uses a delegated user identity or an application identity. This records your design assumption without granting permissions.', source.governance),
  tools: help('Tools and knowledge sources', 'Optional', 'Short description', 'List the tools and data sources the agent uses. Model any billable consumption as a supporting resource.'),
  modelId: help('Model identifier', 'Required', 'Model name or ID', 'Enter the exact model shown in Foundry. The identifier helps describe the deployment and provides its pricing identity when no SKU is entered.', source.foundry),
  modelVersion: help('Model version', 'Optional', 'Version label', 'Copy the version shown in Foundry. It records which deployment you are modelling.', source.foundry),
  sku: help('SKU', 'Optional', 'Exact SKU text', 'Copy the deployment SKU from your source. When provided, it replaces the model identifier in the model billing identity.', source.foundry),
  region: help('Region', 'Optional', 'Azure region code', 'Enter an Azure region code such as uksouth. Leave blank to inherit the environment region. Region is part of the billing identity.', source.retail),
  billingMode: help('Billing mode', 'Required', 'One billing mode', 'Use pay as you go for metered tokens or provisioned capacity for a shared capacity charge. Choose the mode from your deployment records.', source.costs),
  population: help('Total population', 'Optional', 'Whole people', 'Enter the full group size if known. The intended audience is checked against it.'),
  intended: help('Intended audience', 'Required', 'Whole people', 'Enter how many people the group is intended to serve. It must fit within the declared population. No adoption assumption is made.'),
  active: help('Monthly active users', 'Required', 'Whole people per month', 'Enter measured or planned monthly users. This must fit within the intended audience and does not create usage or seats automatically.'),
  interactions: help('Monthly interactions', 'Optional', 'Whole interactions per month', 'Record observed or planned group interactions. This does not populate an agent usage profile.'),
  product: help('Product or SKU', 'Optional', 'Exact product or SKU text', 'Copy the product or SKU from the agreement. It identifies the licence and helps flag possible duplicate entries.', source.licensing),
  procurement: help('Procurement state', 'Required', 'One state', 'Choose already owned, incremental, or unknown. Already-owned seats add zero incremental cost. Unknown procurement keeps the estimate incomplete.', source.costs),
  seats: help('Deduplicated seats', 'Conditional', 'Whole seats', 'Enter unique seats after accounting for overlaps. Incremental seats need a count and a price to produce a cost.', source.licensing),
  category: help('Resource category', 'Optional', 'Resource label', 'Describe the supporting service, such as an Azure VM. If you use a manual rate, this label helps identify its billing line.'),
  meter: help('Verified Azure retail meter', 'Optional', 'One exact catalogue meter', 'Select a meter only if it matches the resource, region and currency. Use a manual billing assumption if no matching rate is available.', source.retail),
  resourceQuantity: help('Monthly usage quantity', 'Required', 'Meter base units per month', 'Enter a monthly quantity in the selected meter’s base units. With a manual rate, use the same unit for your quantity and rate.', source.costs),
  control: help('Control', 'Required', 'One governance control', 'Choose the type of safeguard you are recording. Linked policies inform the relevant advisory checks.', source.governance),
  controlStatus: help('Declared status', 'Required', 'One known or unknown state', 'Record whether the safeguard is implemented, planned, absent, or unknown. This is your declaration for advisory reporting.'),
  controlNotes: help('Control notes', 'Optional', 'Short description', 'Record the evidence or assumptions behind the declared status. Notes do not change costs.'),
  executions: help('Monthly executions', 'Required', 'Whole executions per month', 'Count how many times the workload runs in an average month. Include downstream runs only in the profile that owns them.', source.costs),
  calls: help('Model calls per execution', 'Required', 'Average calls per execution', 'Enter the average number of model requests made by one run before retries. One run may make several requests.', source.costs),
  input: help('Input tokens per call', 'Required', 'Whole tokens per request', 'Enter uncached input tokens when using the separate cached input field. Use token counts, including prompt and context.', source.costs),
  cachedInput: help('Cached input tokens per call', 'Optional', 'Whole tokens per request', 'Enter input tokens billed under a documented cache-hit meter. Exclude these from other input tokens. A missing cache rate stays unknown and can be entered manually.', source.costs),
  output: help('Output tokens per call', 'Required', 'Whole tokens per request', 'Enter the average tokens generated by the model. Output usage is priced separately from input usage.', source.costs),
  retries: help('Additional retries (%)', 'Optional', '0 to 100%', 'Enter retries as extra calls above the base count. For example, 5 means five extra calls per 100 base calls. Blank adds no extra calls.', source.costs),
  toolCalls: help('Tool calls per execution', 'Optional', 'Average calls per execution', 'Record the expected number of tool calls for planning. Enter any billable tool consumption as a supporting resource.'),
  credits: help('Monthly Copilot credits', 'Conditional', 'Credits per month', 'Enter measured or planned credits for a platform-managed Copilot agent. Linked eligible UK monthly packs are applied once before the pay-as-you-go charge.', source.copilot),
  creditMethod: help('Copilot credit input method', 'Optional', 'Monthly total or activity breakdown', 'Use a total if you know it or enter credits by activity. The estimate uses one method at a time. Switching methods preserves your entries.', source.copilot),
  creditCategory: help('Billable Copilot credits by activity', 'Optional', 'Credits per month', 'Enter measured credits or credits calculated with Microsoft’s billing table. Include only billable use. Enter at least one category to estimate costs with a breakdown.', source.copilot),
  usageLink: help('Usage profile', 'Conditional', 'One inventory profile', 'Link a profile for pay-as-you-go token estimates or to allocate provisioned cost by input tokens. Links do not multiply traffic.', source.costs),
  capacity: help('Provisioned capacity units', 'Conditional', 'Capacity units', 'Required for a provisioned estimate. Copy the reserved capacity from your contract or deployment. Capacity is multiplied by hours.', source.costs),
  hours: help('Billable hours per month', 'Conditional', '0 to 744 hours per month', 'Required for a provisioned estimate. Enter hours for the month or contract period you are modelling. There is no assumed month length.', source.costs),
  allocation: help('Allocate fixed cost by declared input tokens', 'Optional', 'On or off', 'Apportion the existing fixed charge by the input-token shares of linked agents. Every agent needs usable input data. The total charge does not change.', source.costs),
  relationship: help('Relationship type', 'Conditional', 'One relationship type', 'Choose what the link represents. Model, usage, ownership and policy links have different effects.'),
  relationshipTarget: help('Target', 'Conditional', 'One compatible object', 'Select the target to enable linking. Only objects compatible with the relationship are listed.'),
  forecast: help('Global price change (%)', 'Optional', '−100 to 10,000%', 'Enter a hypothetical change. For example, 20 means a 20% increase. The current estimate stays unchanged.', source.costs),
  forecastFixed: help('Apply forecast to fixed contracts', 'Optional', 'On or off', 'Enable this only if you want fixed agreements to move in the forecast. It does not change their current contractual rates.', source.costs),
  scope: help('Apply to', 'Required', 'Object or environment', 'Choose whether the rule applies to this pricing owner or all matching meters in the environment. A deployment-owned rule can affect its linked agents.', source.costs),
  agreement: help('Price agreement', 'Required', 'One agreement type', 'Use catalogue pricing, a percentage discount, an agreed fixed rate, or intentional zero when the item is included.', source.costs),
  fixedRate: help('Fixed contractual rate', 'Conditional', 'Currency per billed unit', 'Enter the positive amount in the billing unit shown on this line. A fixed rate can supply a current estimate when retail pricing is unknown.', source.costs),
  discount: help('Agreement discount (%)', 'Conditional', '0 to 100%', 'Enter the reduction from a verified retail rate. For example, 15 means 15% off. A discount cannot supply a missing retail price.', source.costs),
  reason: help('Agreement reason', 'Conditional', 'Short explanation', 'Required when overriding retail pricing. Describe why this price applies, especially for intentional zero. Avoid confidential contract details.'),
  effective: help('Agreement effective date (UTC)', 'Optional', 'Calendar date in UTC', 'Set the first day the agreement applies. Leave blank to apply immediately. The rule starts at midnight UTC.', source.costs),
  exception: help('Forecast exception (%)', 'Optional', '−100 to 10,000%', 'Set a different forecast change for this meter or object. Leave blank to use the global change.', source.costs),
  exceptionFixed: help('Exception treatment of fixed contracts', 'Optional', 'Inherit, apply, or keep fixed', 'Choose how to treat fixed rates for this exception. The choice applies only when an exception percentage is entered.', source.costs),
  ledgerFilter: help('Filter by object, category or meter', 'Optional', 'Search text', 'Filter the visible ledger lines by a matching name, category, component or SKU. Totals are unchanged.'),
  priceStatus: help('Price status', 'Optional', 'One visible status', 'Show lines with the selected pricing status. Unknown means the current amount cannot be computed. Totals are unchanged.'),
  inventorySearch: help('Search inventory', 'Optional', 'Search text', 'Filter by object name or type. Search does not change the environment.'),
  inventoryType: help('Object type', 'Optional', 'One inventory type', 'Show only objects of the selected type. Choose All types to clear the filter.'),
  catalogueSearch: help('Find a catalogue configuration', 'Optional', 'Search text', 'Find a product, SKU, deployment mode or billing region. Filtering does not change published coverage totals.'),
  catalogueRegion: help('Filter by billing region or market', 'Optional', 'Azure billing region or commercial market', 'Limit the visible catalogue to one billing region or market. The filter does not change your environment or deployment eligibility.', source.retail),
  environmentName: help('Environment name', 'Required', 'Text', 'Name this planning scenario. The name appears in the workspace and exports.'),
  description: help('Description', 'Optional', 'Short description', 'Record the scope of this environment. This text does not change calculations.'),
  defaultRegion: help('Default region', 'Required', 'Azure region code', 'Enter the region used by objects that have no explicit region. Catalogue matching uses this region for those objects.', source.retail),
  currency: help('ISO currency', 'Required', 'Three-letter ISO currency code', 'Enter a code such as GBP. The ledger matches rates in this currency. It does not convert prices from other currencies.', source.costs),
  importFile: help('Import JSON', 'Optional', 'Studio JSON file', 'Choose an exported Studio environment file. Import validates the file and replaces the open environment.'),
} satisfies Record<string, Help>;

export type FieldId = keyof typeof fieldHelp;
