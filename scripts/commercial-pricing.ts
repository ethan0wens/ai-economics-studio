import type { RetailRecord } from '../src/catalogue';
import review from '../catalogue/commercial.json';

// Renew source-linked UK observations in catalogue/commercial.json after reviewing the public offers.
export const curatedPrices = review as RetailRecord[];
