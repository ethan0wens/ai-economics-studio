import type { Component } from '../src/offerings';
import pinned from '../catalogue/pinned.json';

export type Mapping = {
  name: string; service: string; region: string; currency: string; product: string;
  sku: string; armSku: string; meter: string; unit: string; quantityPerUnit: number; meterId?: string;
  offeringId?: string; component?: Component; ledgerSku?: string; tierStarts?: readonly number[];
};

export const mappings = pinned as readonly Mapping[];
