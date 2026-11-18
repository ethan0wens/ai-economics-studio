export type Mapping = {
  name: string;
  service: string;
  region: string;
  currency: string;
  product: string;
  sku: string;
  armSku: string;
  meter: string;
  unit: string;
  quantityPerUnit: number;
  meterId?: string;
};

// One narrow infrastructure selector. A live exact match is required before publication.
export const mappings: readonly Mapping[] = [{
  name: 'azure-vm-d2s-v3-linux-uksouth-hour',
  service: 'Virtual Machines',
  region: 'uksouth',
  currency: 'GBP',
  product: 'Virtual Machines Dsv3 Series',
  sku: 'D2s v3',
  armSku: 'Standard_D2s_v3',
  meter: 'D2s v3',
  unit: '1 Hour',
  quantityPerUnit: 1,
}];
