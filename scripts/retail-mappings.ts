import { offeringMeter, offerings, type Component } from '../src/offerings';

export type Mapping = {
  name: string; service: string; region: string; currency: string; product: string;
  sku: string; armSku: string; meter: string; unit: string; quantityPerUnit: number; meterId?: string;
  offeringId?: string; component?: Component; ledgerSku?: string; tierStarts?: readonly number[];
};

function azure(offeringId: string, component: Component, service: string, product: string, sku: string, armSku: string, meter: string): Mapping {
  const offering = offerings.find(candidate => candidate.id === offeringId);
  const spec = offering && offeringMeter(offering, component);
  if (!offering || !spec) throw new Error(`Unbound Azure selector: ${offeringId}/${component}`);
  return {
    name: `${offeringId}/${component}`, service, region: offering.region, currency: offering.currency,
    product, sku, armSku, meter, unit: spec.unit, quantityPerUnit: spec.quantityPerUnit,
    meterId: spec.meterId, offeringId, component, ledgerSku: spec.sku,
  };
}

const foundry = (offering: string, component: Component, sku: string) =>
  azure(offering, component, 'Foundry Models', 'Azure OpenAI', sku, sku, `${sku} Tokens`);
const search = (offering: string, sku: string) =>
  azure(offering, 'usage', 'Azure Cognitive Search', 'Azure AI Search', sku, '', `${sku} Unit`);

export const mappings: readonly Mapping[] = [
  azure('d2s-v3-uk-south', 'usage', 'Virtual Machines', 'Virtual Machines DSv3 Series', 'D2s v3', 'Standard_D2s_v3', 'D2s v3'),
  foundry('gpt-4o-mini-global-uksouth', 'input', 'gpt-4o-mini-0718-Inp-glbl'),
  foundry('gpt-4o-mini-global-uksouth', 'output', 'gpt-4o-mini-0718-Outp-glbl'),
  foundry('gpt-4-1-mini-global-uksouth', 'input', 'gpt 4.1 mini Inp glbl'),
  foundry('gpt-4-1-mini-global-uksouth', 'output', 'gpt 4.1 mini Outp glbl'),
  search('search-basic-uksouth', 'Basic'),
  search('search-s1-uksouth', 'Standard S1'),
  azure('copilot-payg-uksouth', 'credits', 'Microsoft Copilot Studio', 'Microsoft Copilot Studio', 'Pay As You Go', 'Microsoft_Copilot_Studio_Pay_As_You_Go', 'Pay As You Go Copilot Credit'),
  azure('openai-global-ptu-uksouth', 'capacity', 'Foundry Models', 'Azure OpenAI', 'Provisioned Managed Global', 'OpenAI_Provisioned_Managed_Global', 'Provisioned Managed Global Unit'),
  azure('sentinel-payg-analysis-uksouth', 'usage', 'Sentinel', 'Sentinel', 'Pay-as-you-go', 'Pay-as-you-go', 'Pay-as-you-go Analysis'),
  { ...azure('blob-hot-lrs-capacity-uksouth', 'usage', 'Storage', 'General Block Blob v2', 'Hot LRS', '', 'Hot LRS Data Stored'), tierStarts: [0, 51200, 512000] },
  azure('blob-hot-lrs-write-uksouth', 'usage', 'Storage', 'General Block Blob v2', 'Hot LRS', '', 'Hot LRS Write Operations'),
  azure('sql-s0-uksouth', 'usage', 'SQL Database', 'SQL Database Single Standard', 'S0', '', 'S0 DTUs'),
  { ...azure('bandwidth-internet-out-uksouth', 'usage', 'Bandwidth', 'Bandwidth - Routing Preference: Internet', 'Standard', '', 'Standard Data Transfer Out'), tierStarts: [0, 100, 10100, 50100, 150100] },
];
