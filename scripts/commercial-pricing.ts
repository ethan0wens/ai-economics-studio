import type { RetailRecord } from '../src/catalogue';
import review from '../catalogue/commercial.json' with { type: 'json' };

// Renew source-linked UK observations in catalogue/commercial.json after reviewing the public offers.
export const curatedPrices = review as RetailRecord[];
