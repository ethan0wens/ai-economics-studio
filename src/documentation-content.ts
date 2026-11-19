import type { Destination } from './navigation';

export const topics = ['Getting started', 'Building environments', 'Understanding costs', 'Worked examples',
  'Pricing and evidence methodology', 'Technical reference', 'Troubleshooting', 'Privacy and limitations', 'Glossary and FAQs'] as const;
export type Topic = typeof topics[number];
export type Section = { id: string; title: string; paragraphs: string[]; steps?: string[] };
type ToolLink = { page: Destination; item?: string; label: string };
export type Article = {
  id: string; title: string; intro: string; topic: Topic; sections: Section[]; related: string[];
  aliases?: string[]; tool?: ToolLink; reference?: 'pricing' | 'models' | 'coverage' | 'units'; sources?: [string, string][];
};
export const documentationVersion = 'Reviewed 19 November 2026';
const s = (id: string, title: string, text: string | string[], steps?: string[]): Section =>
  ({ id, title, paragraphs: Array.isArray(text) ? text : [text], steps });
const catalogue: ToolLink = { page: 'catalogue', label: 'Open the Pricing Catalogue' };
const builder: ToolLink = { page: 'builder', label: 'Open Environment Builder' };
const costs: ToolLink = { page: 'costs', label: 'Open Cost & Value Analysis' };
const reports: ToolLink = { page: 'reports', label: 'Open Reports & Export' };
const home: ToolLink = { page: 'home', label: 'Open Home' };
const retailSource: [string, string] = ['Microsoft Azure Retail Prices API', 'https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices'];
const creditSource: [string, string] = ['Microsoft Copilot Studio credit and activity guidance', 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management'];
const sizingSource: [string, string] = ['Microsoft provisioned throughput sizing', 'https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/provisioned-throughput-sizing'];
const regionSource: [string, string] = ['Microsoft Foundry regional availability', 'https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability'];
const licensingSource: [string, string] = ['Microsoft Copilot licensing options', 'https://learn.microsoft.com/en-us/copilot/plan/copilot-license-options'];

export const articles: Article[] = [
  { id: 'quickstart', topic: 'Getting started', title: 'How do I build my first AI cost estimate?', intro: 'Start with one Microsoft AI workload, estimate its costs and share what you know with your team.',
    aliases: ['getting started', 'create environment', 'create your first estimate'], tool: home, related: ['choose-platforms', 'read-your-estimate', 'save-and-reopen'], sections: [
      s('start', 'Start with one workload', 'Use a name you will recognise in a report, such as Internal support assistant. Guided lets you price a small part of the solution before modelling the rest.', [
        'On Home, enter a name and choose Create environment.', 'Choose a platform and continue to Build your AI solution. Enter an agent name and choose Add agent.',
        'For a linked Foundry agent, select a model configuration or reuse a deployment. For Copilot Studio, continue to Estimate usage.',
        'Enter known usage directly, or choose Help me estimate usage to preview quantities before applying them. Use Try example usage only to explore an illustrative workload.',
      ]),
      s('share', 'Review and share your work', 'Check the running estimate and use Improve your estimate to review missing inputs. The known-cost subtotal excludes unresolved charges.', [
        'Open Reports & Export. Generate PDF for a shareable estimate with sources and gaps.',
        'Export JSON if you want to reopen and edit this workspace later.',
      ]),
    ] },
  { id: 'choose-platforms', topic: 'Getting started', title: 'How do I choose between Foundry and Copilot Studio?', intro: 'Choose the platform that actually runs each workload. The platform determines which usage and billing inputs appear.',
    tool: builder, related: ['agents-and-models', 'foundry-usage', 'copilot-credits'], sections: [
      s('choose-a-path', 'Choose a path', ['Use Microsoft Foundry when you are planning an agent with a linked model deployment. Select token-based or provisioned billing for the actual deployment.',
        'Use Copilot Studio for a platform-managed business agent. Enter planned monthly Copilot Credits. The standard path has one credit charge and does not add independent Foundry inference.']),
      s('combine', 'Plan both platforms together', 'Choose Both platforms, then select the platform for each new agent. Shared Azure services and licences can exist in the same environment. A Foundry model used by a separately evidenced Copilot prompt can be modelled in Advanced.'),
    ] },
  { id: 'save-and-reopen', topic: 'Getting started', title: 'How do I share or reopen an estimate?', intro: 'Export JSON to keep editing later. Generate a PDF to share the estimate and its recorded assumptions.',
    tool: reports, related: ['privacy', 'environment-file', 'import-or-export-problems'], sections: [
      s('save', 'Export before leaving', 'In Reports & Export, choose Export JSON. It includes objects, relationships, pricing assumptions and the last estimate snapshot. The export includes applied usage quantities and any notes in the environment description. Accepted value assumptions are included. Temporary comparisons stay outside JSON and ordinary PDFs. Check your browser’s downloads to find the file.'),
      s('report-formats', 'Choose a PDF format', 'Choose Executive Summary to share monthly and annualised figures, cost drivers and significant gaps. Choose Full Report for the diagram, itemised charges, evidence and sources. Full Report is selected by default.', [
        'The report uses applied usage. Annualised estimates use the same monthly quantities and rates for 12 months. The forecast varies price at the same usage.',
        'Chart shares use known costs. Check the unresolved charge count before treating a known-cost subtotal as complete. Full Report identifies rate sources and gives separate catalogue check and report generation dates.',
        'The diagram shows declared relationships. For large environments, the grouped view and registers trace the individual links.',
        'Accepted value assumptions appear separately from the financial estimate. A temporary adoption comparison appears in Full Report only after choosing Include comparison in Full Report.',
      ]),
      s('restore', 'Restore a saved environment', 'Choose Import existing on Home. Select a Studio JSON file. A valid import opens Review your estimate and uses the applied catalogue to recalculate costs. Compare the previous known subtotal and unresolved count to the current estimate.', [
        'If another environment has changes, choose Keep editing, Export JSON first or Replace environment.',
        'Use Advanced to inspect saved dependencies, agreements and specialised configuration.',
      ]),
    ] },
  { id: 'guided-and-advanced', topic: 'Building environments', title: 'Two ways to build an environment', intro: 'Use Guided for common decisions and Advanced for detailed configuration. Both edit the same estimate.',
    tool: builder, related: ['agents-and-models', 'share-and-connect'], sections: [
      s('guided', 'Work through the relevant steps', 'Move between Choose your AI platform, Build your AI solution, Estimate usage, Additional costs and Review your estimate. You can open any step and revisit it. Skip for now leaves the current inputs intact.'),
      s('advanced', 'Edit details in inventory', 'Choose Advanced for arbitrary object order, detailed relationships and specialist fields. Select an object, then use its Configuration, Usage, Dependencies or Costs controls. Existing hidden values survive a mode switch.'),
    ] },
  { id: 'agents-and-models', topic: 'Building environments', title: 'Add agents and model deployments', intro: 'Set up the agent’s model from its Guided task. Use the model version and the region where you plan to run it.',
    aliases: ['model selection', 'search models'], tool: builder, related: ['choose-platforms', 'model-evidence', 'share-and-connect'], sections: [
      s('choose-a-model', 'Choose a model configuration', 'In Build your AI solution, add a Foundry agent. Guided creates linked model and usage drafts. Search Model configuration by name. Check the version, deployment type, billing region and any displayed prices. Enter the actual deployment region separately.', [
        'Use More deployment options for a custom configuration or specialist model features.',
        'When the rate is missing or the planned combination is unverified, keep the draft and find the next action under Improve your estimate.',
      ]),
      s('reuse', 'Reuse an existing deployment', 'When adding a Foundry agent, choose Use an existing deployment if the same capacity serves both agents. Each agent gets its own usage profile. A shared deployment is counted once for fixed capacity. Change a shared deployment in Advanced after checking affected agents.'),
    ] },
  { id: 'foundry-usage', topic: 'Building environments', title: 'Estimate Foundry requests and tokens', intro: 'Start with how often the agent runs and the size of a model request. Use observed quantities or build a customer forecast from business assumptions.',
    aliases: ['tokens', 'monthly executions', 'retries'], tool: builder, related: ['billing-units', 'example-foundry-assistant', 'share-and-connect'], sections: [
      s('per-request', 'Enter monthly runs and per-request usage', 'In Estimate usage, enter runs per month, average model requests per run, input tokens per request and output tokens per request. Count prompt text and context in input. Preserve separate totals for input and output even when their rates look similar.'),
      s('assist-usage', 'Build and preview a monthly workload', [
        'In Estimate usage, open Help me estimate usage. Enter monthly active users, average interactions per active user, average requests per interaction and uncached input and output tokens per request. Choose measured usage, customer forecast or illustrative assumption.',
        'A fictional example of 200 users × 10 interactions yields 2,000 runs. At 2 calls per run, there are 4,000 calls. At 1,500 input and 300 output tokens per call this gives 6 million input and 1.2 million output tokens before retries.',
        'Estimate input from instructions, conversation history and retrieved context. Output is what the model generates. Tool use can trigger more requests. Retries multiply expected calls, and cached input is counted separately from uncached input.',
        'Preview the mapped fields and apply only after reviewing the changes, or cancel to keep your current inputs. Intermediate assumptions and their source label are temporary. Use the environment description to record them for export. PTU sizing uses separate capacity inputs.',
      ]),
      s('example', 'Check the quantities', 'Illustrative calculation: 1,000 runs × 1 request × 1,500 input tokens gives 1.5 million input tokens. At 300 output tokens per request, output is 300,000. The verified meter can bill per 1,000 or 1 million. Use More usage options for explicit cached input or retries, and count each request once.'),
    ] },
  { id: 'copilot-credits', topic: 'Building environments', title: 'Estimate Copilot Studio credits', intro: 'Enter monthly credits you have measured or planned using Microsoft’s applicable activity rules.',
    aliases: ['credits', 'credit pack', 'Copilot Credits'], tool: builder, related: ['choose-platforms', 'example-copilot-agent', 'licence-evidence'], sources: [creditSource], sections: [
      s('monthly-credits', 'Enter your monthly credits', 'Add a Copilot Studio agent and open Estimate usage. Enter the monthly total before applying a declared allowance or any linked pack in Studio. A fictional preset is available to explore the workflow.'),
      s('documented-credit-totals', 'Preview credits by activity', [
        'Open Help me estimate usage if you know the monthly credits for individual activities. Enter the applicable amounts, select their source and preview the gross total. Check the preview before replacing the current total or activity breakdown.',
        'If you have only activity counts, use Microsoft’s official source to establish the exact conversion for your activity and circumstances. The studio leaves this conversion unresolved. You can enter the resulting monthly credits directly.',
        'Gross usage is saved when you apply it. Keep supporting figures and the assumption source in the environment description if reviewers need them.',
      ]),
      s('allowances', 'Reconcile allowances and packs', 'In Advanced, choose a monthly total or an activity breakdown of already calculated credits. Apply an included allowance only after confirming the customer’s eligibility, amount, basis and expiry. Link an eligible prepaid pack once and inspect the residual pay-as-you-go credits in the ledger.'),
    ] },
  { id: 'licences-and-groups', topic: 'Building environments', title: 'Add licences and assign seats', intro: 'Record what you already own, what you need to buy and which people the seats cover.',
    aliases: ['already owned', 'license', 'licence', 'deduplicated'], tool: builder, related: ['licence-evidence', 'existing-and-new-spend', 'example-existing-licensing'], sections: [
      s('distinct-seats', 'Count each person once', 'In Additional costs, choose Add licence. Select the exact product and choose Already owned, New purchase or Unsure. Enter the number of users requiring a licence. Count each person once even when they belong to several groups. For an owned licence, enter the existing monthly amount from your agreement if available.'),
      s('groups', 'Review assignment and overlap', 'In Advanced, add user groups and link assignments to the applicable licence. Enter exact seats or document repeated assignments. A possible overlap is a review item. Record replacements and their effective dates only after confirming the original charge will stop.'),
    ] },
  { id: 'supporting-services', topic: 'Building environments', title: 'Estimate Azure supporting services', intro: 'Choose a service you expect to consume and enter quantities in its actual billing units.',
    tool: builder, related: ['billing-units', 'missing-rate-or-volume', 'pricing-sources'], sections: [
      s('scope-units', 'Match the meter and the unit', 'Choose Add supporting service, then choose the service and exact configuration for your billing region. Enter monthly base units. For Azure AI Search the quantity is search-unit-hours. For Blob operations the quantity is individual operations, even if the listed rate covers a block of operations.'),
      s('missing', 'Add a manual price when needed', 'If an offer is missing, use Advanced to identify the billable service and its quantity, then open its cost line. Enter an evidenced amount per billed unit. Separate resources or meter dimensions when they have distinct charges.'),
    ] },
  { id: 'share-and-connect', topic: 'Building environments', title: 'Reuse and connect resources', intro: 'Links show which agent, group or deployment uses an object and which workloads are billed.',
    tool: builder, related: ['agents-and-models', 'example-shared-deployment', 'architecture-and-controls'], sections: [
      s('share', 'Share a deployment or service', 'On the agent task choose Use an existing deployment, or open Dependencies in Advanced. Assign each agent a separate usage assumption. Fixed shared capacity is charged once and allocating it changes attribution only.'),
      s('unlink', 'Review before detaching', 'Check the affected objects before unlinking or deleting. The linked resources stay in the environment when a relationship is detached. If one agent invokes another, enter the downstream workload once in its own profile.'),
    ] },
  { id: 'read-your-estimate', topic: 'Understanding costs', title: 'How do I read my cost estimate?', intro: 'Start with the estimated monthly cost, annualised estimate and costs still to confirm. Open a charge for the details behind it.',
    tool: costs, related: ['estimate-readiness', 'billing-units', 'existing-and-new-spend', 'potential-business-value'], sections: [
      s('summary', 'Read the summary', 'The estimated monthly cost adds the charges the studio can calculate. The annualised estimate applies that monthly rate for twelve months at the same usage and pricing. Where your money goes summarises categories. Open Largest monthly charges to see the largest known contributions and their price basis. Check Costs still to confirm for unresolved charges and Existing licence spend for retained expenditure.'),
      s('usage-sensitivity', 'Preview a workload change', 'In Cost & Value Analysis, open Explore changes and choose Workload usage. Select a Foundry pay-as-you-go workload with its own profile or a Copilot agent using a monthly credit total. Change one assumption and compare monthly costs with the same rates and agreements. Resolve all charges before reading the whole-environment difference. This preview is temporary. Choose Prices in Explore changes for a hypothetical change at current usage. To edit your saved forecast, open Compare pricing assumptions in Costs.'),
      s('ledger', 'Reconcile one line', 'In Cost & Value Analysis, find a component and open it. Confirm monthly quantity, published billed unit, rate, source and any agreement. A flat charge is quantity divided by base units per billed unit, multiplied by the rate. Graduated tariffs apply the rate for each band.'),
    ] },
  { id: 'potential-business-value', topic: 'Understanding costs', title: 'Estimate adoption and potential business value',
    intro: 'Use your own assumptions to explore released time, economic equivalent and declared cashable savings.',
    aliases: ['productivity', 'value plan', 'adoption', 'cashable savings'], tool: costs, related: ['read-your-estimate', 'save-and-reopen', 'limits-of-an-estimate'], sections: [
      s('assumptions', 'Accept an optional value plan', 'Open Potential value from Cost & Value Analysis. Choose the intended audience, adoption, tasks and estimated minutes saved. Add a realisation factor if you can justify how much released time becomes usable. A blank input remains unknown. Cancel leaves the original estimate and any accepted plan intact.'),
      s('benefit-scopes', 'Understand the distinct outcomes', 'Gross capacity is the theoretical time released. Realised capacity uses your own realisation factor. Economic equivalent applies your hourly value to realised hours. Cashable savings require a separate reduction in actual expenditure. Record any extra implementation and operating costs outside the AI ledger and use each currency as labelled. These are planning assumptions.'),
      s('adoption-link', 'Link adoption to one workload', 'Choose Adoption and value in Explore changes. Start from the accepted adoption and enter alternative percentages. Without a usable workload relationship the cost effect is unknown. For Foundry PAYG, supply interactions per active user and use the existing model calls, tokens and retries. For Copilot Studio, enter your own assumption for monthly credits per active user and explain its basis. Microsoft activity conversion is outside this estimate. These changes are temporary.'),
    ] },
  { id: 'estimate-readiness', topic: 'Understanding costs', title: 'Resolve gaps before sharing', intro: 'Check which charges you can share and what you still need to confirm.',
    aliases: ['incomplete', 'unknown costs', 'estimate completeness'], tool: costs, related: ['missing-rate-or-volume', 'model-evidence', 'limits-of-an-estimate'], sections: [
      s('partial-estimates', 'Share a partial estimate with its scope', 'If a line has no usable quantity, rate or eligible configuration, the known-cost subtotal excludes it. The estimate shows how many cost lines remain unresolved. A partial PDF preserves the gaps for the reader.'),
      s('resolve', 'Open the input that needs attention', 'Choose Review next to the item under Improve your estimate. Complete the relevant field, adjust the configuration or review its pricing. Use Back to estimate checks to continue. Financial actions identify unresolved charges. Confirm technical and commercial conditions separately, including those that affect a priced path.'),
    ] },
  { id: 'existing-and-new-spend', topic: 'Understanding costs', title: 'How do I account for licences I already own?', intro: 'Distinguish the environment’s new charges from the licence spend you will retain.',
    aliases: ['existing licence', 'incremental', 'already owned'], tool: costs, related: ['licences-and-groups', 'licence-evidence', 'example-existing-licensing'], sections: [
      s('scopes', 'Compare spending scopes', 'In Cost & Value Analysis, Existing licence spend uses customer-entered amounts. New licence spend prices new seats after counting each user once. Proposed licence spend combines new and retained licence spend. The proposed environment adds the other known environment charges.'),
      s('replacement', 'Record a confirmed replacement', 'Model a replacement edge with the affected seats and the effective date when the contract changes. Check the existing spend first. A bundle overlap or unknown end date does not establish a saving.'),
    ] },
  { id: 'agreements-and-manual-rates', topic: 'Understanding costs', title: 'Use a contract or manual price', intro: 'Use verified retail automatically or record a price that applies to your own estimate.',
    aliases: ['contract', 'discount', 'manual rate'], tool: costs, related: ['forecast-scenarios', 'pricing-sources'], sections: [
      s('precedence', 'Set the price and its scope', 'Open a cost line and choose a Price agreement. A fixed agreement needs a positive amount per exact billed unit and a reason. A percentage discount needs a current verified retail amount. Intentional zero needs a reason for coverage. A matching object rule takes precedence over the environment rule.'),
      s('restore', 'Check or restore retail', 'Verify the currency, unit, date and affected pricing owner before saving. Use Restore Microsoft retail for this object to follow the current catalogue. A discount follows future retail changes, while a fixed amount remains independent unless you explicitly apply the forecast.'),
    ] },
  { id: 'forecast-scenarios', topic: 'Understanding costs', title: 'Compare a price forecast', intro: 'See how a possible price change would affect costs alongside your current estimate.',
    tool: costs, related: ['agreements-and-manual-rates', 'read-your-estimate'], sections: [
      s('configure', 'Set the global scenario', 'Open Compare pricing assumptions. Enter a percentage such as 20 for a 20% increase. The current estimate stays the same. Use a negative value to explore a decrease.'),
      s('exceptions', 'Override an individual scenario', 'Open an applicable cost line and its advanced timing and forecast fields. A specific exception replaces the global percentage for that scope. Opt in explicitly before applying the forecast to fixed agreements.'),
    ] },
  { id: 'example-foundry-assistant', topic: 'Worked examples', title: 'Walk through the Basic Foundry Assistant',
    intro: 'Reconcile the simplest linked Foundry agent from its workload to two token charges.',
    tool: { page: 'examples', item: 'foundry-assistant', label: 'Preview Basic Foundry Assistant' }, related: ['foundry-usage', 'billing-units'], sections: [
      s('open', 'Open and inspect the example', 'The example uses a fictional 1,000 runs/month, one request/run, and 1,500 input and 300 output tokens/request. It links one agent, one usage profile and one GPT-4.1 mini deployment.'),
      s('reconcile', 'Change usage and compare amounts', 'Open an editable copy and choose Estimate usage. Enter 2,000 executions directly or preview a fictional 200 users × 10 interactions at one request per run in Help me estimate usage. In Cost & Value Analysis check both monthly token quantities doubled, from 1.5 to 3 million input and from 300,000 to 600,000 output. Multiply each verified rate by its exact unit conversion and round at the line boundary. If the matching rate is absent, the charge remains unresolved.'),
      s('compare-without-editing', 'Try a temporary usage comparison', 'Start from the original 1,000-run copy. In Cost & Value Analysis, choose Explore changes and preview 2,000 monthly executions for the assistant. Compare the new token quantities and monthly costs. Return to Costs to see the accepted 1,000-run estimate.'),
    ] },
  { id: 'example-copilot-agent', topic: 'Worked examples', title: 'Walk through the Copilot Studio Business Agent',
    intro: 'Estimate a platform-managed Copilot agent from declared monthly credits.',
    tool: { page: 'examples', item: 'copilot-agent', label: 'Preview Copilot Studio Business Agent' }, related: ['copilot-credits', 'licence-evidence'], sections: [
      s('open', 'Inspect the credit basis', 'Open an editable copy. The fictional starting value is 12,000 credits/month. Cost & Value Analysis uses the verified matching PAYG rate where present. The example has one platform-managed agent.'),
      s('reconcile', 'Try a different workload', 'Change monthly credits to 15,000 under Estimate usage. You can enter the total or preview and apply a hypothetical breakdown of 10,000 credits for answers and 5,000 for actions. The known charge is 15,000 times the applicable per-credit rate when available. Review a separate allowance only if it applies to your customer plan.'),
      s('adoption', 'Explore adoption using your own credit assumption', 'Start from a fresh copy. In Potential value, accept fictional assumptions of 100 target users and 50% adoption. In Explore changes, enter 25% and 75% and link the business agent using 240 monthly Copilot Credits per active user. Record that this is a fictional customer forecast. The comparison uses 6,000, 12,000 and 18,000 monthly credits. Microsoft evidence defines applicable billing and allowances separately.'),
    ] },
  { id: 'example-existing-licensing', topic: 'Worked examples', title: 'Walk through the Enterprise AI Environment',
    intro: 'Compare two groups’ licence assignments, new spend and a supporting Azure service.',
    tool: { page: 'examples', item: 'enterprise-ai', label: 'Preview Enterprise AI Environment' }, related: ['existing-and-new-spend', 'agreements-and-manual-rates'], sections: [
      s('open', 'Inspect fictional purchases and existing spend', 'The fictional example uses 200 existing E3 seats for two groups, 40 new Copilot add-on seats, 18,000 monthly credits and 240 search-unit-hours. It declares £4,000 of existing monthly spend and a hypothetical 10% Search discount.'),
      s('reconcile', 'Compare the two scopes', 'Open Cost & Value Analysis and compare the new seat amount, credit amount and Search agreement amount with the proposed environment including retained E3 spend. Open the Search line to see its retail amount multiplied by 0.90 before line rounding. Review the prerequisite and then change an assignment in Advanced.'),
      s('review', 'Review the plan and its evidence', 'In Environment Review, open Architecture to trace group assignments and the Search resource. Open Technical fit to inspect licensing and technical evidence for this scope. Controls shows which safeguards still need assessment. Customer declarations describe plans or reported implementation. Confirm both assignments and controls in the tenant.'),
    ] },
  { id: 'example-shared-deployment', topic: 'Worked examples', title: 'Walk through the Shared Model Deployment',
    intro: 'Verify shared fixed capacity and its reporting allocation.',
    tool: { page: 'examples', item: 'shared-deployment', label: 'Preview Shared Model Deployment' }, related: ['share-and-connect', 'ptu-and-reservations'], sections: [
      s('open', 'Find the shared bill', 'Two fictional Foundry workloads share one deployment. 15 PTUs × 400 hours gives 6,000 PTU-hours. The 6,000 and 2,000 runs have equal input tokens per request, so the figure is apportioned 75/25.'),
      s('reconcile', 'Change allocation without changing the charge', 'In Environment Review, open Architecture and use the register to trace both agents to the same deployment. In Cost & Value Analysis, open the single Shared provisioned capacity line. Change one agent’s executions in Advanced. The allocation shares change while capacity stays at 6,000 PTU-hours billed once. Check actual capacity and quota separately.'),
    ] },
  { id: 'example-ai-adoption-business-case', topic: 'Worked examples', title: 'Walk through AI Adoption & Business Case',
    intro: 'Follow a fictional Foundry assistant from workload and AI spend through adoption, productivity assumptions and stakeholder reporting.',
    tool: { page: 'examples', item: 'ai-adoption-business-case', label: 'Preview AI Adoption & Business Case' },
    related: ['potential-business-value', 'read-your-estimate', 'architecture-and-controls', 'save-and-reopen'], sections: [
      s('open', 'Open the example and check its accepted assumptions', 'The example contains one Foundry assistant, a GPT-4.1 mini deployment, a dedicated usage profile and a planned identity control.', [
        'Open the preview and choose Open editable copy.',
        'Open Cost & Value Analysis. Check that 1,000 executions at one request each produce 1.5 million input and 300,000 output tokens per month. Inspect the exact billed units and applied sources. Leave any unresolved charges visible.',
        'Choose Potential value. The accepted fictional plan has 200 target users, 50% adoption, 20 monthly tasks per active user, 12 minutes saved per task, 60% realisation and an assumed £25 per productive hour. The result is 100 active users, 400 gross hours, 240 realised hours and £6,000 monthly economic equivalent. Cashable savings, implementation and additional operating costs are undeclared.',
      ]),
      s('compare', 'Connect adoption to a workload', 'Keep the accepted 50% plan and the 1,000-execution workload as your baseline.', [
        'In Explore changes, compare 25%, 50% and 75% adoption without a workload link. Potential value changes and projected AI expenditure stays unknown.',
        'Open Link adoption to workload usage. Select the internal support assistant, enter ten monthly interactions per active user and compare again.',
        'Check for 500, 1,000 and 1,500 executions and £3,000, £6,000 and £9,000 monthly economic equivalents. Read projected AI expenditure and any unresolved charges separately. The economic equivalents describe assumed productivity capacity. Cashable savings remain unknown.',
      ]),
      s('share', 'Check the evidence and share the plan', 'Use the accepted estimate and assumptions for both PDF formats.', [
        'Open Environment Review. Trace the linked model and dedicated profile in Architecture, check the evidence scope in Technical fit, then inspect the fictional planned identity control in Controls. Its status is a declaration.',
        'In Reports & Export, generate an Executive Summary. Check the accepted expenditure and value amounts in their separate sections.',
        'Generate a Full Report and check the pricing sources and value assumption provenance. To include the hypothetical adoption table, return to Explore changes, recreate the comparison as needed and choose Include comparison in Full Report. Generate the Full Report again.',
        'Export JSON and re-import it. The accepted 50% plan and workload round-trip, with fictional source labels. Temporary comparisons stay in the current session.',
      ]),
    ] },
  { id: 'pricing-sources', topic: 'Pricing and evidence methodology', title: 'Where prices come from', intro: 'Studio applies public rates for exact matches. The ledger records quantity, unit, effective date and source.',
    tool: catalogue, reference: 'pricing', related: ['coverage-and-freshness', 'billing-units', 'agreements-and-manual-rates'], sources: [retailSource], sections: [
      s('azure', 'Review an Azure rate', 'Open the cost line or the Pricing Catalogue. Match service, SKU, region, currency and billed unit. The API check date is separate from the provider effective date.'),
      s('commercial', 'Review a UK commercial rate', 'Check the precise UK offer, seat unit, commitment term, VAT treatment and reviewed date. Existing agreement rates and hypothetical discounts are labelled customer inputs.'),
    ] },
  { id: 'coverage-and-freshness', topic: 'Pricing and evidence methodology', title: 'Coverage and catalogue health', intro: 'Check which offerings have verified prices in Pricing Catalogue. Use Improve your estimate to review the costs and evidence for your open environment.',
    aliases: ['maintenance', 'last checked', 'stale'], tool: catalogue, reference: 'coverage', related: ['pricing-sources', 'deployment-availability'], sections: [
      s('freshness', 'Check freshness', 'Open Pricing Catalogue and check the successful Azure refresh and the evidence review dates. If the current snapshot cannot be validated, the application can use a previous verified snapshot and reports the fallback.'),
      s('maintenance', 'How the catalogue is maintained', 'GitHub Actions refreshes Azure rates and reconciles exact Microsoft source evidence. Validation and browser checks gate publication on the existing static Worker. Unresolved changes appear in Catalogue Health. An environment keeps its applied snapshot until you adopt an update.'),
    ] },
  { id: 'licence-evidence', topic: 'Pricing and evidence methodology', title: 'Understand licensing evidence', intro: 'A verified UK rate, product eligibility and actual customer assignment are separate decisions.',
    aliases: ['license', 'entitlement', 'prerequisite'], tool: builder, related: ['licences-and-groups', 'existing-and-new-spend'], sources: [licensingSource], sections: [
      s('prerequisites', 'Check the prerequisite', 'Open the affected item under Improve your estimate and review the exact finding. Confirm required base subscriptions and document that the same groups hold the necessary licences. Check agreement terms for the exact offer.'),
      s('scope', 'Confirm included rights', 'An included feature establishes only the documented scope. Verify workloads, assignments and credit allowances separately. An expired or conditional rule remains evidence to check.'),
    ] },
  { id: 'model-evidence', topic: 'Pricing and evidence methodology', title: 'Understand model and deployment evidence', intro: 'Model capabilities, geographic availability and price have separate evidence.',
    tool: builder, related: ['agents-and-models', 'deployment-availability', 'ptu-and-reservations'], sources: [regionSource], sections: [
      s('billing-and-deployment', 'Enter billing and deployment locations separately', 'Billing region selects the price. Actual deployment region is where the model runs. Enter the known actual region in the deployment editor to check availability for the exact mode and model version.'),
      s('deployment-types', 'Review the deployment type', 'Standard modes can have different geographic and commercial scopes. Provisioned modes add capacity requirements. Choose the type matching the actual plan. Open the compatibility result to see whether the combination is verified, conditional, incompatible or unverified.'),
    ] },
  { id: 'billing-units', topic: 'Technical reference', title: 'Billing units and quantities', intro: 'Convert the declared monthly quantity with the exact unit supplied by the selected meter.',
    aliases: ['unit', 'hour', 'token', 'seat/month'], tool: costs, reference: 'units', related: ['read-your-estimate', 'supporting-services'], sections: [
      s('base-and-billed-units', 'Convert base units once', 'For 300,000 output tokens at a rate per 1,000 tokens, multiply the published rate by 300. A Copilot Credit or seat/month rate uses one credit or seat as its base. A PTU-hour is one PTU for one hour.'),
      s('tiers', 'Read usage bands', 'If the meter has graduated bands, the ledger applies each band to the portion of measured usage that reaches it. Combine usage that shares the same tariff scope before counting a free band.'),
    ] },
  { id: 'deployment-availability', topic: 'Technical reference', title: 'Supported models and regions', intro: 'Use the current data below to find reviewed identities, pricing availability and exact regional evidence.',
    aliases: ['supported models', 'sku', 'availability matrix'], tool: catalogue, reference: 'models', related: ['model-evidence', 'coverage-and-freshness'], sources: [regionSource], sections: [
      s('lookup', 'Look up the expected combination', 'Match the model, version and mode first. Check the exact pricing region or commercial market and the actual deployment region independently.'),
      s('limits', 'Check limits and retirement', 'Listed regional availability leaves customer quota and actual deployment capacity to verify. See the model’s lifecycle and integration evidence in the workspace before relying on the estimate.'),
    ] },
  { id: 'ptu-and-reservations', topic: 'Technical reference', title: 'Size and price provisioned capacity', intro: 'Model fixed capacity and its billable hours separately from the agent’s token traffic.',
    aliases: ['PTU', 'provisioned throughput units', 'reservation'], tool: builder, related: ['example-shared-deployment', 'model-evidence', 'billing-units'], sources: [sizingSource], sections: [
      s('capacity-and-hours', 'Set capacity and hours', 'Select the exact provisioned model/version and deployment region. Enter capacity in PTUs and billable hours/month. Check the verified minimum and increments for that combination. Multiply the two fields by the applicable PTU-hour rate.'),
      s('options', 'Review reservations and PAYG comparison', 'In the deployment’s Advanced Usage, enter a documented customer reservation only if its scope and allocation apply. Compare the declared workload with a verified PAYG alternative when available. This comparison estimates costs. Customer throughput, quota and performance still need confirmation.'),
    ] },
  { id: 'architecture-and-controls', topic: 'Technical reference', title: 'Review the environment design and controls', intro: 'Explain the cost relationships, intended controls and outstanding decisions in your plan.',
    tool: { page: 'review', label: 'Open Environment Review' }, related: ['share-and-connect', 'limits-of-an-estimate'], sections: [
      s('architecture', 'Inspect relationships', 'Open Environment Review from the sidebar or choose Review your design from the workspace. Open Architecture. Use the diagram or its text register to select an object. Shared links explain cost attribution and the diagram can be exported as SVG.'),
      s('technical-fit', 'Check technical fit and licensing', 'Open Technical fit to see which combinations were checked, the current evidence, and what to confirm. Open Review input to reach the existing editor. Return to Environment Review after inspecting the field.'),
      s('governance', 'Review declared controls', 'Open Controls in Environment Review. A declaration records a planned or existing safeguard. It still needs confirmation in the actual environment. Use the existing Advanced editor for relevant declarations. The report retains the scope and guidance.'),
    ] },
  { id: 'environment-file', topic: 'Technical reference', title: 'Environment file reference', intro: 'An editable Studio export is versioned JSON with object and relationship identities.',
    related: ['save-and-reopen', 'import-or-export-problems', 'privacy'], sections: [
      s('format', 'What the JSON includes', 'Version 1.0.0 carries your workspace name, region, currency, objects, relationships, price overrides, forecast, optional accepted value assumptions and optional historical snapshot. An environment holds up to 300 objects.'),
      s('compatibility', 'Keep identities intact', 'Use Studio to edit and export when possible. Import rejects unknown schema fields, broken links, oversized files and invalid pricing rules. A valid import recomputes against the applied catalogue and preserves supported saved settings.'),
    ] },
  { id: 'missing-rate-or-volume', topic: 'Troubleshooting', title: 'Why are some costs missing?', intro: 'Find out whether usage, pricing or configuration needs attention.',
    aliases: ['unknown rate', 'missing prices', 'unsupported'], tool: costs, related: ['estimate-readiness', 'agreements-and-manual-rates', 'model-evidence'], sections: [
      s('volume', 'Find the missing input', 'Open Improve your estimate in Cost & Value Analysis. If the line has no quantity, enter the agent workload or monthly service units. Use Help me estimate usage for a business-based Foundry preview or to sum documented Copilot Credits. Keep unsupported activity conversions unresolved. Check the billing region, currency, deployment mode and exact SKU when a combination is unresolved.'),
      s('rate', 'Find the missing rate', 'Open the cost line and check its billing unit. If the charge has billing details but no verified retail price, you can enter a documented fixed rate. Leave it unresolved if you cannot confirm a price.'),
    ] },
  { id: 'import-or-export-problems', topic: 'Troubleshooting', title: 'Problems with files and downloads', intro: 'Recover from an unreadable file or a browser download failure.',
    tool: home, related: ['save-and-reopen', 'environment-file'], sections: [
      s('import', 'Recover from invalid JSON', 'Choose an AI Economics Studio JSON export of 2 MB or less. A PDF cannot restore editable work. Look at the validation message for an unsupported version, missing references or invalid price settings. Choose the corrected file again. Your open workspace stays intact.'),
      s('download', 'Find or retry a download', 'Check the download list and permissions in your browser. If PDF generation fails, keep the workspace open and retry from Reports & Export. Export JSON to preserve the editable environment.'),
    ] },
  { id: 'unexpected-total', topic: 'Troubleshooting', title: 'My estimate changed', intro: 'Compare the two snapshots and scopes before changing assumptions.',
    tool: costs, related: ['save-and-reopen', 'existing-and-new-spend', 'forecast-scenarios'], sections: [
      s('scope', 'Check scope and terms', 'Compare current and prior monthly known amounts and unresolved counts. Existing spend is separate from new purchases. Check effective dates for agreements and any changed catalogue timestamp.'),
      s('inventory', 'Check for repeated inputs', 'Follow the affected cost line to its workload or configuration. Review shared capacity, repeated seat assignments, prepaid credits and separately linked usage. If a new estimate is a forecast, compare it with the current basis for the same scope.'),
    ] },
  { id: 'privacy', topic: 'Privacy and limitations', title: 'What stays in your browser', intro: 'No account required. Your environment stays in this browser tab until you leave or reload.',
    related: ['save-and-reopen', 'environment-file', 'limits-of-an-estimate'], sections: [
      s('storage', 'Keep a local copy', 'Choose Export JSON to keep a copy on your device. To continue later, use Import existing on Home and select your file.'),
      s('sharing', 'Share files deliberately', 'Your browser loads public application, pricing and evidence assets. The environment calculation and PDF generation run locally. Downloaded JSON and PDF can include your names and assumptions. Remove confidential material before sharing them.'),
    ] },
  { id: 'limits-of-an-estimate', topic: 'Privacy and limitations', title: 'What the estimate covers', intro: 'AI Economics Studio is an independent planning tool. An estimate describes the entered scope and dated assumptions.',
    related: ['read-your-estimate', 'estimate-readiness', 'architecture-and-controls'], sections: [
      s('commercial', 'Check commercial limits', 'The estimate uses the selected currency and verified or customer-supplied rates. It does not determine tax, contractual FX, year-one cashflow or variable future demand. A known subtotal excludes unresolved charges.'),
      s('technical', 'Confirm customer conditions', 'Verify actual tenant eligibility, region, quota, performance and available capacity before purchasing or deploying. The diagram describes planned relationships and advisory controls.'),
    ] },
  { id: 'glossary', topic: 'Glossary and FAQs', title: 'Glossary of Azure and Microsoft cost terms', intro: 'Use these definitions while entering assumptions or reviewing a report.',
    aliases: ['SKU', 'PTU', 'credits', 'meter', 'token', 'run-rate'], related: ['billing-units', 'model-evidence', 'licences-and-groups'], sections: [
      s('token', 'Token and cached input', 'A token is a model’s unit of text or other supported input/output. Put previously cached input into its own field only when the exact model and tariff apply.'),
      s('sku', 'SKU, meter and market', 'A SKU identifies an exact product configuration. A meter describes a billable dimension and unit. A commercial market, such as the UK, is distinct from an Azure deployment region.'),
      s('ptu', 'PTU and PTU-hour', 'A Provisioned Throughput Unit is a unit of reserved model capacity. A PTU-hour is one unit used for one billable hour. Verify the minimum per deployment type and model.'),
      s('credit', 'Copilot Credit and licence entitlement', 'A Copilot Credit is the consumption unit used by applicable Copilot Studio plans. A licence entitlement describes a right to use a scoped product or feature subject to terms and assignment.'),
      s('run-rate', 'Annualised estimate and unresolved charges', 'The annualised estimate is twelve times the current known monthly amount. Use Improve your estimate to see quantities, prices and evidence that still need confirming.'),
    ] },
  { id: 'faq', topic: 'Glossary and FAQs', title: 'Frequently asked questions', intro: 'Short answers to common planning questions.',
    related: ['save-and-reopen', 'missing-rate-or-volume', 'share-and-connect'], sections: [
      s('keep-work', 'How do I keep my work?', 'Export JSON from Reports & Export and import that file when you return. Use a PDF for review and sharing.'),
      s('unknown', 'Why is an amount unknown?', 'A quantity, rate or applicable configuration may be missing. Use Improve your estimate in Cost & Value Analysis to see what to check next. Prices can also expire or change when a catalogue is adopted.'),
      s('shared', 'Is shared capacity charged for every agent?', 'Fixed capacity is charged once per model deployment. Each agent can still have its own workload. Allocation redistributes the original charge for reporting.'),
    ] },
];
